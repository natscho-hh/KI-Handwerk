import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, company_name, first_name, last_name, street, zip_code, city, email, phone, notes")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Kunde bearbeiten</h2>
      <CustomerForm initialData={customer} />
    </div>
  );
}
