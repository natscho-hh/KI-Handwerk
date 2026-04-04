import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/components/quotes/quote-form";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  // Only drafts can be edited
  if (quote.status !== "draft") {
    redirect(`/dashboard/quotes/${id}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_kleinunternehmer")
    .eq("id", user!.id)
    .single();

  const isKleinunternehmer = profile?.is_kleinunternehmer ?? false;

  const items = (quote.quote_items as Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>) ?? [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Angebot bearbeiten</h2>
      <QuoteForm
        initialData={{
          id: quote.id,
          customer_id: quote.customer_id,
          title: quote.title,
          valid_until: quote.valid_until,
          vat_rate: quote.vat_rate,
          notes: quote.notes,
          quote_items: items,
        }}
        isKleinunternehmer={isKleinunternehmer}
      />
    </div>
  );
}
