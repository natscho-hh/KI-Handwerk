"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { QuoteStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

interface CustomerInfo {
  first_name: string;
  last_name: string;
  company_name: string | null;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_gross: number;
  status: string;
  created_at: string;
  customers: CustomerInfo | CustomerInfo[] | null;
  [key: string]: unknown;
}

const STATUS_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "draft", label: "Entwurf" },
  { value: "sent", label: "Versendet" },
  { value: "accepted", label: "Angenommen" },
  { value: "rejected", label: "Abgelehnt" },
] as const;

function getCustomerName(quote: Quote): string {
  if (!quote.customers) return "";
  const c = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
  if (!c) return "";
  if (c.company_name) return c.company_name;
  return `${c.first_name} ${c.last_name}`.trim();
}

const columns = [
  { key: "quote_number", label: "Nr." },
  {
    key: "customer",
    label: "Kunde",
    render: (row: Quote) => getCustomerName(row),
  },
  { key: "title", label: "Titel" },
  {
    key: "total_gross",
    label: "Summe",
    render: (row: Quote) => formatCurrency(row.total_gross),
  },
  {
    key: "status",
    label: "Status",
    render: (row: Quote) => <QuoteStatusBadge status={row.status} />,
  },
  {
    key: "created_at",
    label: "Datum",
    render: (row: Quote) => formatDate(row.created_at),
  },
];

export function QuotesTable({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all"
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Angebote suchen..."
        searchKeys={["quote_number", "title"]}
        onRowClick={(row) => router.push(`/dashboard/quotes/${row.id}`)}
      />
    </div>
  );
}
