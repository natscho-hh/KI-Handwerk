"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isKleinunternehmer, setIsKleinunternehmer] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    street: "",
    zip_code: "",
    city: "",
    phone: "",
    bank_name: "",
    iban: "",
    bic: "",
    tax_number: "",
    vat_id: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht eingeloggt.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        ...form,
        is_kleinunternehmer: isKleinunternehmer,
        vat_id: isKleinunternehmer ? "" : form.vat_id,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Willkommen bei KI Handwerk</CardTitle>
          <CardDescription>
            Hinterlege deine Firmendaten um loszulegen. Diese erscheinen auf deinen Angeboten und Rechnungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Firmendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="company_name">Firmenname *</Label>
                  <Input id="company_name" name="company_name" value={form.company_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3">Adresse</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="street">Strasse und Hausnummer *</Label>
                  <Input id="street" name="street" value={form.street} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">PLZ *</Label>
                  <Input id="zip_code" name="zip_code" value={form.zip_code} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ort *</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3">Bankverbindung</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="bank_name">Bank</Label>
                  <Input id="bank_name" name="bank_name" value={form.bank_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input id="iban" name="iban" value={form.iban} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC</Label>
                  <Input id="bic" name="bic" value={form.bic} onChange={handleChange} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-3">Steuerdaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Steuernummer</Label>
                  <Input id="tax_number" name="tax_number" value={form.tax_number} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="md:col-span-2 flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_kleinunternehmer"
                    checked={isKleinunternehmer}
                    onChange={(e) => setIsKleinunternehmer(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_kleinunternehmer">
                    Ich bin Kleinunternehmer (keine Umsatzsteuer gemaess §19 UStG)
                  </Label>
                </div>
                {!isKleinunternehmer && (
                  <div className="space-y-2">
                    <Label htmlFor="vat_id">Umsatzsteuer-ID</Label>
                    <Input id="vat_id" name="vat_id" value={form.vat_id} onChange={handleChange} />
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Speichern..." : "Firmenprofil speichern und loslegen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
