"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronsUpDown, Check, Plus } from "lucide-react"

interface Customer {
  id: string
  company_name: string | null
  first_name: string
  last_name: string
  city: string | null
}

interface CustomerSelectProps {
  value: string | null
  onChange: (customerId: string) => void
}

function formatCustomerLabel(c: Customer): string {
  const name = `${c.first_name} ${c.last_name}`
  const parts: string[] = []
  if (c.company_name) parts.push(c.company_name)
  parts.push(name)
  if (c.city) parts.push(c.city)
  if (c.company_name) {
    return `${c.company_name} — ${c.first_name} ${c.last_name}${c.city ? `, ${c.city}` : ""}`
  }
  return `${c.first_name} ${c.last_name}${c.city ? `, ${c.city}` : ""}`
}

export function CustomerSelect({ value, onChange }: CustomerSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading] = React.useState(true)

  // Inline creation form state
  const [formData, setFormData] = React.useState({
    company_name: "",
    first_name: "",
    last_name: "",
    street: "",
    zip: "",
    city: "",
  })
  const [creating, setCreating] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  const loadCustomers = React.useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("customers")
      .select("id, company_name, first_name, last_name, city")
      .order("last_name")
    if (data) setCustomers(data)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const selectedCustomer = customers.find((c) => c.id === value)

  const resetForm = () => {
    setFormData({
      company_name: "",
      first_name: "",
      last_name: "",
      street: "",
      zip: "",
      city: "",
    })
    setFormError(null)
  }

  const handleCreateCustomer = async () => {
    // Validate required fields
    if (
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.street.trim() ||
      !formData.zip.trim() ||
      !formData.city.trim()
    ) {
      setFormError("Bitte alle Pflichtfelder ausfüllen.")
      return
    }

    setCreating(true)
    setFormError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setFormError("Nicht eingeloggt.")
        setCreating(false)
        return
      }

      const { data, error } = await supabase
        .from("customers")
        .insert({
          company_name: formData.company_name.trim() || null,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          street: formData.street.trim(),
          zip: formData.zip.trim(),
          city: formData.city.trim(),
          user_id: user.id,
        })
        .select("id")
        .single()

      if (error) {
        setFormError(error.message)
        setCreating(false)
        return
      }

      if (data) {
        await loadCustomers()
        onChange(data.id)
        setDialogOpen(false)
        resetForm()
      }
    } catch {
      setFormError("Ein Fehler ist aufgetreten.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            />
          }
        >
          {selectedCustomer
            ? formatCustomerLabel(selectedCustomer)
            : "Kunde auswählen..."}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[--anchor-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Kunde suchen..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Laden..." : "Kein Kunde gefunden."}
              </CommandEmpty>
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={formatCustomerLabel(customer)}
                    data-checked={value === customer.id ? "true" : undefined}
                    onSelect={() => {
                      onChange(customer.id)
                      setOpen(false)
                    }}
                  >
                    {formatCustomerLabel(customer)}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setDialogOpen(true)
                  }}
                >
                  <Plus className="size-4" />
                  Neuen Kunden anlegen
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
            <DialogDescription>
              Erfassen Sie die Kundendaten. Pflichtfelder sind mit * markiert.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cs-company">Firmenname</Label>
              <Input
                id="cs-company"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    company_name: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cs-first">Vorname *</Label>
                <Input
                  id="cs-first"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cs-last">Nachname *</Label>
                <Input
                  id="cs-last"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cs-street">Strasse *</Label>
              <Input
                id="cs-street"
                value={formData.street}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    street: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cs-zip">PLZ *</Label>
                <Input
                  id="cs-zip"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      zip: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cs-city">Ort *</Label>
                <Input
                  id="cs-city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>
              {creating ? "Wird angelegt..." : "Kunde anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
