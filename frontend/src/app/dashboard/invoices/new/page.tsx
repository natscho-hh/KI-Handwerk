import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_kleinunternehmer")
    .eq("id", user!.id)
    .single();

  const isKleinunternehmer = profile?.is_kleinunternehmer ?? false;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Neue Rechnung</h2>
      <InvoiceForm isKleinunternehmer={isKleinunternehmer} />
    </div>
  );
}
