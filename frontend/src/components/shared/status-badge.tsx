import { Badge } from "@/components/ui/badge";

const quoteStatusMap = {
  draft: { label: "Entwurf", variant: "secondary" as const },
  sent: { label: "Versendet", variant: "default" as const },
  accepted: { label: "Angenommen", variant: "default" as const },
  rejected: { label: "Abgelehnt", variant: "destructive" as const },
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
  const isOverdue =
    status === "open" && dueDate && new Date(dueDate) < new Date();
  const displayStatus = isOverdue ? "overdue" : status;
  const config =
    invoiceStatusMap[displayStatus as keyof typeof invoiceStatusMap];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
