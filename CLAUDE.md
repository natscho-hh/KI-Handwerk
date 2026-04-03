# CLAUDE.md – KI Handwerk Monorepo

## Vault-Kontext

Dieses Repo ist Teil des KI Handwerk Projekts. Der vollständige Projektkontext liegt im Obsidian Vault:
→ `C:\AI Projekt\Github-Repos\Obsidian-Vault\CLAUDE.md`

Lies bei Bedarf auch:
- [[00 Kontext/Über uns.md]] – Wer sind Natscho und Lars
- [[00 Kontext/ICP.md]] – Zielgruppe: Handwerks- und Dienstleistungsunternehmen
- [[00 Kontext/Angebot.md]] – Modulare SaaS-Plattform
- [[02 Projekte/KI Handwerk.md]] – Aktueller Projektstatus

## Repo-Struktur

```
KI-Handwerk/
├── modules/                # Einzelne SaaS-Module
│   ├── angebotsmanager/    # Angebote erstellen, verwalten, nachverfolgen
│   ├── wartungsmanager/    # Wartungsberichte, Termine, Erinnerungen
│   └── tagesgeschaeft/     # CEO Tagesbericht, Morgen-Brief, Routinen
├── shared/                 # Gemeinsamer Code
│   ├── utils/              # Hilfsfunktionen
│   ├── types/              # TypeScript Types / Schemas
│   └── constants/          # Konstanten (API-URLs, Konfiguration)
├── docs/                   # Dokumentation
│   ├── architecture/       # Architektur-Entscheidungen
│   ├── api/                # API-Dokumentation
│   └── workflows/          # n8n Workflow-Dokumentation
```

## Modul-Aufbau

Jedes Modul unter `modules/` hat dieselbe Struktur:
- `n8n-workflows/` – Exportierte n8n Workflows als JSON
- `backend/` – API, Logik, Datenbank
- `frontend/` – Web-UI (HTML/CSS/JS oder Framework)
- `README.md` – Modul-spezifische Doku

## Regeln

- Sprache: Deutsch (Code-Kommentare, UI, Docs)
- Immer echte Umlaute (ä, ö, ü, ß)
- n8n Workflows als JSON exportieren und versionieren
- MQTT in n8n NICHT verwenden → InfluxDB Bridge
- Anfängerfreundlich: was macht dieser Code/Node, warum brauchen wir ihn?
