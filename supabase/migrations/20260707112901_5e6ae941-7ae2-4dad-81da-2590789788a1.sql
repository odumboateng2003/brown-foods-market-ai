-- AI Conversations
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_active_idx on public.ai_conversations(user_id, last_active_at desc);
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant all on public.ai_conversations to service_role;
alter table public.ai_conversations enable row level security;
create policy "own convos select" on public.ai_conversations for select to authenticated using (auth.uid() = user_id);
create policy "own convos insert" on public.ai_conversations for insert to authenticated with check (auth.uid() = user_id);
create policy "own convos update" on public.ai_conversations for update to authenticated using (auth.uid() = user_id);
create policy "own convos delete" on public.ai_conversations for delete to authenticated using (auth.uid() = user_id);

-- AI Messages
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null default '[]'::jsonb,
  text_content text,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_convo_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_messages_user_idx on public.ai_messages(user_id, created_at desc);
grant select, insert, delete on public.ai_messages to authenticated;
grant all on public.ai_messages to service_role;
alter table public.ai_messages enable row level security;
create policy "own msgs select" on public.ai_messages for select to authenticated using (auth.uid() = user_id);
create policy "own msgs insert" on public.ai_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "own msgs delete" on public.ai_messages for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_ai_convo_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.ai_conversations set last_active_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;
drop trigger if exists trg_ai_msg_bump on public.ai_messages;
create trigger trg_ai_msg_bump after insert on public.ai_messages for each row execute function public.bump_ai_convo_activity();

-- AI Settings
create table if not exists public.ai_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  retention_days integer not null default 7 check (retention_days between 1 and 365),
  personality text not null default 'You are Akosua, the friendly Ghanaian AI shopping assistant for Brown''s Local Food Market. Tone: warm, helpful, concise. Simple English with sparing Akwaaba / Medaase.',
  greeting text not null default 'Hello, I''m Akosua, your Brown''s Local Food Market assistant. Ask me what to cook tonight, find ingredients, or check your order.',
  business_hours text not null default 'Monday – Saturday, 8:00 – 18:00 GMT',
  fallback_response text not null default 'I''m not sure about that yet — let me connect you with our team on WhatsApp for a quick answer.',
  suggested_prompts jsonb not null default '["What''s good for jollof tonight?","Show me palm oil options","How long does delivery take?","What''s my order status?"]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.ai_settings (id) values (1) on conflict (id) do nothing;
grant select on public.ai_settings to anon, authenticated;
grant all on public.ai_settings to service_role;
alter table public.ai_settings enable row level security;
create policy "ai settings public read" on public.ai_settings for select using (true);

create or replace function public.update_ai_settings(_patch jsonb)
returns public.ai_settings language plpgsql security definer set search_path = public as $$
declare updated public.ai_settings;
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Forbidden: super admin only';
  end if;
  update public.ai_settings set
    enabled = coalesce((_patch->>'enabled')::boolean, enabled),
    retention_days = coalesce((_patch->>'retention_days')::int, retention_days),
    personality = coalesce(_patch->>'personality', personality),
    greeting = coalesce(_patch->>'greeting', greeting),
    business_hours = coalesce(_patch->>'business_hours', business_hours),
    fallback_response = coalesce(_patch->>'fallback_response', fallback_response),
    suggested_prompts = coalesce(_patch->'suggested_prompts', suggested_prompts),
    updated_at = now()
  where id = 1 returning * into updated;
  return updated;
end; $$;
grant execute on function public.update_ai_settings(jsonb) to authenticated;

-- Analytics
create or replace function public.ai_usage_stats()
returns table(total_conversations bigint, total_users bigint, msgs_today bigint, msgs_7d bigint, msgs_30d bigint)
language sql security definer set search_path = public as $$
  select
    (select count(*) from public.ai_conversations),
    (select count(distinct user_id) from public.ai_conversations),
    (select count(*) from public.ai_messages where role = 'user' and created_at > now() - interval '1 day'),
    (select count(*) from public.ai_messages where role = 'user' and created_at > now() - interval '7 days'),
    (select count(*) from public.ai_messages where role = 'user' and created_at > now() - interval '30 days');
$$;
grant execute on function public.ai_usage_stats() to authenticated;

create or replace function public.ai_top_questions(_limit int default 20)
returns table(question text, count bigint) language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Forbidden';
  end if;
  return query
    select lower(trim(text_content)) as question, count(*)::bigint
    from public.ai_messages
    where role = 'user' and text_content is not null and length(text_content) between 3 and 160
    group by 1 order by 2 desc limit _limit;
end; $$;
grant execute on function public.ai_top_questions(int) to authenticated;

create or replace function public.cleanup_old_ai_conversations()
returns integer language plpgsql security definer set search_path = public as $$
declare days integer; deleted integer;
begin
  select retention_days into days from public.ai_settings where id = 1;
  delete from public.ai_conversations where last_active_at < now() - make_interval(days => coalesce(days, 7));
  get diagnostics deleted = row_count;
  return deleted;
end; $$;
grant execute on function public.cleanup_old_ai_conversations() to authenticated;

-- Seed home_features CMS slot
insert into public.site_content (key, draft_content, published_content, published_at)
values (
  'home_features',
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('icon','truck','title','Same-day delivery in Koforidua','description','Fast delivery throughout Koforidua and surrounding communities.','visible',true,'sort_order',0),
    jsonb_build_object('icon','shield','title','Trusted local farmers','description','We partner directly with vetted Ghanaian farmers and producers.','visible',true,'sort_order',1),
    jsonb_build_object('icon','sparkles','title','Always fresh, always real','description','Quality-checked every day. What you see is what arrives.','visible',true,'sort_order',2)
  )),
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('icon','truck','title','Same-day delivery in Koforidua','description','Fast delivery throughout Koforidua and surrounding communities.','visible',true,'sort_order',0),
    jsonb_build_object('icon','shield','title','Trusted local farmers','description','We partner directly with vetted Ghanaian farmers and producers.','visible',true,'sort_order',1),
    jsonb_build_object('icon','sparkles','title','Always fresh, always real','description','Quality-checked every day. What you see is what arrives.','visible',true,'sort_order',2)
  )),
  now()
) on conflict (key) do nothing;