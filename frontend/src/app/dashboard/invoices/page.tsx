import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "./invoices-table";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, title, total_gross, status, invoice_date, due_date, customers(first_name, last_name, company_name)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Rechnungen</h2>
        <Link href="/dashboard/invoices/new">
          <Button>Neue Rechnung</Button>
        </Link>
      </div>
      <InvoicesTable invoices={invoices ?? []} />
    </div>
  );
}
