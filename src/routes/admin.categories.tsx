import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name,
      slug: slugify(name),
      icon: String(fd.get("icon") || "🛒"),
      sort_order: Number(fd.get("sort_order") || 0),
    });
    if (error) return toast.error(error.message);
    toast.success("Category added");
    e.currentTarget.reset();
    qc.invalidateQueries({ queryKey: ["admin-categories-list"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-categories-list"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Organize your catalog.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Input name="name" placeholder="Name" required className="w-48" />
        <Input name="icon" placeholder="Icon (emoji)" className="w-32" />
        <Input name="sort_order" type="number" placeholder="Order" className="w-24" />
        <Button type="submit" variant="spice"><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th>Slug</th><th>Order</th><th className="text-right pr-4">Actions</th></tr>
          </thead>
          <tbody>
            {cats?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2"><span className="mr-2">{c.icon}</span>{c.name}</td>
                <td className="text-muted-foreground">{c.slug}</td>
                <td>{c.sort_order}</td>
                <td className="pr-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
