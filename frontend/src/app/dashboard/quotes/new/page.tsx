import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/components/quotes/quote-form";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
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
      <h2 className="text-2xl font-bold mb-6">Neues Angebot</h2>
      <QuoteForm isKleinunternehmer={isKleinunternehmer} />
    </div>
  );
}
