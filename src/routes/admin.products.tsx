import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, Upload, Star, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
  cost_price_ghs: number;
  sale_price_ghs: number | null;
  unit: string;
  image_url: string | null;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  category_id: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_products");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const openNew = () => {
    setEditing(null);
    setImageUrl("");
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setImageUrl(p.image_url ?? "");
    setOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      slug: String(fd.get("slug") || slugify(String(fd.get("name")))),
      description: String(fd.get("description") || "") || null,
      price_ghs: Number(fd.get("price_ghs")),
      cost_price_ghs: Number(fd.get("cost_price_ghs") || 0),
      sale_price_ghs: fd.get("sale_price_ghs") ? Number(fd.get("sale_price_ghs")) : null,
      unit: String(fd.get("unit") || "kg"),
      stock: Number(fd.get("stock") || 0),
      image_url: imageUrl || null,
      is_featured: fd.get("is_featured") === "on",
      is_active: fd.get("is_active") !== "off",
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

  const patch = async (id: string, patch: Partial<Product>) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your catalog, prices, and inventory.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button variant="spice" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-3">
              <div><Label>Name</Label><Input name="name" required defaultValue={editing?.name} /></div>
              <div><Label>Slug</Label><Input name="slug" defaultValue={editing?.slug} placeholder="auto from name" /></div>
              <div><Label>Description</Label><Textarea name="description" rows={3} defaultValue={editing?.description ?? ""} /></div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Cost price (GHS)</Label>
                  <Input name="cost_price_ghs" type="number" step="0.01" defaultValue={editing?.cost_price_ghs ?? 0} />
                </div>
                <div>
                  <Label>Selling price (GHS)</Label>
                  <Input name="price_ghs" type="number" step="0.01" required defaultValue={editing?.price_ghs} />
                </div>
                <div>
                  <Label>Sale / discount price (GHS)</Label>
                  <Input name="sale_price_ghs" type="number" step="0.01" defaultValue={editing?.sale_price_ghs ?? ""} placeholder="optional" />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input name="unit" defaultValue={editing?.unit ?? "kg"} />
                </div>
                <div>
                  <Label>Stock quantity</Label>
                  <Input name="stock" type="number" defaultValue={editing?.stock ?? 0} />
                </div>
                <div>
                  <Label>Category</Label>
                  <select name="category_id" defaultValue={editing?.category_id ?? ""} className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">— none —</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Product image</Label>
                <div className="flex items-center gap-3">
                  {imageUrl && <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : imageUrl ? "Change image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                  </label>
                  {imageUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                      Remove
                    </Button>
                  )}
                </div>
                <Input className="mt-2" placeholder="Or paste an image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>

              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured} /> Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Active (visible on site)
                </label>
              </div>

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
              <th>Cost</th>
              <th>Price</th>
              <th>Sale</th>
              <th>Stock</th>
              <th>Status</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => {
              const margin = p.cost_price_ghs > 0
                ? Math.round(((Number(p.price_ghs) - Number(p.cost_price_ghs)) / Number(p.price_ghs)) * 100)
                : null;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                      <div>
                        <div className="flex items-center gap-1 font-medium">
                          {p.name}
                          {p.is_featured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                        </div>
                        <div className="text-xs text-muted-foreground">/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatGHS(p.cost_price_ghs)}</td>
                  <td>
                    <div>{formatGHS(p.price_ghs)}/{p.unit}</div>
                    {margin !== null && <div className="text-xs text-muted-foreground">{margin}% margin</div>}
                  </td>
                  <td>{p.sale_price_ghs ? formatGHS(p.sale_price_ghs) : "—"}</td>
                  <td>
                    <Input
                      type="number"
                      defaultValue={p.stock}
                      onBlur={(e) => patch(p.id, { stock: Number(e.target.value) })}
                      className="h-8 w-20"
                    />
                    {p.stock === 0 && <Badge variant="destructive" className="mt-1 text-[10px]">Out</Badge>}
                    {p.stock > 0 && p.stock <= 5 && <Badge className="mt-1 bg-amber-500 text-[10px]">Low</Badge>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(v) => patch(p.id, { is_active: v })}
                      />
                      <Power className={`h-3 w-3 ${p.is_active ? "text-green-600" : "text-muted-foreground"}`} />
                    </div>
                  </td>
                  <td className="pr-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!products || products.length === 0) && (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No products yet. Click "New product" to add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
