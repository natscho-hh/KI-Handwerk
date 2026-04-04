"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSelect } from "@/components/customers/customer-select";
import {
  LineItemsEditor,
  createEmptyItem,
  type LineItem,
} from "@/components/shared/line-items-editor";
import { TotalsDisplay, calculateTotals } from "@/components/shared/totals-display";

interface QuoteData {
  id: string;
  customer_id: string;
  title: string;
  valid_until: string | null;
  vat_rate: number;
  notes: string | null;
  quote_items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

interface QuoteFormProps {
  initialData?: QuoteData;
  isKleinunternehmer: boolean;
}

export function QuoteForm({ initialData, isKleinunternehmer }: QuoteFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(
    initialData?.customer_id ?? null
  );
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until ?? ""
  );
  const [vatRate, setVatRate] = useState(
    initialData?.vat_rate ?? 19
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(
    initialData?.quote_items.map((item) => ({
      id: crypto.randomUUID(),
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
    })) ?? [createEmptyItem()]
  );

  const totals = calculateTotals(items, vatRate, isKleinunternehmer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Bitte einen Kunden auswaehlen.");
      return;
    }
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (items.length === 0) {
      setError("Bitte mindestens eine Position hinzufuegen.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Nicht eingeloggt.");
        setSaving(false);
        return;
      }

      if (initialData) {
        // Update existing quote
        const { error: updateError } = await supabase
          .from("quotes")
          .update({
            customer_id: customerId,
            title: title.trim(),
            valid_until: validUntil || null,
            vat_rate: isKleinunternehmer ? 0 : vatRate,
            notes: notes.trim() || null,
            subtotal_net: totals.subtotal_net,
            vat_amount: totals.vat_amount,
            total_gross: totals.total_gross,
            is_kleinunternehmer: isKleinunternehmer,
          })
          .eq("id", initialData.id);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }

        // Delete old items, insert new
        await supabase
          .from("quote_items")
          .delete()
          .eq("quote_id", initialData.id);

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(
            items.map((item, index) => ({
              quote_id: initialData.id,
              position: index + 1,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
            }))
          );

        if (itemsError) {
          setError(itemsError.message);
          setSaving(false);
          return;
        }

        router.push(`/dashboard/quotes/${initialData.id}`);
      } else {
        // Create new quote
        const { data: quoteNumber, error: rpcError } = await supabase.rpc(
          "next_quote_number",
          { p_user_id: user.id }
        );

        if (rpcError) {
          setError(rpcError.message);
          setSaving(false);
          return;
        }

        const { data: quote, error: insertError } = await supabase
          .from("quotes")
          .insert({
            user_id: user.id,
            customer_id: customerId,
            quote_number: quoteNumber,
            status: "draft",
            title: title.trim(),
            valid_until: validUntil || null,
            vat_rate: isKleinunternehmer ? 0 : vatRate,
            notes: notes.trim() || null,
            subtotal_net: totals.subtotal_net,
            vat_amount: totals.vat_amount,
            total_gross: totals.total_gross,
            is_kleinunternehmer: isKleinunternehmer,
          })
          .select("id")
          .single();

        if (insertError || !quote) {
          setError(insertError?.message ?? "Fehler beim Erstellen.");
          setSaving(false);
          return;
        }

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(
            items.map((item, index) => ({
              quote_id: quote.id,
              position: index + 1,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total_price: item.quantity * item.unit_price,
            }))
          );

        if (itemsError) {
          setError(itemsError.message);
          setSaving(false);
          return;
        }

        router.push(`/dashboard/quotes/${quote.id}`);
      }
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kundendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Kunde *</Label>
              <CustomerSelect value={customerId} onChange={setCustomerId} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Angebotsdetails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Dachsanierung Einfamilienhaus"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="valid_until">Gueltig bis</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              {!isKleinunternehmer && (
                <div className="grid gap-1.5">
                  <Label>MwSt-Satz</Label>
                  <Select
                    value={String(vatRate)}
                    onValueChange={(v) => {
                      if (v) setVatRate(Number(v));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="19">19%</SelectItem>
                      <SelectItem value="7">7%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Bemerkungen</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionale Bemerkungen zum Angebot..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor items={items} onChange={setItems} />
          <div className="mt-6 max-w-xs ml-auto">
            <TotalsDisplay
              subtotalNet={totals.subtotal_net}
              vatRate={vatRate}
              isKleinunternehmer={isKleinunternehmer}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving
            ? "Wird gespeichert..."
            : initialData
              ? "Angebot aktualisieren"
              : "Angebot erstellen"}
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
