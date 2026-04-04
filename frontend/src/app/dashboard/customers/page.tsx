import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CustomersTable } from "./customers-table";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, first_name, last_name, city, email, phone")
    .eq("user_id", user!.id)
    .order("last_name", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Kunden</h2>
        <Link href="/dashboard/customers/new">
          <Button>Neuer Kunde</Button>
        </Link>
      </div>
      <CustomersTable customers={customers ?? []} />
    </div>
  );
}
