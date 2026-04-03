# KI Handwerk Phase B1 — Kunden, Angebote, Rechnungen: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for customers, quotes, and invoices in the KI Handwerk dashboard — including shared components, status workflows, and quote-to-invoice conversion.

**Architecture:** Next.js 16 App Router pages with Server Components for data fetching and Client Components for forms. Supabase as backend via existing `@/lib/supabase/server.ts` (RSC) and `@/lib/supabase/client.ts` (client). Shared components (LineItemsEditor, CustomerSelect, TotalsDisplay, StatusBadge, DataTable) are reused across quotes and invoices.

**Tech Stack:** Next.js 16, React 19, shadcn/ui v4 (base-ui), Tailwind v4, Supabase, react-hook-form + zod, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-03-ki-handwerk-phase-b1-design.md`

**Repo:** `C:/AI Projekt/Github-Repos/KI-Handwerk/`

**Note:** No test framework is installed. Each task verifies via `next build` (type-check + compilation). Manual browser testing after each module.

---

## File Structure

```
frontend/src/
├── app/dashboard/
│   ├── customers/
│   │   ├── page.tsx                    # Kundenliste (Server Component)
│   │   ├── new/page.tsx                # Neuer Kunde
│   │   └── [id]/
│   │       ├── page.tsx                # Kunden-Detail (Server Component)
│   │       └── edit/page.tsx           # Kunde bearbeiten
│   ├── quotes/
│   │   ├── page.tsx                    # Angebotsliste (Server Component)
│   │   ├── new/page.tsx                # Neues Angebot
│   │   └── [id]/
│   │       ├── page.tsx                # Angebot-Detail (Server Component)
│   │       └── edit/page.tsx           # Angebot bearbeiten
│   ├── invoices/
│   │   ├── page.tsx                    # Rechnungsliste (Server Component)
│   │   ├── new/page.tsx                # Neue Rechnung (manuell)
│   │   └── [id]/
│   │       └── page.tsx                # Rechnung-Detail (Server Component, Nur-Lese)
│   ├── layout.tsx                      # Modify: active state for nested routes
│   └── page.tsx                        # Modify: real data from Supabase
├── components/
│   ├── customers/
│   │   ├── customer-form.tsx           # Kunden-Formular (Anlegen + Bearbeiten)
│   │   └── customer-select.tsx         # Kunden-Combobox mit Inline-Anlegen
│   ├── quotes/
│   │   ├── quote-form.tsx              # Angebots-Formular mit Positionen
│   │   └── quote-actions.tsx           # Status-Aktionen (versenden, annehmen, etc.)
│   ├── invoices/
│   │   ├── invoice-form.tsx            # Rechnungs-Formular (manuell + aus Angebot)
│   │   └── payment-dialog.tsx          # "Als bezahlt markieren" Dialog
│   └── shared/
│       ├── status-badge.tsx            # Farbige Status-Badges
│       ├── data-table.tsx              # Wiederverwendbare Tabelle mit Suche
│       ├── line-items-editor.tsx        # Positionen-Editor
│       └── totals-display.tsx          # Summen-Bereich (Netto/MwSt/Brutto)
├── lib/
│   └── format.ts                       # Formatierungs-Hilfsfunktionen (Waehrung, Datum)
```

---

## Task 1: shadcn/ui Komponenten installieren + Hilfsfunktionen

**Files:**
- Modify: `frontend/package.json` (via npx shadcn add)
- Create: `frontend/src/lib/format.ts`

- [ ] **Step 1: shadcn Komponenten installieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npx shadcn@latest add table dialog select badge textarea popover command calendar -y
```

Erwartung: Neue Dateien in `frontend/src/components/ui/` fuer jede Komponente.

- [ ] **Step 2: Formatierungs-Hilfsfunktionen erstellen**

Create `frontend/src/lib/format.ts`:

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}
```

- [ ] **Step 3: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

Erwartung: Build erfolgreich, keine Fehler.

- [ ] **Step 4: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/ui/ frontend/src/lib/format.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add shadcn components and formatting helpers for Phase B1"
```

---

## Task 2: Shared Components — StatusBadge + DataTable

**Files:**
- Create: `frontend/src/components/shared/status-badge.tsx`
- Create: `frontend/src/components/shared/data-table.tsx`

- [ ] **Step 1: StatusBadge erstellen**

Create `frontend/src/components/shared/status-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";

const quoteStatusMap = {
  draft: { label: "Entwurf", variant: "secondary" as const },
  sent: { label: "Versendet", variant: "default" as const },
  accepted: { label: "Angenommen", variant: "default" as const },
  rejected: { label: "Destructive", variant: "destructive" as const },
};

const invoiceStatusMap = {
  open: { label: "Offen", variant: "outline" as const },
  paid: { label: "Bezahlt", variant: "default" as const },
  overdue: { label: "Ueberfaellig", variant: "destructive" as const },
};

export function QuoteStatusBadge({ status }: { status: string }) {
  const config = quoteStatusMap[status as keyof typeof quoteStatusMap];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function InvoiceStatusBadge({
  status,
  dueDate,
}: {
  status: string;
  dueDate: string | null;
}) {
  // Ueberfaellig-Erkennung im Frontend (kein DB-Update)
  const isOverdue =
    status === "open" && dueDate && new Date(dueDate) < new Date();
  const displayStatus = isOverdue ? "overdue" : status;

  const config = invoiceStatusMap[displayStatus as keyof typeof invoiceStatusMap];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

- [ ] **Step 2: DataTable erstellen**

Create `frontend/src/components/shared/data-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Suchen...",
  searchKeys = [],
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? data.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key];
          return (
            typeof value === "string" &&
            value.toLowerCase().includes(search.toLowerCase())
          );
        })
      )
    : data;

  return (
    <div className="space-y-4">
      {searchKeys.length > 0 && (
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  Keine Eintraege gefunden.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow
                  key={i}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/shared/
git commit -m "feat: add StatusBadge and DataTable shared components"
```

---

## Task 3: Shared Components — TotalsDisplay + LineItemsEditor

**Files:**
- Create: `frontend/src/components/shared/totals-display.tsx`
- Create: `frontend/src/components/shared/line-items-editor.tsx`

- [ ] **Step 1: TotalsDisplay erstellen**

Create `frontend/src/components/shared/totals-display.tsx`:

```tsx
import { formatCurrency } from "@/lib/format";

interface TotalsDisplayProps {
  subtotalNet: number;
  vatRate: number;
  isKleinunternehmer: boolean;
}

export function TotalsDisplay({
  subtotalNet,
  vatRate,
  isKleinunternehmer,
}: TotalsDisplayProps) {
  const vatAmount = isKleinunternehmer ? 0 : subtotalNet * (vatRate / 100);
  const totalGross = subtotalNet + vatAmount;

  return (
    <div className="border-t pt-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Netto</span>
        <span>{formatCurrency(subtotalNet)}</span>
      </div>
      {isKleinunternehmer ? (
        <p className="text-xs text-muted-foreground">
          Gemaess §19 UStG wird keine Umsatzsteuer berechnet.
        </p>
      ) : (
        <div className="flex justify-between">
          <span>MwSt ({vatRate}%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base border-t pt-2">
        <span>Gesamt</span>
        <span>{formatCurrency(totalGross)}</span>
      </div>
    </div>
  );
}

export function calculateTotals(
  items: { quantity: number; unit_price: number }[],
  vatRate: number,
  isKleinunternehmer: boolean
) {
  const subtotalNet = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vatAmount = isKleinunternehmer ? 0 : subtotalNet * (vatRate / 100);
  const totalGross = subtotalNet + vatAmount;
  return {
    subtotal_net: Math.round(subtotalNet * 100) / 100,
    vat_amount: Math.round(vatAmount * 100) / 100,
    total_gross: Math.round(totalGross * 100) / 100,
  };
}
```

- [ ] **Step 2: LineItemsEditor erstellen**

Create `frontend/src/components/shared/line-items-editor.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const UNITS = ["Stk", "Std", "m", "m²", "Pauschal"];

function createEmptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "Stk",
    unit_price: 0,
  };
}

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

export function LineItemsEditor({ items, onChange, readOnly = false }: LineItemsEditorProps) {
  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  }

  function addItem() {
    onChange([...items, createEmptyItem()]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_6rem_6rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
        <span>Pos</span>
        <span>Beschreibung</span>
        <span>Menge</span>
        <span>Einheit</span>
        <span>Einzelpreis</span>
        <span>Gesamt</span>
        <span />
      </div>

      {items.map((item, index) => {
        const totalPrice = item.quantity * item.unit_price;
        return (
          <div
            key={item.id}
            className="grid grid-cols-[2rem_1fr_5rem_5rem_6rem_6rem_2rem] gap-2 items-center"
          >
            <span className="text-sm text-muted-foreground">{index + 1}</span>
            <Input
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
              placeholder="Beschreibung"
              disabled={readOnly}
            />
            <Input
              type="number"
              min={0}
              step="0.001"
              value={item.quantity}
              onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
              disabled={readOnly}
            />
            <Select
              value={item.unit}
              onValueChange={(v) => updateItem(index, "unit", v)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.unit_price}
              onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
              disabled={readOnly}
            />
            <span className="text-sm text-right">{formatCurrency(totalPrice)}</span>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="size-3.5 mr-1" /> Position hinzufuegen
        </Button>
      )}
    </div>
  );
}

export { createEmptyItem };
```

- [ ] **Step 3: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/shared/totals-display.tsx frontend/src/components/shared/line-items-editor.tsx
git commit -m "feat: add TotalsDisplay and LineItemsEditor shared components"
```

---

## Task 4: Kundenverwaltung — Formular + Liste + Detail + Bearbeiten

**Files:**
- Create: `frontend/src/components/customers/customer-form.tsx`
- Create: `frontend/src/app/dashboard/customers/page.tsx`
- Create: `frontend/src/app/dashboard/customers/new/page.tsx`
- Create: `frontend/src/app/dashboard/customers/[id]/page.tsx`
- Create: `frontend/src/app/dashboard/customers/[id]/edit/page.tsx`

- [ ] **Step 1: CustomerForm Component erstellen**

Create `frontend/src/components/customers/customer-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerData {
  id?: string;
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
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<CustomerData>({
    company_name: initialData?.company_name ?? "",
    first_name: initialData?.first_name ?? "",
    last_name: initialData?.last_name ?? "",
    street: initialData?.street ?? "",
    zip_code: initialData?.zip_code ?? "",
    city: initialData?.city ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    notes: initialData?.notes ?? "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht eingeloggt.");
      setLoading(false);
      return;
    }

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("customers")
        .update(form)
        .eq("id", initialData!.id);

      if (updateError) {
        setError("Speichern fehlgeschlagen: " + updateError.message);
        setLoading(false);
        return;
      }
      router.push(`/dashboard/customers/${initialData!.id}`);
    } else {
      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({ ...form, user_id: user.id })
        .select("id")
        .single();

      if (insertError) {
        setError("Anlegen fehlgeschlagen: " + insertError.message);
        setLoading(false);
        return;
      }
      router.push(`/dashboard/customers/${data.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="company_name">Firmenname</Label>
          <Input
            id="company_name"
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="first_name">Vorname *</Label>
          <Input
            id="first_name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nachname *</Label>
          <Input
            id="last_name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="street">Strasse *</Label>
          <Input
            id="street"
            name="street"
            value={form.street}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">PLZ *</Label>
          <Input
            id="zip_code"
            name="zip_code"
            value={form.zip_code}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ort *</Label>
          <Input
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="notes">Notizen</Label>
          <Textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern..." : isEditing ? "Speichern" : "Kunde anlegen"}
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
```

- [ ] **Step 2: Kundenliste erstellen**

Create `frontend/src/app/dashboard/customers/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, first_name, last_name, city, email, phone")
    .order("last_name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Kunden</h2>
        <Button asChild>
          <Link href="/dashboard/customers/new">Neuer Kunde</Link>
        </Button>
      </div>
      <CustomersTable customers={customers ?? []} />
    </div>
  );
}
```

Create `frontend/src/app/dashboard/customers/customers-table.tsx`:

```tsx
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
}

const columns = [
  { key: "company_name", label: "Firma" },
  {
    key: "name",
    label: "Name",
    render: (row: Customer) => `${row.first_name} ${row.last_name}`,
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
```

- [ ] **Step 3: Neuer-Kunde-Seite erstellen**

Create `frontend/src/app/dashboard/customers/new/page.tsx`:

```tsx
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Neuer Kunde</h2>
      <CustomerForm />
    </div>
  );
}
```

- [ ] **Step 4: Kunden-Detail-Seite erstellen**

Create `frontend/src/app/dashboard/customers/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { QuoteStatusBadge, InvoiceStatusBadge } from "@/components/shared/status-badge";
import { DeleteCustomerButton } from "./delete-customer-button";

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
    .select("id, quote_number, title, total_gross, status, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, title, total_gross, status, due_date, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const hasLinkedDocuments = (quotes && quotes.length > 0) || (invoices && invoices.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {customer.company_name || `${customer.first_name} ${customer.last_name}`}
        </h2>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/customers/${id}/edit`}>Bearbeiten</Link>
          </Button>
          {!hasLinkedDocuments && <DeleteCustomerButton customerId={id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Kontakt</p>
          <p>{customer.first_name} {customer.last_name}</p>
          {customer.company_name && <p>{customer.company_name}</p>}
          <p>{customer.street}</p>
          <p>{customer.zip_code} {customer.city}</p>
          {customer.email && <p>{customer.email}</p>}
          {customer.phone && <p>{customer.phone}</p>}
        </div>
        {customer.notes && (
          <div className="space-y-1 text-sm">
            <p className="font-medium">Notizen</p>
            <p className="text-muted-foreground">{customer.notes}</p>
          </div>
        )}
      </div>

      {quotes && quotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Angebote</h3>
          <div className="rounded-md border divide-y">
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/quotes/${q.id}`}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div>
                  <span className="font-medium">{q.quote_number}</span>
                  <span className="ml-2 text-muted-foreground">{q.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <QuoteStatusBadge status={q.status} />
                  <span className="text-sm">{formatCurrency(q.total_gross)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Rechnungen</h3>
          <div className="rounded-md border divide-y">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div>
                  <span className="font-medium">{inv.invoice_number}</span>
                  <span className="ml-2 text-muted-foreground">{inv.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <InvoiceStatusBadge status={inv.status} dueDate={inv.due_date} />
                  <span className="text-sm">{formatCurrency(inv.total_gross)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

Create `frontend/src/app/dashboard/customers/[id]/delete-customer-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await supabase.from("customers").delete().eq("id", customerId);
    setOpen(false);
    router.push("/dashboard/customers");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Loeschen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kunde loeschen?</DialogTitle>
          <DialogDescription>
            Dieser Kunde wird unwiderruflich geloescht. Das kann nicht
            rueckgaengig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Loeschen..." : "Endgueltig loeschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Kunden-Bearbeiten-Seite erstellen**

Create `frontend/src/app/dashboard/customers/[id]/edit/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Kunde bearbeiten</h2>
      <CustomerForm initialData={customer} />
    </div>
  );
}
```

- [ ] **Step 6: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 7: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/customers/ frontend/src/app/dashboard/customers/
git commit -m "feat: add customer management (list, create, detail, edit, delete)"
```

---

## Task 5: CustomerSelect — Kunden-Combobox mit Inline-Anlegen

**Files:**
- Create: `frontend/src/components/customers/customer-select.tsx`

- [ ] **Step 1: CustomerSelect Component erstellen**

Create `frontend/src/components/customers/customer-select.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerOption {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  city: string;
}

interface CustomerSelectProps {
  value: string | null;
  onChange: (customerId: string) => void;
}

export function CustomerSelect({ value, onChange }: CustomerSelectProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    street: "",
    zip_code: "",
    city: "",
    company_name: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name, first_name, last_name, city")
      .order("last_name");
    setCustomers(data ?? []);
  }

  const selected = customers.find((c) => c.id === value);
  const displayLabel = selected
    ? `${selected.company_name ? selected.company_name + " — " : ""}${selected.first_name} ${selected.last_name}, ${selected.city}`
    : "Kunde waehlen...";

  async function handleCreateCustomer() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({ ...newCustomer, user_id: user.id })
      .select("id")
      .single();

    if (!error && data) {
      await loadCustomers();
      onChange(data.id);
      setDialogOpen(false);
      setNewCustomer({
        first_name: "",
        last_name: "",
        street: "",
        zip_code: "",
        city: "",
        company_name: "",
      });
    }
    setSaving(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Kunde suchen..." />
            <CommandList>
              <CommandEmpty>Kein Kunde gefunden.</CommandEmpty>
              <CommandGroup>
                {customers.map((c) => {
                  const label = `${c.company_name ? c.company_name + " — " : ""}${c.first_name} ${c.last_name}, ${c.city}`;
                  return (
                    <CommandItem
                      key={c.id}
                      value={label}
                      onSelect={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Neuen Kunden anlegen
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Firmenname</Label>
              <Input
                value={newCustomer.company_name}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, company_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Vorname *</Label>
              <Input
                value={newCustomer.first_name}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, first_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nachname *</Label>
              <Input
                value={newCustomer.last_name}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, last_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Strasse *</Label>
              <Input
                value={newCustomer.street}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, street: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>PLZ *</Label>
              <Input
                value={newCustomer.zip_code}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, zip_code: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ort *</Label>
              <Input
                value={newCustomer.city}
                onChange={(e) =>
                  setNewCustomer((p) => ({ ...p, city: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateCustomer} disabled={saving}>
              {saving ? "Speichern..." : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/customers/customer-select.tsx
git commit -m "feat: add CustomerSelect combobox with inline customer creation"
```

---

## Task 6: Angebote — Formular + Liste + Detail + Bearbeiten

**Files:**
- Create: `frontend/src/components/quotes/quote-form.tsx`
- Create: `frontend/src/components/quotes/quote-actions.tsx`
- Create: `frontend/src/app/dashboard/quotes/page.tsx`
- Create: `frontend/src/app/dashboard/quotes/quotes-table.tsx`
- Create: `frontend/src/app/dashboard/quotes/new/page.tsx`
- Create: `frontend/src/app/dashboard/quotes/[id]/page.tsx`
- Create: `frontend/src/app/dashboard/quotes/[id]/edit/page.tsx`

- [ ] **Step 1: QuoteForm Component erstellen**

Create `frontend/src/components/quotes/quote-form.tsx`:

```tsx
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

interface QuoteFormProps {
  initialData?: {
    id: string;
    customer_id: string;
    title: string;
    notes: string;
    vat_rate: number;
    is_kleinunternehmer: boolean;
    valid_until: string | null;
    items: LineItem[];
  };
  isKleinunternehmer: boolean;
}

export function QuoteForm({ initialData, isKleinunternehmer }: QuoteFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState<string | null>(
    initialData?.customer_id ?? null
  );
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [vatRate, setVatRate] = useState(initialData?.vat_rate ?? 19);
  const [validUntil, setValidUntil] = useState(initialData?.valid_until ?? "");
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items ?? [createEmptyItem()]
  );

  const totals = calculateTotals(items, vatRate, isKleinunternehmer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Bitte einen Kunden waehlen.");
      return;
    }
    if (items.length === 0) {
      setError("Mindestens eine Position erforderlich.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht eingeloggt.");
      setLoading(false);
      return;
    }

    if (isEditing) {
      // Update quote
      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          customer_id: customerId,
          title,
          notes,
          vat_rate: vatRate,
          is_kleinunternehmer: isKleinunternehmer,
          valid_until: validUntil || null,
          ...totals,
        })
        .eq("id", initialData!.id);

      if (updateError) {
        setError("Speichern fehlgeschlagen: " + updateError.message);
        setLoading(false);
        return;
      }

      // Delete old items, insert new
      await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", initialData!.id);

      const itemRows = items.map((item, i) => ({
        quote_id: initialData!.id,
        position: i + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
      }));

      await supabase.from("quote_items").insert(itemRows);

      router.push(`/dashboard/quotes/${initialData!.id}`);
    } else {
      // Generate quote number
      const { data: numData } = await supabase.rpc("next_quote_number", {
        p_user_id: user.id,
      });

      const { data: quote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          customer_id: customerId,
          quote_number: numData,
          title,
          notes,
          vat_rate: vatRate,
          is_kleinunternehmer: isKleinunternehmer,
          valid_until: validUntil || null,
          ...totals,
        })
        .select("id")
        .single();

      if (insertError || !quote) {
        setError("Anlegen fehlgeschlagen: " + (insertError?.message ?? ""));
        setLoading(false);
        return;
      }

      const itemRows = items.map((item, i) => ({
        quote_id: quote.id,
        position: i + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
      }));

      await supabase.from("quote_items").insert(itemRows);

      router.push(`/dashboard/quotes/${quote.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Kunde *</Label>
          <CustomerSelect value={customerId} onChange={setCustomerId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Badezimmer Sanierung"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_until">Gueltig bis</Label>
            <Input
              id="valid_until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {!isKleinunternehmer && (
          <div className="w-32 space-y-2">
            <Label htmlFor="vat_rate">MwSt-Satz (%)</Label>
            <Input
              id="vat_rate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Positionen</h3>
        <LineItemsEditor items={items} onChange={setItems} />
      </div>

      <TotalsDisplay
        subtotalNet={totals.subtotal_net}
        vatRate={vatRate}
        isKleinunternehmer={isKleinunternehmer}
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Speichern..."
            : isEditing
              ? "Speichern"
              : "Angebot erstellen"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: QuoteActions Component erstellen**

Create `frontend/src/components/quotes/quote-actions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QuoteActionsProps {
  quoteId: string;
  status: string;
}

export function QuoteActions({ quoteId, status }: QuoteActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    await supabase.from("quotes").update({ status: newStatus }).eq("id", quoteId);
    router.refresh();
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    await supabase.from("quotes").delete().eq("id", quoteId);
    router.push("/dashboard/quotes");
    router.refresh();
  }

  async function createInvoice() {
    setLoading(true);

    // Load quote + items
    const { data: quote } = await supabase
      .from("quotes")
      .select("*, quote_items(*)")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      setLoading(false);
      return;
    }

    // Generate invoice number
    const { data: invNum } = await supabase.rpc("next_invoice_number", {
      p_user_id: quote.user_id,
    });

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        user_id: quote.user_id,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        invoice_number: invNum,
        title: quote.title,
        notes: quote.notes,
        subtotal_net: quote.subtotal_net,
        vat_rate: quote.vat_rate,
        vat_amount: quote.vat_amount,
        total_gross: quote.total_gross,
        is_kleinunternehmer: quote.is_kleinunternehmer,
        invoice_date: today,
        due_date: dueDate,
        is_locked: true,
      })
      .select("id")
      .single();

    if (!error && invoice) {
      // Copy items
      const itemRows = quote.quote_items.map(
        (item: { position: number; description: string; quantity: number; unit: string; unit_price: number; total_price: number }) => ({
          invoice_id: invoice.id,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })
      );
      await supabase.from("invoice_items").insert(itemRows);
      router.push(`/dashboard/invoices/${invoice.id}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <>
          <Button asChild variant="outline">
            <Link href={`/dashboard/quotes/${quoteId}/edit`}>Bearbeiten</Link>
          </Button>
          <Button onClick={() => updateStatus("sent")} disabled={loading}>
            Als versendet markieren
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Loeschen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Angebot loeschen?</DialogTitle>
                <DialogDescription>
                  Dieses Angebot wird unwiderruflich geloescht.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Loeschen..." : "Endgueltig loeschen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {status === "sent" && (
        <>
          <Button onClick={() => updateStatus("accepted")} disabled={loading}>
            Angenommen
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus("rejected")}
            disabled={loading}
          >
            Abgelehnt
          </Button>
        </>
      )}

      {status === "accepted" && (
        <Button onClick={createInvoice} disabled={loading}>
          {loading ? "Erstelle Rechnung..." : "Rechnung erstellen"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Angebotsliste erstellen**

Create `frontend/src/app/dashboard/quotes/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { QuotesTable } from "./quotes-table";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, title, total_gross, status, created_at, customers(first_name, last_name, company_name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Angebote</h2>
        <Button asChild>
          <Link href="/dashboard/quotes/new">Neues Angebot</Link>
        </Button>
      </div>
      <QuotesTable quotes={quotes ?? []} />
    </div>
  );
}
```

Create `frontend/src/app/dashboard/quotes/quotes-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { QuoteStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_gross: number;
  status: string;
  created_at: string;
  customers: { first_name: string; last_name: string; company_name: string } | null;
}

const statusFilters = [
  { label: "Alle", value: "all" },
  { label: "Entwurf", value: "draft" },
  { label: "Versendet", value: "sent" },
  { label: "Angenommen", value: "accepted" },
  { label: "Abgelehnt", value: "rejected" },
];

export function QuotesTable({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered =
    statusFilter === "all"
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

  const columns = [
    { key: "quote_number", label: "Nr." },
    {
      key: "customer",
      label: "Kunde",
      render: (row: Quote) =>
        row.customers
          ? row.customers.company_name || `${row.customers.first_name} ${row.customers.last_name}`
          : "—",
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {statusFilters.map((f) => (
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
```

- [ ] **Step 4: Neues-Angebot-Seite erstellen**

Create `frontend/src/app/dashboard/quotes/new/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/components/quotes/quote-form";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_kleinunternehmer")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Neues Angebot</h2>
      <QuoteForm isKleinunternehmer={profile?.is_kleinunternehmer ?? false} />
    </div>
  );
}
```

- [ ] **Step 5: Angebot-Detail-Seite erstellen**

Create `frontend/src/app/dashboard/quotes/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { QuoteStatusBadge } from "@/components/shared/status-badge";
import { TotalsDisplay } from "@/components/shared/totals-display";
import { QuoteActions } from "@/components/quotes/quote-actions";
import Link from "next/link";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(first_name, last_name, company_name, city), quote_items(*)")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const items = (quote.quote_items ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{quote.quote_number}</h2>
          <p className="text-muted-foreground">{quote.title}</p>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      <QuoteActions quoteId={quote.id} status={quote.status} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-medium mb-1">Kunde</p>
          <Link
            href={`/dashboard/customers/${quote.customer_id}`}
            className="text-primary hover:underline"
          >
            {quote.customers?.company_name || `${quote.customers?.first_name} ${quote.customers?.last_name}`}
          </Link>
          <p className="text-muted-foreground">{quote.customers?.city}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Details</p>
          <p>Erstellt: {formatDate(quote.created_at)}</p>
          {quote.valid_until && <p>Gueltig bis: {formatDate(quote.valid_until)}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Positionen</h3>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left w-12">Pos</th>
                <th className="p-3 text-left">Beschreibung</th>
                <th className="p-3 text-right w-20">Menge</th>
                <th className="p-3 text-left w-16">Einheit</th>
                <th className="p-3 text-right w-28">Einzelpreis</th>
                <th className="p-3 text-right w-28">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: { id: string; position: number; description: string; quantity: number; unit: string; unit_price: number; total_price: number }) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.position}</td>
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3">{item.unit}</td>
                  <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-xs ml-auto">
        <TotalsDisplay
          subtotalNet={quote.subtotal_net}
          vatRate={quote.vat_rate}
          isKleinunternehmer={quote.is_kleinunternehmer}
        />
      </div>

      {quote.notes && (
        <div>
          <p className="font-medium mb-1">Notizen</p>
          <p className="text-sm text-muted-foreground">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Angebot-Bearbeiten-Seite erstellen**

Create `frontend/src/app/dashboard/quotes/[id]/edit/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { QuoteForm } from "@/components/quotes/quote-form";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", id)
    .single();

  if (!quote) notFound();
  if (quote.status !== "draft") redirect(`/dashboard/quotes/${id}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_kleinunternehmer")
    .eq("id", user!.id)
    .single();

  const items = (quote.quote_items ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((item: { id: string; description: string; quantity: number; unit: string; unit_price: number }) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
    }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Angebot bearbeiten</h2>
      <QuoteForm
        initialData={{
          id: quote.id,
          customer_id: quote.customer_id,
          title: quote.title,
          notes: quote.notes ?? "",
          vat_rate: quote.vat_rate,
          is_kleinunternehmer: quote.is_kleinunternehmer,
          valid_until: quote.valid_until,
          items,
        }}
        isKleinunternehmer={profile?.is_kleinunternehmer ?? false}
      />
    </div>
  );
}
```

- [ ] **Step 7: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 8: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/quotes/ frontend/src/app/dashboard/quotes/
git commit -m "feat: add quotes management (list, create, detail, edit, status workflow, quote-to-invoice)"
```

---

## Task 7: Rechnungen — Formular + Liste + Detail + Bezahlt-Dialog

**Files:**
- Create: `frontend/src/components/invoices/invoice-form.tsx`
- Create: `frontend/src/components/invoices/payment-dialog.tsx`
- Create: `frontend/src/app/dashboard/invoices/page.tsx`
- Create: `frontend/src/app/dashboard/invoices/invoices-table.tsx`
- Create: `frontend/src/app/dashboard/invoices/new/page.tsx`
- Create: `frontend/src/app/dashboard/invoices/[id]/page.tsx`

- [ ] **Step 1: InvoiceForm Component erstellen**

Create `frontend/src/components/invoices/invoice-form.tsx`:

```tsx
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

export function InvoiceForm({ isKleinunternehmer }: InvoiceFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [vatRate, setVatRate] = useState(19);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);

  const totals = calculateTotals(items, vatRate, isKleinunternehmer);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Bitte einen Kunden waehlen.");
      return;
    }
    if (items.length === 0) {
      setError("Mindestens eine Position erforderlich.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht eingeloggt.");
      setLoading(false);
      return;
    }

    const { data: invNum } = await supabase.rpc("next_invoice_number", {
      p_user_id: user.id,
    });

    const today = new Date().toISOString().split("T")[0];

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        customer_id: customerId,
        invoice_number: invNum,
        title,
        notes,
        vat_rate: vatRate,
        is_kleinunternehmer: isKleinunternehmer,
        invoice_date: today,
        due_date: dueDate || null,
        is_locked: true,
        ...totals,
      })
      .select("id")
      .single();

    if (insertError || !invoice) {
      setError("Anlegen fehlgeschlagen: " + (insertError?.message ?? ""));
      setLoading(false);
      return;
    }

    const itemRows = items.map((item, i) => ({
      invoice_id: invoice.id,
      position: i + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_price: Math.round(item.quantity * item.unit_price * 100) / 100,
    }));

    await supabase.from("invoice_items").insert(itemRows);

    router.push(`/dashboard/invoices/${invoice.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Kunde *</Label>
          <CustomerSelect value={customerId} onChange={setCustomerId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Badezimmer Sanierung"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Faelligkeitsdatum</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {!isKleinunternehmer && (
          <div className="w-32 space-y-2">
            <Label htmlFor="vat_rate">MwSt-Satz (%)</Label>
            <Input
              id="vat_rate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Positionen</h3>
        <LineItemsEditor items={items} onChange={setItems} />
      </div>

      <TotalsDisplay
        subtotalNet={totals.subtotal_net}
        vatRate={vatRate}
        isKleinunternehmer={isKleinunternehmer}
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern..." : "Rechnung erstellen"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: PaymentDialog Component erstellen**

Create `frontend/src/components/invoices/payment-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PaymentDialog({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function handleMarkPaid() {
    setLoading(true);
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date(paidAt).toISOString() })
      .eq("id", invoiceId);
    setOpen(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Als bezahlt markieren</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zahlung erfassen</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="paid_at">Zahlungsdatum</Label>
          <Input
            id="paid_at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleMarkPaid} disabled={loading}>
            {loading ? "Speichern..." : "Als bezahlt markieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Rechnungsliste erstellen**

Create `frontend/src/app/dashboard/invoices/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, title, total_gross, status, invoice_date, due_date, customers(first_name, last_name, company_name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Rechnungen</h2>
        <Button asChild>
          <Link href="/dashboard/invoices/new">Neue Rechnung</Link>
        </Button>
      </div>
      <InvoicesTable invoices={invoices ?? []} />
    </div>
  );
}
```

Create `frontend/src/app/dashboard/invoices/invoices-table.tsx`:

```tsx
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
  customers: { first_name: string; last_name: string; company_name: string } | null;
}

const statusFilters = [
  { label: "Alle", value: "all" },
  { label: "Offen", value: "open" },
  { label: "Bezahlt", value: "paid" },
  { label: "Ueberfaellig", value: "overdue" },
];

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") {
      return (
        inv.status === "open" &&
        inv.due_date &&
        new Date(inv.due_date) < new Date()
      );
    }
    if (statusFilter === "open") {
      // "Offen" zeigt nur wirklich offene (nicht ueberfaellige)
      return (
        inv.status === "open" &&
        (!inv.due_date || new Date(inv.due_date) >= new Date())
      );
    }
    return inv.status === statusFilter;
  });

  const columns = [
    { key: "invoice_number", label: "Nr." },
    {
      key: "customer",
      label: "Kunde",
      render: (row: Invoice) =>
        row.customers
          ? row.customers.company_name || `${row.customers.first_name} ${row.customers.last_name}`
          : "—",
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
      render: (row: Invoice) => formatDate(row.invoice_date),
    },
    {
      key: "due_date",
      label: "Faellig",
      render: (row: Invoice) => (row.due_date ? formatDate(row.due_date) : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {statusFilters.map((f) => (
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
        searchPlaceholder="Rechnungen suchen..."
        searchKeys={["invoice_number", "title"]}
        onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Neue-Rechnung-Seite erstellen**

Create `frontend/src/app/dashboard/invoices/new/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_kleinunternehmer")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Neue Rechnung</h2>
      <InvoiceForm isKleinunternehmer={profile?.is_kleinunternehmer ?? false} />
    </div>
  );
}
```

- [ ] **Step 5: Rechnung-Detail-Seite erstellen**

Create `frontend/src/app/dashboard/invoices/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { TotalsDisplay } from "@/components/shared/totals-display";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import Link from "next/link";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(first_name, last_name, company_name, city), invoice_items(*)")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const items = (invoice.invoice_items ?? []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );

  const isOverdue =
    invoice.status === "open" &&
    invoice.due_date &&
    new Date(invoice.due_date) < new Date();

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
          <p className="text-muted-foreground">{invoice.title}</p>
        </div>
        <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} />
      </div>

      {(invoice.status === "open" || isOverdue) && (
        <PaymentDialog invoiceId={invoice.id} />
      )}

      {invoice.status === "paid" && invoice.paid_at && (
        <p className="text-sm text-muted-foreground">
          Bezahlt am {formatDate(invoice.paid_at)}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-medium mb-1">Kunde</p>
          <Link
            href={`/dashboard/customers/${invoice.customer_id}`}
            className="text-primary hover:underline"
          >
            {invoice.customers?.company_name || `${invoice.customers?.first_name} ${invoice.customers?.last_name}`}
          </Link>
          <p className="text-muted-foreground">{invoice.customers?.city}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Details</p>
          <p>Rechnungsdatum: {formatDate(invoice.invoice_date)}</p>
          {invoice.due_date && <p>Faellig: {formatDate(invoice.due_date)}</p>}
          {invoice.quote_id && (
            <p>
              Aus Angebot:{" "}
              <Link
                href={`/dashboard/quotes/${invoice.quote_id}`}
                className="text-primary hover:underline"
              >
                Angebot ansehen
              </Link>
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Positionen</h3>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left w-12">Pos</th>
                <th className="p-3 text-left">Beschreibung</th>
                <th className="p-3 text-right w-20">Menge</th>
                <th className="p-3 text-left w-16">Einheit</th>
                <th className="p-3 text-right w-28">Einzelpreis</th>
                <th className="p-3 text-right w-28">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: { id: string; position: number; description: string; quantity: number; unit: string; unit_price: number; total_price: number }) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.position}</td>
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3">{item.unit}</td>
                  <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-xs ml-auto">
        <TotalsDisplay
          subtotalNet={invoice.subtotal_net}
          vatRate={invoice.vat_rate}
          isKleinunternehmer={invoice.is_kleinunternehmer}
        />
      </div>

      {invoice.notes && (
        <div>
          <p className="font-medium mb-1">Notizen</p>
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 7: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/components/invoices/ frontend/src/app/dashboard/invoices/
git commit -m "feat: add invoice management (list, create, detail, payment tracking)"
```

---

## Task 8: Dashboard mit echten Kennzahlen + Sidebar Active-State Fix

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Dashboard-Startseite mit echten Daten aktualisieren**

Replace `frontend/src/app/dashboard/page.tsx` with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", user!.id)
    .single();

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: quoteCount } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true });

  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  // Offene Rechnungen (Summe)
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("total_gross, due_date")
    .eq("status", "open");

  const openTotal = (openInvoices ?? []).reduce(
    (sum, inv) => sum + Number(inv.total_gross),
    0
  );
  const overdueTotal = (openInvoices ?? [])
    .filter((inv) => inv.due_date && new Date(inv.due_date) < new Date())
    .reduce((sum, inv) => sum + Number(inv.total_gross), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">
        Willkommen{profile?.company_name ? `, ${profile.company_name}` : ""}
      </h2>
      <p className="text-muted-foreground mb-8">
        Deine Uebersicht auf einen Blick.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/dashboard/customers"
          className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors"
        >
          <p className="text-3xl font-bold">{customerCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Kunden</p>
        </Link>
        <Link
          href="/dashboard/quotes"
          className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors"
        >
          <p className="text-3xl font-bold">{quoteCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Angebote</p>
        </Link>
        <Link
          href="/dashboard/invoices"
          className="bg-card border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors"
        >
          <p className="text-3xl font-bold">{invoiceCount ?? 0}</p>
          <p className="text-sm text-muted-foreground">Rechnungen</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Offene Rechnungen</p>
          <p className="text-2xl font-bold">{formatCurrency(openTotal)}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Ueberfaellig</p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(overdueTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar Active-State fuer verschachtelte Routen fixen**

In `frontend/src/app/dashboard/layout.tsx`, change the active-state logic from exact match (`pathname === item.href`) to prefix match, so that `/dashboard/customers/new` highlights the "Kunden" nav item:

Replace this line in both Sidebar and Mobile nav:

```tsx
pathname === item.href
```

With:

```tsx
item.href === "/dashboard"
  ? pathname === "/dashboard"
  : pathname.startsWith(item.href)
```

This keeps "Uebersicht" only active on exact `/dashboard` but highlights "Kunden", "Angebote", "Rechnungen" for all sub-routes.

- [ ] **Step 3: Build verifizieren**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk/frontend"
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd "C:/AI Projekt/Github-Repos/KI-Handwerk"
git add frontend/src/app/dashboard/page.tsx frontend/src/app/dashboard/layout.tsx
git commit -m "feat: dashboard with real metrics + fix sidebar active state for nested routes"
```

---

## Zusammenfassung

| Task | Beschreibung | Dateien |
|------|-------------|---------|
| 1 | shadcn Komponenten + format.ts | ~10 UI files + 1 lib |
| 2 | StatusBadge + DataTable | 2 shared components |
| 3 | TotalsDisplay + LineItemsEditor | 2 shared components |
| 4 | Kundenverwaltung komplett | 1 component + 5 pages |
| 5 | CustomerSelect Combobox | 1 component |
| 6 | Angebote komplett | 2 components + 5 pages |
| 7 | Rechnungen komplett | 2 components + 4 pages |
| 8 | Dashboard + Sidebar Fix | 2 modified files |

**Tasks 1-3** muessen zuerst (Grundlagen). **Task 4-5** vor Task 6 (Kunden vor Angebote wegen CustomerSelect). **Task 6** vor Task 7 (Quote-to-Invoice in QuoteActions). **Task 8** zuletzt.
