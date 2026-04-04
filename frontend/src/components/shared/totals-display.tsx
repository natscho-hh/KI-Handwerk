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
