"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  total_gross: number;
  status: string;
  invoice_date: string;
  due_date: string | null;
  customers:
    | {
        first_name: string;
        last_name: string;
        company_name: string | null;
      }
    | {
        first_name: string;
        last_name: string;
        company_name: string | null;
      }[]
    | null;
  [key: string]: unknown;
}

type FilterStatus = "alle" | "offen" | "bezahlt" | "ueberfaellig";

function isOverdue(invoice: Invoice): boolean {
  return (
    invoice.status === "open" &&
    !!invoice.due_date &&
    new Date(invoice.due_date) < new Date()
  );
}

function getCustomerName(invoice: Invoice): string {
  const raw = invoice.customers;
  if (!raw) return "";
  const c = Array.isArray(raw) ? raw[0] : raw;
  if (!c) return "";
  if (c.company_name) return c.company_name;
  return `${c.first_name} ${c.last_name}`.trim();
}

const columns = [
  { key: "invoice_number", label: "Nr." },
  {
    key: "customer_name",
    label: "Kunde",
    render: (row: Invoice) => getCustomerName(row),
  },
  { key: "title", label: "Titel" },
  {
    key: "total_gross",
    label: "Summe",
    render: (row: Invoice) => formatCurrency(row.total_gross),
  },
  {
    key: "status",
    label: "Status",
    render: (row: Invoice) => (
      <InvoiceStatusBadge status={row.status} dueDate={row.due_date} />
    ),
  },
  {
    key: "invoice_date",
    label: "Rechnungsdatum",
    render: (row: Invoice) =>
      row.invoice_date ? formatDate(row.invoice_date) : "",
  },
  {
    key: "due_date",
    label: "Faellig",
    render: (row: Invoice) =>
      row.due_date ? formatDate(row.due_date) : "",
  },
];

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>("alle");

  const filtered = invoices.filter((inv) => {
    switch (filter) {
      case "offen":
        return inv.status === "open" && !isOverdue(inv);
      case "bezahlt":
        return inv.status === "paid";
      case "ueberfaellig":
        return isOverdue(inv);
      default:
        return true;
    }
  });

  const filters: { value: FilterStatus; label: string }[] = [
    { value: "alle", label: "Alle" },
    { value: "offen", label: "Offen" },
    { value: "bezahlt", label: "Bezahlt" },
    { value: "ueberfaellig", label: "Ueberfaellig" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Rechnungen suchen..."
        searchKeys={["invoice_number", "title"]}
        onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
      />
    </div>
  );
}
