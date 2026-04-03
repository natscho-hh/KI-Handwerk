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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentDialogProps {
  invoiceId: string;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function PaymentDialog({ invoiceId }: PaymentDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(getTodayDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", invoiceId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="default" />}
      >
        Als bezahlt markieren
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechnung als bezahlt markieren</DialogTitle>
          <DialogDescription>
            Waehlen Sie das Datum, an dem die Zahlung eingegangen ist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="paid-date">Zahlungsdatum</Label>
            <Input
              id="paid-date"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Wird gespeichert..." : "Bezahlt markieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
