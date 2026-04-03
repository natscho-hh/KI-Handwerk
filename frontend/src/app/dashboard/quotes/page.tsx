import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { QuotesTable } from "./quotes-table";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, title, total_gross, status, created_at, customers(first_name, last_name, company_name)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Angebote</h2>
        <Link href="/dashboard/quotes/new">
          <Button>Neues Angebot</Button>
        </Link>
      </div>
      <QuotesTable quotes={quotes ?? []} />
    </div>
  );
}
