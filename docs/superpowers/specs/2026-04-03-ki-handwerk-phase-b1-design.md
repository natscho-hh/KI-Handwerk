# KI Handwerk Phase B1 — Kundenverwaltung, Angebote & Rechnungen: Design

**Datum:** 2026-04-03
**Autoren:** Lars (Business/Vision), Natscho (Technik/Infra)
**Status:** Entwurf
**Abhaengigkeit:** Phase A (Fundament) — abgeschlossen

---

## 1. Kontext

Phase A hat die Infrastruktur geschaffen: Docker Compose (Supabase + N8N + Next.js), DB-Schema mit 6 Tabellen und RLS, Auth, Onboarding, Dashboard-Grundgeruest. Phase B1 baut die eigentlichen CRUD-Features: Kunden verwalten, Angebote erstellen/bearbeiten, Rechnungen erstellen mit Zahlungsstatus.

Phase B2 (Voice-KI Agent) baut spaeter auf B1 auf und nutzt die gleichen Datenstrukturen und UI-Komponenten.

### Bestehender Code

- **Frontend:** `frontend/src/app/dashboard/` mit Layout (Sidebar + Mobile Nav) und Platzhalter-Startseite
- **DB-Schema:** `supabase/migrations/` mit profiles, customers, quotes, quote_items, invoices, invoice_items
- **Supabase Client:** `frontend/src/lib/supabase/client.ts` (Browser) und `server.ts` (Server)
- **UI-Komponenten:** shadcn/ui v4 (button, card, input, label, separator, avatar, dropdown-menu, sheet, sonner)

---

## 2. Seiten und Routen

| Route | Typ | Beschreibung |
|---|---|---|
| `/dashboard/customers` | Liste | Kundenliste mit Suche und Filter |
| `/dashboard/customers/new` | Formular | Neuen Kunden anlegen |
| `/dashboard/customers/[id]` | Detail | Kunden-Detail mit verknuepften Angeboten/Rechnungen |
| `/dashboard/customers/[id]/edit` | Formular | Kunden bearbeiten |
| `/dashboard/quotes` | Liste | Angebotsliste mit Status-Filter |
| `/dashboard/quotes/new` | Formular | Neues Angebot erstellen |
| `/dashboard/quotes/[id]` | Detail | Angebot ansehen |
| `/dashboard/quotes/[id]/edit` | Formular | Angebot bearbeiten (nur Entwurf) |
| `/dashboard/invoices` | Liste | Rechnungsliste mit Status-Filter |
| `/dashboard/invoices/new` | Formular | Neue Rechnung erstellen (manuell) |
| `/dashboard/invoices/[id]` | Detail | Rechnung ansehen (Nur-Lese, Zahlungsstatus aenderbar) |

---

## 3. Kundenverwaltung

### Kundenliste (`/dashboard/customers`)
- Tabelle mit Spalten: Firmenname, Name, Ort, Email, Telefon
- Suchfeld oben (filtert ueber alle Spalten)
- Button "Neuer Kunde" oben rechts
- Klick auf Zeile oeffnet Kunden-Detail

### Kunden-Detail (`/dashboard/customers/[id]`)
- Alle Kundendaten anzeigen
- Bearbeiten-Button → `/dashboard/customers/[id]/edit`
- Liste der verknuepften Angebote (mit Status und Datum)
- Liste der verknuepften Rechnungen (mit Status und Betrag)
- Loeschen-Button (nur wenn keine Angebote/Rechnungen verknuepft — DB hat ON DELETE RESTRICT)

### Kunden-Formular (Anlegen + Bearbeiten)
Felder: Firmenname, Vorname*, Nachname*, Strasse*, PLZ*, Ort*, Email, Telefon, Notizen
(* = Pflichtfeld)

---

## 4. Angebote

### Angebotsliste (`/dashboard/quotes`)
- Tabelle: Angebotsnummer, Kunde, Titel, Summe (brutto), Status, Datum
- Filter nach Status: Alle, Entwurf, Versendet, Angenommen, Abgelehnt
- Button "Neues Angebot" oben rechts
- Klick auf Zeile oeffnet Angebot-Detail

### Angebot erstellen/bearbeiten
- **Kunde waehlen:** Suche-Dropdown mit Autocomplete. Bei keinem Treffer: "Neuen Kunden anlegen" Button oeffnet Inline-Formular (Name, Adresse — Pflichtfelder). Nach Speichern wird der neue Kunde automatisch gewaehlt.
- **Kopfdaten:** Titel, Gueltig-bis-Datum, Notizen
- **Positionen-Editor:**
  - Dynamische Zeilen: Position (automatisch), Beschreibung, Menge, Einheit (Dropdown: Stk, Std, m, m², Pauschal), Einzelpreis
  - Gesamtpreis pro Zeile berechnet sich automatisch (Menge × Einzelpreis)
  - Zeilen hinzufuegen (+), entfernen (X), per Drag-and-Drop sortieren
- **Summen-Bereich:**
  - Netto-Summe
  - MwSt-Zeile: Betrag bei 19% (oder 7% wenn manuell geaendert)
  - Brutto-Summe
  - Kleinunternehmer: Keine MwSt-Zeile, stattdessen Hinweistext "Gemaess §19 UStG wird keine Umsatzsteuer berechnet"
- **Speichern:** Immer als Entwurf. Angebotsnummer wird beim ersten Speichern vergeben (A-00001).
- **Bearbeiten:** Nur moeglich wenn Status = Entwurf. Bei anderen Status ist das Formular Nur-Lese.

### Angebot-Detail (`/dashboard/quotes/[id]`)
- Alle Daten anzeigen (Kunde, Positionen, Summen)
- Aktions-Buttons je nach Status:
  - Entwurf → "Bearbeiten", "Als versendet markieren", "Loeschen"
  - Versendet → "Angenommen", "Abgelehnt"
  - Angenommen → "Rechnung erstellen" (1-Klick → erstellt Rechnung und oeffnet sie)
  - Abgelehnt → Keine Aktionen

---

## 5. Rechnungen

### Rechnungsliste (`/dashboard/invoices`)
- Tabelle: Rechnungsnummer, Kunde, Titel, Summe (brutto), Status, Rechnungsdatum, Faelligkeitsdatum
- Filter nach Status: Alle, Offen, Bezahlt, Ueberfaellig
- Ueberfaellige Rechnungen visuell hervorgehoben (rote Markierung)
- Button "Neue Rechnung" oben rechts
- Klick auf Zeile oeffnet Rechnung-Detail

### Rechnung erstellen
**Aus Angebot (primaerer Weg):**
1. User klickt "Rechnung erstellen" bei angenommenem Angebot
2. System kopiert: Kunde, Titel, alle Positionen, Summen, Kleinunternehmer-Flag
3. Rechnungsnummer wird automatisch vergeben (R-00001, lueckenlos)
4. Rechnungsdatum = heute, Faelligkeitsdatum = heute + 14 Tage (Standard)
5. User kann Faelligkeitsdatum und Notizen vor dem Speichern aendern
6. Nach Speichern: Rechnung ist unveraenderbar (is_locked = true)

**Manuell (`/dashboard/invoices/new`):**
- Gleiches Formular wie Angebote (Kunde, Positionen, Summen)
- Nach Speichern sofort gesperrt

### Rechnung-Detail (`/dashboard/invoices/[id]`)
- Alle Daten anzeigen (Nur-Lese)
- Zahlungsstatus prominent angezeigt
- Aktions-Buttons:
  - Offen → "Als bezahlt markieren" (oeffnet Mini-Dialog: Zahlungsdatum eingeben, Standard = heute)
  - Bezahlt → Zahlungsdatum angezeigt, keine weiteren Aktionen
  - Ueberfaellig → "Als bezahlt markieren" (gleich wie bei Offen)

### Automatischer Ueberfaellig-Status
- Wird NICHT in der DB gespeichert (bleibt "open")
- Wird im Frontend berechnet: Wenn status = "open" UND due_date < heute → als "ueberfaellig" anzeigen
- Kein Cron-Job noetig, kein DB-Update noetig

---

## 6. Shared Components

### Kunden-Suchfeld (`CustomerSelect`)
- Combobox/Autocomplete mit Supabase-Suche (Name, Firmenname)
- Zeigt: Firmenname + Name + Ort
- "Neuen Kunden anlegen" als letzter Eintrag im Dropdown
- Oeffnet Inline-Dialog mit Pflichtfeldern (Vorname, Nachname, Strasse, PLZ, Ort)
- Wiederverwendbar in Angebots- und Rechnungsformularen

### Positionen-Editor (`LineItemsEditor`)
- Dynamische Liste von Positionen
- Pro Zeile: Beschreibung (Text), Menge (Zahl), Einheit (Dropdown), Einzelpreis (Zahl), Gesamtpreis (berechnet)
- Zeile hinzufuegen, entfernen
- Automatische Positionsnummerierung (1, 2, 3, ...)
- Wiederverwendbar in Angebots- und Rechnungsformularen

### Summen-Bereich (`TotalsDisplay`)
- Berechnet: Netto, MwSt-Betrag, Brutto
- Kleinunternehmer-Modus: Nur Netto + Hinweistext
- MwSt-Satz einstellbar (Standard 19%, manuell aenderbar auf z.B. 7%)
- Wiederverwendbar in Angebots- und Rechnungsformularen sowie Detail-Ansichten

### Status-Badge (`StatusBadge`)
- Farbige Badges fuer Angebots- und Rechnungsstatus
- Angebote: Entwurf (grau), Versendet (blau), Angenommen (gruen), Abgelehnt (rot)
- Rechnungen: Offen (gelb), Bezahlt (gruen), Ueberfaellig (rot)

---

## 7. Dateien und Struktur

```
frontend/src/
├── app/dashboard/
│   ├── customers/
│   │   ├── page.tsx              # Kundenliste
│   │   ├── new/page.tsx          # Neuer Kunde
│   │   └── [id]/
│   │       ├── page.tsx          # Kunden-Detail
│   │       └── edit/page.tsx     # Kunde bearbeiten
│   ├── quotes/
│   │   ├── page.tsx              # Angebotsliste
│   │   ├── new/page.tsx          # Neues Angebot
│   │   └── [id]/
│   │       ├── page.tsx          # Angebot-Detail
│   │       └── edit/page.tsx     # Angebot bearbeiten
│   └── invoices/
│       ├── page.tsx              # Rechnungsliste
│       ├── new/page.tsx          # Neue Rechnung
│       └── [id]/
│           └── page.tsx          # Rechnung-Detail (Nur-Lese)
├── components/
│   ├── customers/
│   │   ├── customer-form.tsx     # Kunden-Formular (Anlegen + Bearbeiten)
│   │   └── customer-select.tsx   # Kunden-Suchfeld mit Inline-Anlegen
│   ├── quotes/
│   │   └── quote-form.tsx        # Angebots-Formular
│   ├── invoices/
│   │   └── invoice-form.tsx      # Rechnungs-Formular (aus Angebot oder manuell)
│   └── shared/
│       ├── line-items-editor.tsx  # Positionen-Editor
│       ├── totals-display.tsx     # Summen-Bereich
│       ├── status-badge.tsx       # Status-Badges
│       └── data-table.tsx         # Wiederverwendbare Tabelle mit Suche/Filter
```

---

## 8. Datenfluss

### Angebot erstellen (manuell)
1. User oeffnet `/dashboard/quotes/new`
2. Waehlt Kunden (oder legt inline an → Supabase INSERT in customers)
3. Fuellt Positionen aus, Summen berechnen sich client-seitig
4. Klickt "Speichern"
5. Frontend ruft `next_quote_number(user_id)` auf → bekommt z.B. "A-00001"
6. INSERT in quotes + INSERT in quote_items (Batch)
7. Redirect zu `/dashboard/quotes/[id]`

### Angebot → Rechnung
1. User klickt "Rechnung erstellen" auf Angebot-Detail (Status = angenommen)
2. Frontend liest Angebot + Positionen
3. Ruft `next_invoice_number(user_id)` auf → bekommt z.B. "R-00001"
4. INSERT in invoices (mit quote_id Referenz, is_locked = true) + INSERT in invoice_items
5. Redirect zu `/dashboard/invoices/[id]`

### Zahlungsstatus aendern
1. User klickt "Als bezahlt markieren" auf Rechnung-Detail
2. Dialog: Zahlungsdatum eingeben (Standard: heute)
3. UPDATE invoices SET status = 'paid', paid_at = [datum] WHERE id = [id]
4. Seite aktualisiert sich

### Ueberfaellig-Erkennung
- Kein Backend-Prozess
- Frontend: Wenn invoice.status === 'open' && invoice.due_date < new Date() → Badge zeigt "Ueberfaellig" (rot)
- Rechnungsliste: Filter "Ueberfaellig" zeigt alle offenen Rechnungen mit abgelaufenem Faelligkeitsdatum

---

## 9. Zusaetzlich benoetigte shadcn/ui Komponenten

Folgende Komponenten muessen vor der Implementierung installiert werden:
- `table` — fuer Kunden-/Angebots-/Rechnungslisten
- `dialog` — fuer Inline-Kunden-Anlegen und Bestaetigungsdialoge
- `select` — fuer Einheit-Dropdown und Status-Filter
- `badge` — fuer Status-Badges
- `textarea` — fuer Notizen-Felder
- `popover` + `command` — fuer Kunden-Suchfeld (Combobox)
- `calendar` + `date-picker` — fuer Datums-Felder (Gueltig-bis, Faelligkeitsdatum)
