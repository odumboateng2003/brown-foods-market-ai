import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Plus, Trash2, Pencil, Upload, Save, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
  sort_order: number;
};

async function uploadCategoryImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl;
}

function AdminCategories() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data as Category[] ?? [],
  });

  const [editing, setEditing] = useState<Category | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories-list"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name")).trim();
    if (!name) return;
    const { error } = await supabase.from("categories").insert({
      name,
      slug: slugify(name),
      icon: null,
      description: String(fd.get("description") || "") || null,
      sort_order: Number(fd.get("sort_order") || 0),
    });
    if (error) return toast.error(error.message);
    toast.success("Category added");
    e.currentTarget.reset();
    invalidateAll();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("categories").update({
      name: editing.name,
      slug: slugify(editing.name),
      icon: editing.icon,
      image_url: editing.image_url,
      description: editing.description,
      sort_order: editing.sort_order,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Category updated");
    setEditing(null);
    invalidateAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? Products in it will be uncategorized.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidateAll();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file);
      setEditing({ ...editing, image_url: url });
      toast.success("Image uploaded — click Save to keep");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Create, edit and delete product categories. Upload real category images.</p>
      </div>

      <form onSubmit={onCreate} className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card md:grid-cols-6">
        <Input name="name" placeholder="Name" required className="md:col-span-2" />
        <Input name="sort_order" type="number" placeholder="Order" className="md:col-span-1" />
        <Input name="description" placeholder="Short description" className="md:col-span-3" />
        <Button type="submit" variant="spice" className="md:col-span-6 md:w-fit">
          <Plus className="mr-1 h-4 w-4" /> Add category
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats?.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-muted-foreground">
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">/{c.slug} • order {c.sort_order}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Edit category</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl bg-secondary text-3xl">
                  {editing.image_url ? (
                    <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                    {editing.image_url ? "Replace image" : "Upload image"}
                  </Button>
                  {editing.image_url && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...editing, image_url: null })}>
                      Remove image
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Name</label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Description</label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Sort order</label>
                <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button variant="spice" onClick={saveEdit}><Save className="mr-1 h-4 w-4" /> Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
