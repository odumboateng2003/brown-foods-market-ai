import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, PiggyBank, Wallet, Calculator, Plus,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });

type Txn = {
  id: string;
  type: "revenue" | "expense" | "reinvestment" | "withdrawal" | "investment";
  amount_ghs: number;
  note: string | null;
  order_id: string | null;
  created_at: string;
};

type Settings = {
  id: string;
  reinvestment_percent: number;
  operational_expense_percent: number;
};

const TYPE_COLORS: Record<string, string> = {
  revenue: "#10b981",
  expense: "#ef4444",
  reinvestment: "#3b82f6",
  withdrawal: "#f59e0b",
  investment: "#8b5cf6",
};

function FinancePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [txnType, setTxnType] = useState<Txn["type"]>("expense");

  const { data, isLoading } = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const [products, items, orders, txns, settings] = await Promise.all([
        supabase.rpc("get_admin_products"),
        supabase.from("order_items").select("product_id,product_name,quantity,unit_price_ghs"),
        supabase.from("orders").select("id,total_ghs,payment_status"),
        supabase.from("finance_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("finance_settings").select("*").limit(1).maybeSingle(),
      ]);
      return {
        products: products.data ?? [],
        items: items.data ?? [],
        orders: orders.data ?? [],
        txns: (txns.data ?? []) as Txn[],
        settings: settings.data as Settings | null,
      };
    },
  });

  const stats = useMemo(() => {
    const products = data?.products ?? [];
    const items = data?.items ?? [];
    const orders = data?.orders ?? [];
    const txns = data?.txns ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Revenue from paid orders
    const paidRevenue = orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_ghs), 0);

    // COGS from sold items
    let cogs = 0;
    let salesValue = 0;
    items.forEach((it) => {
      const p = it.product_id ? productMap.get(it.product_id) : null;
      cogs += (p ? Number(p.cost_price_ghs ?? 0) : 0) * Number(it.quantity);
      salesValue += Number(it.quantity) * Number(it.unit_price_ghs);
    });
    const grossProfit = salesValue - cogs;

    // Manual transactions
    const manualExpenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount_ghs), 0);
    const manualReinvestment = txns.filter((t) => t.type === "reinvestment").reduce((s, t) => s + Number(t.amount_ghs), 0);
    const withdrawals = txns.filter((t) => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount_ghs), 0);
    const investments = txns.filter((t) => t.type === "investment").reduce((s, t) => s + Number(t.amount_ghs), 0);

    const netProfit = grossProfit - manualExpenses;
    const reinvestPercent = data?.settings?.reinvestment_percent ?? 20;
    const autoReinvestmentAllocation = Math.max(0, netProfit * (reinvestPercent / 100));
    const reinvestmentFund = manualReinvestment + autoReinvestmentAllocation - withdrawals;
    const withdrawable = netProfit - autoReinvestmentAllocation;

    // Inventory value
    const inventoryValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.cost_price_ghs ?? 0), 0);
    const inventoryWorth = products.reduce((s, p) => s + Number(p.stock) * Number(p.price_ghs), 0);
    const expectedFutureProfit = inventoryWorth - inventoryValue;

    // Per-product margin table
    const soldByProduct: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((it) => {
      const id = it.product_id ?? `name:${it.product_name}`;
      soldByProduct[id] ??= { name: it.product_name, qty: 0, revenue: 0 };
      soldByProduct[id].qty += Number(it.quantity);
      soldByProduct[id].revenue += Number(it.quantity) * Number(it.unit_price_ghs);
    });
    const productMargins = products.map((p) => {
      const sold = soldByProduct[p.id];
      const qty = sold?.qty ?? 0;
      const revenue = sold?.revenue ?? 0;
      const cost = Number(p.cost_price_ghs ?? 0) * qty;
      const profit = revenue - cost;
      const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return {
        id: p.id, name: p.name, qty, revenue, cost, profit, marginPct,
        unitCost: Number(p.cost_price_ghs ?? 0),
        unitPrice: Number(p.price_ghs),
      };
    }).sort((a, b) => b.profit - a.profit);

    const breakdownPie = [
      { name: "Gross profit", value: Math.max(0, grossProfit) },
      { name: "Expenses", value: manualExpenses },
      { name: "Reinvestment", value: Math.max(0, autoReinvestmentAllocation + manualReinvestment) },
    ].filter((x) => x.value > 0);

    return {
      paidRevenue, salesValue, cogs, grossProfit, manualExpenses, netProfit,
      reinvestmentFund, withdrawable, inventoryValue, inventoryWorth, expectedFutureProfit,
      productMargins, breakdownPie, withdrawals, investments,
    };
  }, [data]);

  const updatePercent = async (key: "reinvestment_percent" | "operational_expense_percent", value: number) => {
    if (!data?.settings) return;
    const update = key === "reinvestment_percent"
      ? { reinvestment_percent: value }
      : { operational_expense_percent: value };
    const { error } = await supabase.from("finance_settings").update(update).eq("id", data.settings.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const onSubmitTxn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: txnType,
      amount_ghs: Number(fd.get("amount")),
      note: String(fd.get("note") || "") || null,
    };
    const { error } = await supabase.from("finance_transactions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Transaction recorded");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading finance…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Financial management</h1>
          <p className="text-muted-foreground">Revenue, profit, reinvestment & operational expenses.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="spice"><Plus className="mr-1 h-4 w-4" /> Record transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
            <form onSubmit={onSubmitTxn} className="grid gap-3">
              <div>
                <Label>Type</Label>
                <select
                  value={txnType}
                  onChange={(e) => setTxnType(e.target.value as Txn["type"])}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="expense">Expense (operational)</option>
                  <option value="investment">Capital investment</option>
                  <option value="reinvestment">Manual reinvestment</option>
                  <option value="withdrawal">Withdrawal from fund</option>
                  <option value="revenue">Other revenue</option>
                </select>
              </div>
              <div><Label>Amount (GHS)</Label><Input name="amount" type="number" step="0.01" min="0" required /></div>
              <div><Label>Note</Label><Textarea name="note" rows={2} placeholder="What was this for?" /></div>
              <Button type="submit" variant="hero">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={DollarSign} label="Revenue received" value={formatGHS(stats.paidRevenue)} tone="green" />
        <Card icon={TrendingUp} label="Gross profit" value={formatGHS(stats.grossProfit)} hint={`COGS ${formatGHS(stats.cogs)}`} tone="spice" />
        <Card icon={TrendingDown} label="Operational expenses" value={formatGHS(stats.manualExpenses)} tone="rose" />
        <Card icon={Wallet} label="Net profit" value={formatGHS(stats.netProfit)} hint="After expenses" tone="blue" />
        <Card icon={PiggyBank} label="Reinvestment fund" value={formatGHS(stats.reinvestmentFund)} hint={`${data?.settings?.reinvestment_percent ?? 20}% auto allocation`} tone="blue" />
        <Card icon={Wallet} label="Withdrawable profit" value={formatGHS(Math.max(0, stats.withdrawable))} tone="green" />
        <Card icon={Calculator} label="Inventory value (cost)" value={formatGHS(stats.inventoryValue)} hint={`Worth at retail: ${formatGHS(stats.inventoryWorth)}`} tone="amber" />
        <Card icon={TrendingUp} label="Expected future profit" value={formatGHS(stats.expectedFutureProfit)} hint="If all stock sells" tone="spice" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-bold">Profit breakdown</h2>
          <div className="h-64 w-full">
            {stats.breakdownPie.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No financial activity yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.breakdownPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3} animationDuration={800}>
                    {stats.breakdownPie.map((s) => <Cell key={s.name} fill={s.name === "Gross profit" ? "#10b981" : s.name === "Expenses" ? "#ef4444" : "#3b82f6"} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatGHS(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="mb-2 font-display text-lg font-bold">Reinvestment settings</h2>
          <p className="mb-4 text-xs text-muted-foreground">Automatically allocate a % of profit into the business reinvestment fund.</p>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <Label>Reinvestment percentage</Label>
                <span className="font-display text-xl font-bold tabular-nums">{data?.settings?.reinvestment_percent ?? 20}%</span>
              </div>
              <Slider
                value={[data?.settings?.reinvestment_percent ?? 20]}
                onValueChange={(v) => updatePercent("reinvestment_percent", v[0])}
                min={0} max={100} step={5}
                className="mt-3"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Currently allocating <strong>{formatGHS(Math.max(0, stats.netProfit * ((data?.settings?.reinvestment_percent ?? 20) / 100)))}</strong> from current net profit.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Operational expense allowance</Label>
                <span className="font-display text-xl font-bold tabular-nums">{data?.settings?.operational_expense_percent ?? 10}%</span>
              </div>
              <Slider
                value={[data?.settings?.operational_expense_percent ?? 10]}
                onValueChange={(v) => updatePercent("operational_expense_percent", v[0])}
                min={0} max={100} step={5}
                className="mt-3"
              />
              <p className="mt-2 text-xs text-muted-foreground">Target budget for operational spending vs revenue.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Per-product profitability</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Product</th>
                <th>Unit cost</th>
                <th>Unit price</th>
                <th>Units sold</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {stats.productMargins.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td>{formatGHS(p.unitCost)}</td>
                  <td>{formatGHS(p.unitPrice)}</td>
                  <td>{p.qty}</td>
                  <td>{formatGHS(p.revenue)}</td>
                  <td>{formatGHS(p.cost)}</td>
                  <td className={p.profit >= 0 ? "text-green-700 font-semibold" : "text-rose-700 font-semibold"}>{formatGHS(p.profit)}</td>
                  <td>{p.marginPct}%</td>
                </tr>
              ))}
              {stats.productMargins.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Recent transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Type</th><th>Note</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(data?.txns ?? []).slice(0, 15).map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: TYPE_COLORS[t.type] }}>
                      {t.type}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{t.note ?? "—"}</td>
                  <td className="text-right font-semibold">{formatGHS(t.amount_ghs)}</td>
                </tr>
              ))}
              {(!data?.txns || data.txns.length === 0) && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No transactions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({
  icon: Icon, label, value, hint, tone = "spice",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone?: "spice" | "green" | "blue" | "amber" | "rose";
}) {
  const toneClasses: Record<string, string> = {
    spice: "text-spice bg-spice/10",
    green: "text-green-600 bg-green-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    rose: "text-rose-600 bg-rose-500/10",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-full ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
