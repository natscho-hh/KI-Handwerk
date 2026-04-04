"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Send, Check, X, Trash2, FileText } from "lucide-react";

interface QuoteActionsProps {
  quoteId: string;
  status: string;
}

export function QuoteActions({ quoteId, status }: QuoteActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const { error } = await supabase
      .from("quotes")
      .update({ status: newStatus })
      .eq("id", quoteId);

    if (!error) {
      router.refresh();
    }
    setLoading(false);
  }

  async function deleteQuote() {
    setLoading(true);
    // Delete items first
    await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId);

    if (!error) {
      router.push("/dashboard/quotes");
    }
    setLoading(false);
  }

  async function createInvoiceFromQuote() {
    setLoading(true);
    try {
      // Load quote with items
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .eq("id", quoteId)
        .single();

      if (quoteError || !quote) {
        setLoading(false);
        return;
      }

      // Generate invoice number
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc(
        "next_invoice_number",
        { p_user_id: quote.user_id }
      );

      if (rpcError) {
        setLoading(false);
        return;
      }

      // Calculate due date (today + 14 days)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: quote.user_id,
          customer_id: quote.customer_id,
          quote_id: quote.id,
          invoice_number: invoiceNumber,
          status: "open",
          title: quote.title,
          notes: quote.notes,
          subtotal_net: quote.subtotal_net,
          vat_rate: quote.vat_rate,
          vat_amount: quote.vat_amount,
          total_gross: quote.total_gross,
          is_kleinunternehmer: quote.is_kleinunternehmer,
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: dueDateStr,
          is_locked: true,
        })
        .select("id")
        .single();

      if (invoiceError || !invoice) {
        setLoading(false);
        return;
      }

      // Copy quote items to invoice items
      const invoiceItems = (quote.quote_items as Array<{
        position: number;
        description: string;
        quantity: number;
        unit: string;
        unit_price: number;
        total_price: number;
      }>).map(
        (item) => ({
          invoice_id: invoice.id,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })
      );

      await supabase.from("invoice_items").insert(invoiceItems);

      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch {
      setLoading(false);
    }
  }

  if (status === "draft") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/quotes/${quoteId}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5 mr-1" /> Bearbeiten
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateStatus("sent")}
          disabled={loading}
        >
          <Send className="size-3.5 mr-1" /> Als versendet markieren
        </Button>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" size="sm" />
            }
          >
            <Trash2 className="size-3.5 mr-1" /> Loeschen
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Angebot loeschen?</DialogTitle>
              <DialogDescription>
                Dieses Angebot wird unwiderruflich geloescht. Dieser Vorgang
                kann nicht rueckgaengig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={deleteQuote}
                disabled={loading}
              >
                {loading ? "Wird geloescht..." : "Endgueltig loeschen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateStatus("accepted")}
          disabled={loading}
        >
          <Check className="size-3.5 mr-1" /> Angenommen
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => updateStatus("rejected")}
          disabled={loading}
        >
          <X className="size-3.5 mr-1" /> Abgelehnt
        </Button>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={createInvoiceFromQuote}
          disabled={loading}
        >
          <FileText className="size-3.5 mr-1" />
          {loading ? "Wird erstellt..." : "Rechnung erstellen"}
        </Button>
      </div>
    );
  }

  // rejected — no actions
  return null;
}
