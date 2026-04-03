# KI Handwerk — Stufe 1: Tech-Stack & Architektur Design

**Datum:** 2026-04-03
**Autoren:** Lars (Business/Vision), Natscho (Technik/Infra)
**Status:** Entwurf

---

## 1. Kontext

KI Handwerk ist eine modulare Plattform fuer Handwerker und Dienstleister in Deutschland (spaeter DACH). Stufe 1 ist ein Angebots- und Rechnungsmanager mit Voice-KI-Integration.

### Zielgruppe
- Handwerker (Klempner, Elektriker, Maler, etc.)
- Dienstleister (Reinigung, Gartenbau, etc.)
- Einzel- und Kleinunternehmer in Deutschland

### Team
- **Natscho:** IT-Allrounder, Expertise in N8N, Infrastruktur, Claude Code. Kein Vorwissen in React/Next.js.
- **Lars:** Business, Visionen, Kundenperspektive. Kein Entwickler.
- Keine externen Entwickler geplant.

---

## 2. Architektur-Entscheidung

### Gewaehlter Ansatz: Fullstack-Plattform (Supabase) + N8N fuer Automationen

**Begruendung:** Supabase liefert Auth, Datenbank, API und Storage out-of-the-box. Das reduziert den Eigenentwicklungsaufwand massiv. N8N wird fuer das genutzt worin Natscho stark ist: Automationen und KI-Workflows. Ein eigenes Backend waere zu viel Aufwand fuer ein Zweierteam ohne Backend-Erfahrung.

**Verworfene Alternativen:**
- **N8N als Backend-Kern:** Fragil fuer CRUD, Nummernkreise, rechtskonforme Datenintegritaet. N8N ist fuer Workflows gebaut, nicht fuer Datenhaltung.
- **Eigenes Backend (Node.js/FastAPI) + N8N:** Zu viel Aufwand fuer das Team. Erfordert Backend-Erfahrung die nicht vorhanden ist.

---

## 3. Tech-Stack

| Bereich | Technologie | Begruendung |
|---|---|---|
| Frontend | Next.js + shadcn/ui | Groesstes Oekosystem, beste KI-Unterstuetzung, meiste fertige Dashboard-Komponenten |
| Backend/DB | Supabase (self-hosted, PostgreSQL) | Auth, DB, API, Storage in einem. Self-hosted fuer DSGVO |
| Automationen | N8N | Voice-Pipeline, PDF-Generierung, Email-Versand. Natschos Kernkompetenz |
| Voice-to-Text | OpenAI Whisper | Beste Qualitaet fuer deutsche Sprache |
| KI-Logik | Claude | Angebots-/Rechnungsstrukturierung aus Spracheingabe |
| PDF-Generierung | Noch zu evaluieren (Puppeteer, react-pdf, oder Gotenberg) | Muss professionelle Layouts und E-Rechnung unterstuetzen |
| E-Rechnung | ZUGFeRD/XRechnung Library | Wird Pflicht in DE, muss von Anfang an integriert sein |
| Hosting | Hostinger VPS (Docker) | Vorhandener VPS, reicht fuer MVP |
| Deployment | Docker Compose | Supabase + N8N + Next.js als Container. Spaetere Migration zu Hetzner trivial |

---

## 4. Systemarchitektur

```
┌─────────────────────────────────────────────────────┐
│                    Hostinger VPS                     │
│                  (Docker Compose)                    │
│                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐   │
│  │   Next.js    │   │       Supabase            │   │
│  │  Dashboard   │──▶│  - PostgreSQL (DB)        │   │
│  │  (shadcn/ui) │   │  - Auth (Login/Register)  │   │
│  │              │   │  - REST API (auto)        │   │
│  │  - Angebote  │   │  - Row Level Security     │   │
│  │  - Rechnungen│   │  - Storage (PDFs)         │   │
│  │  - Kunden    │   │                           │   │
│  │  - Berichte  │   └──────────┬───────────────┘   │
│  │  - Profil    │              │                    │
│  └──────────────┘              │                    │
│                                │                    │
│  ┌─────────────────────────────▼──────────────┐    │
│  │                  N8N                        │    │
│  │                                             │    │
│  │  Workflow 1: Voice Pipeline                 │    │
│  │  Web-App → Whisper → Claude → Supabase      │    │
│  │                                             │    │
│  │  Workflow 2: PDF-Generierung                │    │
│  │  Angebot/Rechnung → PDF → Supabase Storage  │    │
│  │                                             │    │
│  │  Workflow 3: Email-Versand                  │    │
│  │  Trigger → PDF anhängen → SMTP senden       │    │
│  │                                             │    │
│  │  Workflow 4: Kunden-Abgleich                │    │
│  │  Voice-Daten → DB-Abgleich → Rueckfrage     │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Datenfluss

### Angebot per Voice erstellen
1. Handwerker oeffnet KI-Agent in der Web-App (mobiloptimiert, funktioniert auf Smartphone)
2. Spricht per Mikrofon-Button mit dem KI-Agent (Voice-Chat)
3. Audio geht an N8N → Whisper transkribiert → Claude strukturiert (Kunde, Positionen, Preise)
4. KI-Agent fragt bei fehlenden Infos nach (Dialog per Voice oder Text)
5. N8N gleicht Kundendaten mit Supabase-DB ab
6. Bei Treffer: KI-Agent fragt "Meinst du [Kundenname]?"
7. Angebot wird in Supabase gespeichert (Status: Entwurf)
8. Handwerker sieht Angebot im Dashboard, kann bearbeiten
9. Bei Freigabe: PDF generieren, per Email versenden

### Angebot zu Rechnung
1. Handwerker klickt "Rechnung erstellen" bei angenommenem Angebot
2. System kopiert Daten, vergibt naechste Rechnungsnummer (lueckenlos)
3. Rechnung wird unveraenderbar gespeichert
4. PDF mit E-Rechnung (ZUGFeRD) generiert
5. Versand per Email oder Download

### Zahlung tracken
1. Handwerker markiert Rechnung als "bezahlt" im Dashboard
2. Zahlungsdatum wird gespeichert
3. Monatsberichte aktualisieren sich automatisch

---

## 6. Compliance-Anforderungen

### DSGVO
- Self-hosted Supabase auf deutschem/EU-Server (Hostinger EU-Rechenzentrum)
- Row Level Security: Jeder Nutzer sieht nur eigene Daten
- Loeschkonzept: Kunden und Daten auf Anfrage loeschbar (Aufbewahrungsfristen beachten)
- Einwilligung bei Registrierung
- AVV (Auftragsverarbeitungsvertrag) mit Hostinger

### E-Rechnung
- ZUGFeRD und/oder XRechnung Format
- PDF/A-3 mit eingebettetem XML
- Wird ab 2025 schrittweise Pflicht in DE

### Steuerrecht
- Fortlaufende, lueckenlose Rechnungsnummern
- Rechnungen nach Erstellung unveraenderbar
- Pflichtangaben auf Rechnungen (Name, Adresse, Steuernummer, Datum, Positionen, etc.)
- Kleinunternehmerregelung: Kein USt-Ausweis, Hinweistext auf Rechnung

---

## 7. Hosting & Skalierung

### Phase 1: MVP (jetzt)
- Hostinger VPS (vorhandener Server)
- Docker Compose: Supabase + N8N + Next.js
- Wenige Nutzer (1-10)

### Phase 2: Wachstum (spaeter)
- Migration zu Hetzner VPS (besseres Preis-Leistungs-Verhaeltnis)
- Docker-Container machen Umzug trivial: Compose-File + DB-Dump
- Ggf. separate Server fuer DB und Applikation

---

## 8. Offene Punkte

- [ ] PDF-Generierungs-Library evaluieren (Puppeteer vs. react-pdf vs. Gotenberg)
- [ ] ZUGFeRD/XRechnung Library evaluieren
- [x] Voice-Input-Kanal: KI-Agent als Web-App (mobiloptimiert), kein WhatsApp
- [ ] Email-Provider fuer Versand (eigener SMTP oder Dienst wie Resend/Mailgun?)
- [ ] Hostinger VPS Specs pruefen: Reicht RAM/CPU fuer Supabase + N8N + Next.js?
