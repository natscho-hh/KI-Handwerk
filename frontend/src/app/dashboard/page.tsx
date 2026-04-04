import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", user!.id)
    .single();

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: quoteCount } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true });

  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("total_gross, due_date")
    .eq("status", "open");

  const openTotal = (openInvoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_gross), 0
  );
  const overdueTotal = (openInvoices ?? [])
    .filter((inv) => inv.due_date && new Date(inv.due_date) < new Date())
    .reduce((sum, inv) => sum + Number(inv.total_gross), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">
        Willkommen{profile?.company_name ? `, ${profile.company_name}` : ""}
      </h2>
      <p className="text-muted-foreground mb-8">Deine Uebersicht auf einen Blick.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/customers" className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
          <p className="text-3xl font-bold">{customerCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Kunden</p>
        </Link>
        <Link href="/dashboard/quotes" className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
          <p className="text-3xl font-bold">{quoteCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Angebote</p>
        </Link>
        <Link href="/dashboard/invoices" className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
          <p className="text-3xl font-bold">{invoiceCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Rechnungen</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Offene Rechnungen</p>
          <p className="text-2xl font-bold">{formatCurrency(openTotal)}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Ueberfaellig</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(overdueTotal)}</p>
        </div>
      </div>
    </div>
  );
}
