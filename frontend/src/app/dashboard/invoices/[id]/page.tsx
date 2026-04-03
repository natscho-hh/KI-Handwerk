import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { TotalsDisplay } from "@/components/shared/totals-display";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "*, customers(first_name, last_name, company_name, city), invoice_items(*)"
    )
    .eq("id", id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const customer = invoice.customers as {
    first_name: string;
    last_name: string;
    company_name: string | null;
    city: string | null;
  } | null;

  const items = (
    invoice.invoice_items as {
      id: string;
      position: number;
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      total_price: number;
    }[]
  ).sort((a, b) => a.position - b.position);

  const isOverdue =
    invoice.status === "open" &&
    invoice.due_date &&
    new Date(invoice.due_date) < new Date();

  const customerName = customer
    ? customer.company_name
      ? `${customer.company_name} — ${customer.first_name} ${customer.last_name}`
      : `${customer.first_name} ${customer.last_name}`
    : "Unbekannt";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {invoice.invoice_number}: {invoice.title}
          </h2>
          <InvoiceStatusBadge
            status={invoice.status}
            dueDate={invoice.due_date}
          />
        </div>
        <Link href="/dashboard/invoices">
          <Button variant="outline">Zurueck</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Kunde: </span>
            <Link
              href={`/dashboard/customers/${invoice.customer_id}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {customerName}
              {customer?.city ? `, ${customer.city}` : ""}
            </Link>
          </div>
          <div>
            <span className="text-muted-foreground">Rechnungsdatum: </span>
            {invoice.invoice_date ? formatDate(invoice.invoice_date) : "-"}
          </div>
          <div>
            <span className="text-muted-foreground">Faelligkeitsdatum: </span>
            {invoice.due_date ? formatDate(invoice.due_date) : "-"}
          </div>
          {invoice.quote_id && (
            <div>
              <span className="text-muted-foreground">Aus Angebot: </span>
              <Link
                href={`/dashboard/quotes/${invoice.quote_id}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Angebot anzeigen
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {invoice.status === "paid" && invoice.paid_at && (
            <div className="text-green-600 font-medium">
              Bezahlt am {formatDate(invoice.paid_at)}
            </div>
          )}
          {(invoice.status === "open" || isOverdue) &&
            invoice.status !== "paid" && (
              <PaymentDialog invoiceId={invoice.id} />
            )}
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Pos</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="w-24 text-right">Menge</TableHead>
              <TableHead className="w-20">Einheit</TableHead>
              <TableHead className="w-28 text-right">Einzelpreis</TableHead>
              <TableHead className="w-28 text-right">Gesamt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.position}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.total_price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TotalsDisplay
        subtotalNet={invoice.subtotal_net}
        vatRate={invoice.vat_rate}
        isKleinunternehmer={invoice.is_kleinunternehmer}
      />

      {invoice.notes && (
        <div className="space-y-1">
          <h3 className="font-medium text-sm text-muted-foreground">
            Bemerkungen
          </h3>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
