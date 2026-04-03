import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, first_name, last_name")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">
        Willkommen{profile?.company_name ? `, ${profile.company_name}` : ""}
      </h2>
      <p className="text-muted-foreground mb-8">
        Hier siehst du bald deine Uebersicht mit Angeboten, Rechnungen und Kennzahlen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Angebote</p>
        </div>
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Rechnungen</p>
        </div>
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Kunden</p>
        </div>
      </div>
    </div>
  );
}
