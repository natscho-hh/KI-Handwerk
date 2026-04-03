"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";

interface Customer {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  city: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

const columns = [
  { key: "company_name", label: "Firma" },
  {
    key: "name",
    label: "Name",
    render: (row: Customer) => `${row.first_name} ${row.last_name}`.trim(),
  },
  { key: "city", label: "Ort" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefon" },
];

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={customers}
      searchPlaceholder="Kunden suchen..."
      searchKeys={["company_name", "first_name", "last_name", "city", "email"]}
      onRowClick={(row) => router.push(`/dashboard/customers/${row.id}`)}
    />
  );
}
