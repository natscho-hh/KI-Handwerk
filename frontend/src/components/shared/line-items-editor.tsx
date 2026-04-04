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

export function LineItemsEditor({
  items,
  onChange,
  readOnly = false,
}: LineItemsEditorProps) {
  function updateItem(
    index: number,
    field: keyof LineItem,
    value: string | number
  ) {
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
              onChange={(e) =>
                updateItem(index, "description", e.target.value)
              }
              placeholder="Beschreibung"
              disabled={readOnly}
            />
            <Input
              type="number"
              min={0}
              step="0.001"
              value={item.quantity}
              onChange={(e) =>
                updateItem(index, "quantity", parseFloat(e.target.value) || 0)
              }
              disabled={readOnly}
            />
            <Select
              value={item.unit}
              onValueChange={(v) => { if (v) updateItem(index, "unit", v); }}
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
              onChange={(e) =>
                updateItem(
                  index,
                  "unit_price",
                  parseFloat(e.target.value) || 0
                )
              }
              disabled={readOnly}
            />
            <span className="text-sm text-right">
              {formatCurrency(totalPrice)}
            </span>
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
