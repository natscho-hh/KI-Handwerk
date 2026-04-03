"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerData {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  street: string;
  zip_code: string;
  city: string;
  email: string;
  phone: string;
  notes: string;
}

interface CustomerFormProps {
  initialData?: CustomerData;
}

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const values = {
      company_name: (formData.get("company_name") as string) || "",
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      street: formData.get("street") as string,
      zip_code: formData.get("zip_code") as string,
      city: formData.get("city") as string,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      notes: (formData.get("notes") as string) || "",
    };

    try {
      if (isEdit) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", initialData.id);

        if (updateError) throw updateError;
        router.push(`/dashboard/customers/${initialData.id}`);
        router.refresh();
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Nicht angemeldet");

        const { data, error: insertError } = await supabase
          .from("customers")
          .insert({ ...values, user_id: user.id })
          .select("id")
          .single();

        if (insertError) throw insertError;
        router.push(`/dashboard/customers/${data.id}`);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fehler beim Speichern";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="company_name">Firma</Label>
        <Input
          id="company_name"
          name="company_name"
          defaultValue={initialData?.company_name ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Vorname *</Label>
          <Input
            id="first_name"
            name="first_name"
            required
            defaultValue={initialData?.first_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nachname *</Label>
          <Input
            id="last_name"
            name="last_name"
            required
            defaultValue={initialData?.last_name ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">Strasse *</Label>
        <Input
          id="street"
          name="street"
          required
          defaultValue={initialData?.street ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip_code">PLZ *</Label>
          <Input
            id="zip_code"
            name="zip_code"
            required
            defaultValue={initialData?.zip_code ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ort *</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={initialData?.city ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialData?.phone ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initialData?.notes ?? ""}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern..." : isEdit ? "Aktualisieren" : "Kunde anlegen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
