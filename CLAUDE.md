# CLAUDE.md – KI Handwerk

## Vault-Kontext

Dieses Repo ist Teil des KI Handwerk Projekts. Der vollständige Projektkontext liegt im Obsidian Vault:
→ Der Obsidian Vault liegt im Repo `obsidian-vault` – geklont auf derselben Ebene wie dieses Repo.
→ Relativer Pfad: `../obsidian-vault/CLAUDE.md`

Relevante Vault-Dateien:
- `../obsidian-vault/00 Kontext/Über uns.md` – Wer sind Natscho und Lars
- `../obsidian-vault/00 Kontext/ICP.md` – Zielgruppe: Handwerks- und Dienstleistungsunternehmen
- `../obsidian-vault/02 Projekte/KI Handwerk - Stufe 1 Vision.md` – Vision Stufe 1
- `../obsidian-vault/02 Projekte/KI Handwerk - Stufe 1 Todos.md` – Aktuelle Todos

## Projekt

KI Handwerk ist ein Angebots- und Rechnungsmanager fuer Handwerker und Dienstleister. Stufe 1 umfasst:
- Voice-KI Agent (Angebote per Sprache erstellen)
- Angebots- und Rechnungsverwaltung im Dashboard
- Kundenverwaltung mit automatischem Abgleich
- PDF-Generierung mit E-Rechnung (ZUGFeRD/XRechnung)
- Email-Versand, Monatsberichte, Zahlungsstatus
- DSGVO-konform, Kleinunternehmerregelung

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Next.js 15+ (App Router) + shadcn/ui v4 + Tailwind v4 |
| Backend/DB/Auth | Supabase (self-hosted, PostgreSQL) |
| Automationen | N8N (Voice-Pipeline, PDF, Email) |
| Voice-to-Text | OpenAI Whisper |
| KI-Logik | Claude |
| Hosting | Hostinger VPS (Docker Compose), spaeter Hetzner |

## Repo-Struktur

```
KI-Handwerk/
├── docker-compose.yml          # Supabase + N8N + Next.js
├── .env.example                # Umgebungsvariablen-Vorlage
├── supabase/
│   └── migrations/             # SQL Migrations (001-005)
│       ├── 001_profiles.sql    # Firmenprofile + Onboarding
│       ├── 002_customers.sql   # Kundentabelle
│       ├── 003_quotes.sql      # Angebote + Positionen + Nummernkreis
│       ├── 004_invoices.sql    # Rechnungen + Schutz + Nummernkreis
│       └── 005_rls_policies.sql # Row Level Security
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/          # Login-Seite
│   │   │   ├── register/       # Registrierung
│   │   │   ├── onboarding/     # Firmendaten-Eingabe
│   │   │   └── dashboard/      # Dashboard mit Sidebar
│   │   ├── components/ui/      # shadcn/ui Komponenten
│   │   └── lib/supabase/       # Supabase Client (Browser + Server)
│   ├── src/middleware.ts        # Auth-Guard + Onboarding-Redirect
│   └── Dockerfile              # Multi-stage Docker Build
```

## Datenbank-Tabellen

- **profiles** – Firmendaten (Onboarding), Kleinunternehmer-Flag
- **customers** – Kundendaten mit user_id Zuordnung
- **quotes** + **quote_items** – Angebote mit Positionen, Status (draft/sent/accepted/rejected)
- **invoices** + **invoice_items** – Rechnungen (unveraenderbar nach Erstellung), Zahlungsstatus
- Alle Tabellen mit Row Level Security (jeder User sieht nur eigene Daten)

## Git-Workflow (Pflicht)

Markus und Lars arbeiten parallel – direkte Pushes auf `main` sind verboten.

### Branch-Strategie

```
main (stabil – nur via Pull Request)
├── markus/<feature-name>    # Markus' Arbeitsbranches
└── lars/<feature-name>      # Lars' Arbeitsbranches
```

**Namensbeispiele:**
- `markus/phase-b1-kunden`
- `markus/supabase-migrations`
- `lars/phase-b1-angebote`
- `lars/voice-ki-spec`

### Workflow pro Aufgabe

1. **Branch erstellen** (von aktuellem `main`):
   ```bash
   git checkout main && git pull origin main
   git checkout -b markus/<feature-name>
   ```
2. **Entwickeln** – Commits auf den eigenen Branch pushen
3. **Fertig** → Pull Request auf GitHub nach `main` öffnen
4. **Review** – der andere schaut kurz drüber und merged
5. **Branch löschen** nach dem Merge

### Regeln fuer Claude Code Instanzen (Markus & Lars)

**Session-Start (Pflicht):**
```bash
git checkout main && git pull origin main
```
Dann neuen Branch erstellen oder bestehenden Branch auschecken.

**Waehrend der Session:**
- Commits regelmaessig auf den eigenen Branch pushen: `git push origin <branch-name>`
- Niemals direkt auf `main` commiten oder pushen
- Wenn ein Task fertig ist: PR auf GitHub erstellen, nicht selbst mergen

**Session-Ende:**
- Alle Aenderungen commiten und auf den eigenen Branch pushen
- PR erstellen falls noch nicht geschehen
- Nichts auf `main` pushen

**Bei Konflikten:** Erst mit dem anderen abstimmen, nicht einfach ueberschreiben

## Regeln

- Sprache: Deutsch (UI, Docs). Code-Variablen auf Englisch
- Angebotsnummern: A-00001 (fortlaufend pro User)
- Rechnungsnummern: R-00001 (fortlaufend, lueckenlos pro User)
- Rechnungen nach Erstellung unveraenderbar (nur Zahlungsstatus aenderbar)
- Kleinunternehmer: Kein USt-Ausweis, Hinweistext auf Dokumenten
- DSGVO: Self-hosted Supabase, RLS, Loeschkonzept beachten

## Design-Docs

- Spec: `docs/superpowers/specs/2026-04-03-ki-handwerk-stufe1-techstack-design.md`
- Plan Phase A: `docs/superpowers/plans/2026-04-03-ki-handwerk-phase-a-fundament.md`
