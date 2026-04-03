import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/shared/status-badge";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "*, customers(first_name, last_name, company_name, city), quote_items(*)"
    )
    .eq("id", id)
    .single();

  if (!quote) {
    notFound();
  }

  const customer = quote.customers as {
    first_name: string;
    last_name: string;
    company_name: string | null;
    city: string | null;
  } | null;

  const items = (quote.quote_items as Array<{
    id: string;
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>) ?? [];

  const sortedItems = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/quotes">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">
              {quote.quote_number}: {quote.title}
            </h2>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </div>
      </div>

      <QuoteActions quoteId={quote.id} status={quote.status} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kunde</CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <div className="text-sm space-y-1">
                {customer.company_name && (
                  <p className="font-medium">{customer.company_name}</p>
                )}
                <p>
                  {customer.first_name} {customer.last_name}
                </p>
                {customer.city && (
                  <p className="text-muted-foreground">{customer.city}</p>
                )}
                <Link
                  href={`/dashboard/customers/${quote.customer_id}`}
                  className="text-primary underline text-xs"
                >
                  Zum Kunden
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Kein Kunde zugeordnet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Erstellt am</dt>
                <dd>{formatDate(quote.created_at)}</dd>
              </div>
              {quote.valid_until && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gueltig bis</dt>
                  <dd>{formatDate(quote.valid_until)}</dd>
                </div>
              )}
              {!quote.is_kleinunternehmer && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">MwSt-Satz</dt>
                  <dd>{quote.vat_rate}%</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Pos</th>
                  <th className="pb-2 pr-4 font-medium">Beschreibung</th>
                  <th className="pb-2 pr-4 font-medium text-right">Menge</th>
                  <th className="pb-2 pr-4 font-medium">Einheit</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Einzelpreis
                  </th>
                  <th className="pb-2 font-medium text-right">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{item.position}</td>
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4 text-right">{item.quantity}</td>
                    <td className="py-2 pr-4">{item.unit}</td>
                    <td className="py-2 pr-4 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-2 text-right">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 max-w-xs ml-auto border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Netto</span>
              <span>{formatCurrency(quote.subtotal_net)}</span>
            </div>
            {quote.is_kleinunternehmer ? (
              <p className="text-xs text-muted-foreground">
                Gemaess &sect;19 UStG wird keine Umsatzsteuer berechnet.
              </p>
            ) : (
              <div className="flex justify-between">
                <span>MwSt ({quote.vat_rate}%)</span>
                <span>{formatCurrency(quote.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Gesamt</span>
              <span>{formatCurrency(quote.total_gross)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Bemerkungen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
