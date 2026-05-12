import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_ghs: number;
  unit: string;
  image_url: string | null;
  stock: number;
  is_featured: boolean;
  category_id: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      slug: String(fd.get("slug") || slugify(String(fd.get("name")))),
      description: String(fd.get("description") || "") || null,
      price_ghs: Number(fd.get("price_ghs")),
      unit: String(fd.get("unit") || "kg"),
      stock: Number(fd.get("stock") || 0),
      image_url: String(fd.get("image_url") || "") || null,
      is_featured: fd.get("is_featured") === "on",
      category_id: String(fd.get("category_id") || "") || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Product updated" : "Product created");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const updateStock = async (id: string, stock: number) => {
    await supabase.from("products").update({ stock }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your catalog and inventory.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button variant="spice" onClick={() => setEditing(null)}>
              <Plus className="mr-1 h-4 w-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-3">
              <div><Label>Name</Label><Input name="name" required defaultValue={editing?.name} /></div>
              <div><Label>Slug</Label><Input name="slug" defaultValue={editing?.slug} placeholder="auto from name" /></div>
              <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={editing?.description ?? ""} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Price (GHS)</Label><Input name="price_ghs" type="number" step="0.01" required defaultValue={editing?.price_ghs} /></div>
                <div><Label>Unit</Label><Input name="unit" defaultValue={editing?.unit ?? "kg"} /></div>
                <div><Label>Stock</Label><Input name="stock" type="number" defaultValue={editing?.stock ?? 0} /></div>
              </div>
              <div><Label>Image URL</Label><Input name="image_url" defaultValue={editing?.image_url ?? ""} /></div>
              <div>
                <Label>Category</Label>
                <select name="category_id" defaultValue={editing?.category_id ?? ""} className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— none —</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured} /> Featured
              </label>
              <Button type="submit" variant="hero">{editing ? "Save changes" : "Create product"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Featured</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td>{formatGHS(p.price_ghs)}/{p.unit}</td>
                <td>
                  <Input
                    type="number"
                    defaultValue={p.stock}
                    onBlur={(e) => updateStock(p.id, Number(e.target.value))}
                    className="h-8 w-20"
                  />
                </td>
                <td>{p.is_featured ? "Yes" : "—"}</td>
                <td className="pr-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
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
