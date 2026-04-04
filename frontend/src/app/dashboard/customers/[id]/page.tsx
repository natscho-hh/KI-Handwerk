import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge, InvoiceStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { DeleteCustomerButton } from "./delete-customer-button";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, status, total_gross, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_gross, due_date, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const hasLinkedDocuments =
    (quotes && quotes.length > 0) || (invoices && invoices.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {customer.first_name} {customer.last_name}
          </h2>
          {customer.company_name && (
            <p className="text-muted-foreground">{customer.company_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/customers/${id}/edit`}>
            <Button variant="outline">Bearbeiten</Button>
          </Link>
          {!hasLinkedDocuments && <DeleteCustomerButton customerId={id} />}
        </div>
      </div>

      {/* Customer Data */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Kundendaten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Strasse:</span>{" "}
            {customer.street}
          </div>
          <div>
            <span className="text-muted-foreground">PLZ / Ort:</span>{" "}
            {customer.zip_code} {customer.city}
          </div>
          <div>
            <span className="text-muted-foreground">E-Mail:</span>{" "}
            {customer.email || "–"}
          </div>
          <div>
            <span className="text-muted-foreground">Telefon:</span>{" "}
            {customer.phone || "–"}
          </div>
          {customer.notes && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Notizen:</span>{" "}
              {customer.notes}
            </div>
          )}
        </div>
      </div>

      {/* Quotes */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Angebote</h3>
        {quotes && quotes.length > 0 ? (
          <div className="space-y-2">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/quotes/${q.id}`}
                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{q.quote_number}</span>
                  <QuoteStatusBadge status={q.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatDate(q.created_at)}</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(q.total_gross)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Angebote vorhanden.</p>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Rechnungen</h3>
        {invoices && invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{inv.invoice_number}</span>
                  <InvoiceStatusBadge status={inv.status} dueDate={inv.due_date} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatDate(inv.created_at)}</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(inv.total_gross)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Rechnungen vorhanden.</p>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Erstellt: {formatDate(customer.created_at)} | Aktualisiert:{" "}
        {formatDate(customer.updated_at)}
      </div>
    </div>
  );
}
