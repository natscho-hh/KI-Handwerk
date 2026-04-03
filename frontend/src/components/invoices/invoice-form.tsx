"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelect } from "@/components/customers/customer-select";
import {
  LineItemsEditor,
  createEmptyItem,
  type LineItem,
} from "@/components/shared/line-items-editor";
import { TotalsDisplay, calculateTotals } from "@/components/shared/totals-display";

interface InvoiceFormProps {
  isKleinunternehmer: boolean;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function InvoiceForm({ isKleinunternehmer }: InvoiceFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [vatRate, setVatRate] = useState(19);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
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

      // Get next invoice number
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc(
        "next_invoice_number",
        { p_user_id: user.id }
      );
      if (rpcError) {
        setError(rpcError.message);
        setSaving(false);
        return;
      }

      // Insert invoice
      const { data: invoice, error: insertError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          status: "open",
          title: title.trim(),
          notes: notes.trim() || null,
          subtotal_net: totals.subtotal_net,
          vat_rate: isKleinunternehmer ? 0 : vatRate,
          vat_amount: totals.vat_amount,
          total_gross: totals.total_gross,
          is_kleinunternehmer: isKleinunternehmer,
          invoice_date: getTodayDate(),
          due_date: dueDate,
          is_locked: true,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      // Insert invoice items
      const invoiceItems = items
        .filter((i) => i.description.trim())
        .map((item, index) => ({
          invoice_id: invoice.id,
          position: index + 1,
          description: item.description.trim(),
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
        }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) {
        setError(itemsError.message);
        setSaving(false);
        return;
      }

      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Kunde *</Label>
          <CustomerSelect value={customerId} onChange={setCustomerId} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="inv-title">Titel *</Label>
          <Input
            id="inv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Rechnung Dacharbeiten"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="inv-due">Faelligkeitsdatum</Label>
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {!isKleinunternehmer && (
            <div className="grid gap-1.5">
              <Label htmlFor="inv-vat">MwSt-Satz (%)</Label>
              <Input
                id="inv-vat"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Positionen</Label>
        <LineItemsEditor items={items} onChange={setItems} />
      </div>

      <TotalsDisplay
        subtotalNet={totals.subtotal_net}
        vatRate={isKleinunternehmer ? 0 : vatRate}
        isKleinunternehmer={isKleinunternehmer}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="inv-notes">Bemerkungen</Label>
        <Textarea
          id="inv-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Bemerkungen..."
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Wird erstellt..." : "Rechnung erstellen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/invoices")}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
