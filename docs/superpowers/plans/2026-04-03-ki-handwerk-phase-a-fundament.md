# KI Handwerk Phase A — Fundament: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lauffaehige Infrastruktur mit Supabase, N8N und Next.js auf dem Hostinger VPS. Nutzer koennen sich registrieren, einloggen und ihr Firmenprofil anlegen. Datenbank-Schema fuer Kunden, Angebote und Rechnungen steht. DSGVO-Grundlagen (RLS, Consent) sind implementiert.

**Architecture:** Docker Compose auf Hostinger VPS mit drei Services: Supabase (self-hosted, PostgreSQL + Auth + Storage + REST API), N8N (Automationen), Next.js mit shadcn/ui (Frontend). Supabase Row Level Security schuetzt alle Tabellen. Auth laeuft ueber Supabase Auth (Email + Passwort).

**Tech Stack:** Next.js 14+ (App Router), shadcn/ui, Supabase (self-hosted via Docker), N8N, PostgreSQL, Docker Compose, TypeScript

---

## File Structure

```
ki-handwerk/
├── docker-compose.yml                    # Supabase + N8N + Next.js
├── .env                                  # Umgebungsvariablen (nicht in Git)
├── .env.example                          # Vorlage fuer .env
├── supabase/
│   └── migrations/
│       ├── 001_profiles.sql              # Firmenprofile (Onboarding-Daten)
│       ├── 002_customers.sql             # Kundentabelle
│       ├── 003_quotes.sql                # Angebote + Positionen
│       ├── 004_invoices.sql              # Rechnungen + Positionen
│       └── 005_rls_policies.sql          # Row Level Security
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                # Root Layout mit Supabase Provider
│   │   │   ├── page.tsx                  # Landing / Redirect
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Login-Seite
│   │   │   ├── register/
│   │   │   │   └── page.tsx              # Registrierung
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx              # Firmendaten-Eingabe nach Registrierung
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx            # Dashboard Layout mit Sidebar
│   │   │       └── page.tsx              # Dashboard Startseite (Platzhalter)
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts             # Browser Supabase Client
│   │   │   │   ├── server.ts             # Server Supabase Client
│   │   │   │   └── middleware.ts         # Auth Middleware
│   │   │   └── types/
│   │   │       └── database.ts           # TypeScript Types aus DB-Schema
│   │   └── components/
│   │       └── ui/                       # shadcn/ui Komponenten
│   └── middleware.ts                     # Next.js Middleware (Auth-Guard)
```

---

## Task 1: Docker Compose Setup

**Files:**
- Create: `ki-handwerk/docker-compose.yml`
- Create: `ki-handwerk/.env.example`
- Create: `ki-handwerk/.gitignore`

- [ ] **Step 1: Projektordner erstellen**

```bash
mkdir -p /root/ki-handwerk
cd /root/ki-handwerk
git init
```

- [ ] **Step 2: .gitignore erstellen**

```gitignore
.env
node_modules/
.next/
volumes/
```

- [ ] **Step 3: .env.example erstellen**

```env
# Supabase
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=http://localhost:8000
SITE_URL=http://localhost:3000

# N8N
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-n8n-password
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678

# SMTP (fuer spaeter)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

- [ ] **Step 4: docker-compose.yml erstellen**

```yaml
version: "3.8"

services:
  # --- Supabase ---
  supabase-db:
    image: supabase/postgres:15.1.1.78
    container_name: ki-handwerk-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d

  supabase-auth:
    image: supabase/gotrue:v2.151.0
    container_name: ki-handwerk-auth
    restart: unless-stopped
    depends_on:
      - supabase-db
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${SUPABASE_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"

  supabase-rest:
    image: postgrest/postgrest:v12.0.1
    container_name: ki-handwerk-rest
    restart: unless-stopped
    depends_on:
      - supabase-db
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"

  supabase-kong:
    image: kong:2.8.1
    container_name: ki-handwerk-kong
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
    volumes:
      - ./supabase/kong.yml:/var/lib/kong/kong.yml

  supabase-storage:
    image: supabase/storage-api:v0.43.11
    container_name: ki-handwerk-storage
    restart: unless-stopped
    depends_on:
      - supabase-db
      - supabase-rest
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://supabase-rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@supabase-db:5432/postgres
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      FILE_SIZE_LIMIT: 52428800
    volumes:
      - storage-data:/var/lib/storage

  # --- N8N ---
  n8n:
    image: n8nio/n8n:latest
    container_name: ki-handwerk-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=${N8N_PROTOCOL}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=supabase-db
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - n8n-data:/home/node/.n8n
    depends_on:
      - supabase-db

  # --- Frontend ---
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ki-handwerk-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
    depends_on:
      - supabase-kong

volumes:
  db-data:
  storage-data:
  n8n-data:
```

- [ ] **Step 5: .env aus .env.example erstellen und Werte setzen**

```bash
cp .env.example .env
# Generiere sichere Werte:
openssl rand -base64 32  # fuer POSTGRES_PASSWORD
openssl rand -base64 32  # fuer JWT_SECRET
# ANON_KEY und SERVICE_ROLE_KEY muessen als JWT generiert werden
# Siehe: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
```

- [ ] **Step 6: Docker Compose starten und pruefen**

```bash
docker compose up -d
docker compose ps
```

Erwartet: Alle Services laufen (supabase-db, supabase-auth, supabase-rest, supabase-kong, supabase-storage, n8n). Frontend schlaegt fehl (Dockerfile fehlt noch — kommt in Task 3).

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat: Docker Compose Setup mit Supabase, N8N und Frontend-Service"
```

---

## Task 2: Datenbank-Schema (Migrations)

**Files:**
- Create: `ki-handwerk/supabase/migrations/001_profiles.sql`
- Create: `ki-handwerk/supabase/migrations/002_customers.sql`
- Create: `ki-handwerk/supabase/migrations/003_quotes.sql`
- Create: `ki-handwerk/supabase/migrations/004_invoices.sql`
- Create: `ki-handwerk/supabase/migrations/005_rls_policies.sql`

- [ ] **Step 1: 001_profiles.sql erstellen — Firmenprofile**

```sql
-- Firmenprofil: wird nach Registrierung im Onboarding ausgefuellt
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL DEFAULT '',
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    zip_code TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    bank_name TEXT DEFAULT '',
    iban TEXT DEFAULT '',
    bic TEXT DEFAULT '',
    tax_number TEXT DEFAULT '',          -- Steuernummer
    vat_id TEXT DEFAULT '',              -- Umsatzsteuer-ID (leer bei Kleinunternehmer)
    is_kleinunternehmer BOOLEAN NOT NULL DEFAULT false,
    logo_url TEXT DEFAULT '',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: 002_customers.sql erstellen — Kunden**

```sql
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT '',
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    zip_code TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_name ON public.customers(user_id, last_name, first_name);

CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: 003_quotes.sql erstellen — Angebote**

```sql
-- Nummernkreis fuer Angebote
CREATE SEQUENCE public.quote_number_seq START 1;

CREATE TYPE public.quote_status AS ENUM (
    'draft',      -- Entwurf
    'sent',       -- Versendet
    'accepted',   -- Angenommen
    'rejected'    -- Abgelehnt
);

CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    quote_number TEXT NOT NULL,
    status public.quote_status NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    subtotal_net NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
    vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_kleinunternehmer BOOLEAN NOT NULL DEFAULT false,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_quotes_number ON public.quotes(user_id, quote_number);
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);

CREATE TABLE public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'Stk',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);

-- Funktion: Naechste Angebotsnummer fuer einen User
CREATE OR REPLACE FUNCTION public.next_quote_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(REGEXP_REPLACE(quote_number, '[^0-9]', '', 'g') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.quotes
    WHERE user_id = p_user_id;

    RETURN 'A-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: 004_invoices.sql erstellen — Rechnungen**

```sql
CREATE TYPE public.invoice_status AS ENUM (
    'open',       -- Offen
    'paid',       -- Bezahlt
    'overdue'     -- Ueberfaellig
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'open',
    title TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    subtotal_net NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
    vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_kleinunternehmer BOOLEAN NOT NULL DEFAULT false,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    pdf_url TEXT DEFAULT '',
    is_locked BOOLEAN NOT NULL DEFAULT true,  -- Rechnungen sind immer gesperrt
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invoices_number ON public.invoices(user_id, invoice_number);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(user_id, status);

CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'Stk',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Funktion: Naechste Rechnungsnummer fuer einen User (lueckenlos)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM public.invoices
    WHERE user_id = p_user_id;

    RETURN 'R-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Schutz: Rechnungen koennen nicht geaendert werden (ausser Zahlungsstatus)
CREATE OR REPLACE FUNCTION public.protect_locked_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = true THEN
        -- Nur Zahlungsstatus-Aenderungen erlauben
        IF NEW.status IS DISTINCT FROM OLD.status
           OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
            NEW.title = OLD.title;
            NEW.notes = OLD.notes;
            NEW.subtotal_net = OLD.subtotal_net;
            NEW.vat_rate = OLD.vat_rate;
            NEW.vat_amount = OLD.vat_amount;
            NEW.total_gross = OLD.total_gross;
            NEW.invoice_number = OLD.invoice_number;
            NEW.invoice_date = OLD.invoice_date;
            NEW.customer_id = OLD.customer_id;
            NEW.is_kleinunternehmer = OLD.is_kleinunternehmer;
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Rechnungen koennen nach Erstellung nicht geaendert werden';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_protect_locked
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.protect_locked_invoice();

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 5: 005_rls_policies.sql erstellen — Row Level Security**

```sql
-- RLS aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Nur eigenes Profil
CREATE POLICY profiles_select ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Customers: Nur eigene Kunden
CREATE POLICY customers_select ON public.customers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY customers_insert ON public.customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY customers_update ON public.customers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY customers_delete ON public.customers
    FOR DELETE USING (auth.uid() = user_id);

-- Quotes: Nur eigene Angebote
CREATE POLICY quotes_select ON public.quotes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quotes_insert ON public.quotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quotes_update ON public.quotes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY quotes_delete ON public.quotes
    FOR DELETE USING (auth.uid() = user_id);

-- Quote Items: Ueber Quote-Zugehoerigkeit
CREATE POLICY quote_items_select ON public.quote_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
    );
CREATE POLICY quote_items_insert ON public.quote_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
    );
CREATE POLICY quote_items_update ON public.quote_items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
    );
CREATE POLICY quote_items_delete ON public.quote_items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid())
    );

-- Invoices: Nur eigene Rechnungen
CREATE POLICY invoices_select ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY invoices_insert ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY invoices_update ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

-- Invoice Items: Ueber Invoice-Zugehoerigkeit
CREATE POLICY invoice_items_select ON public.invoice_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
    );
CREATE POLICY invoice_items_insert ON public.invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
    );
```

- [ ] **Step 6: Migrations testen**

```bash
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/001_profiles.sql
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/002_customers.sql
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/003_quotes.sql
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/004_invoices.sql
docker compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/005_rls_policies.sql
```

Erwartet: Keine Fehler. Tabellen mit `\dt public.*` pruefen.

- [ ] **Step 7: Schema verifizieren**

```bash
docker compose exec supabase-db psql -U postgres -d postgres -c "\dt public.*"
```

Erwartet:
```
 Schema |     Name      | Type  |  Owner
--------+---------------+-------+----------
 public | profiles      | table | postgres
 public | customers     | table | postgres
 public | quotes        | table | postgres
 public | quote_items   | table | postgres
 public | invoices      | table | postgres
 public | invoice_items | table | postgres
```

- [ ] **Step 8: Commit**

```bash
git add supabase/
git commit -m "feat: Datenbank-Schema mit Profiles, Customers, Quotes, Invoices und RLS"
```

---

## Task 3: Next.js Projekt Setup

**Files:**
- Create: `ki-handwerk/frontend/package.json`
- Create: `ki-handwerk/frontend/Dockerfile`
- Create: `ki-handwerk/frontend/next.config.js`
- Create: `ki-handwerk/frontend/tailwind.config.ts`
- Create: `ki-handwerk/frontend/tsconfig.json`
- Create: `ki-handwerk/frontend/src/app/layout.tsx`
- Create: `ki-handwerk/frontend/src/app/page.tsx`
- Create: `ki-handwerk/frontend/src/lib/supabase/client.ts`
- Create: `ki-handwerk/frontend/src/lib/supabase/server.ts`

- [ ] **Step 1: Next.js Projekt erstellen**

```bash
cd /root/ki-handwerk
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: shadcn/ui initialisieren**

```bash
cd frontend
npx shadcn@latest init -d
```

Waehle: New York Style, Zinc als Basisfarbe, CSS Variables.

- [ ] **Step 3: shadcn/ui Basis-Komponenten installieren**

```bash
npx shadcn@latest add button card input label form toast separator avatar dropdown-menu sheet
```

- [ ] **Step 4: Supabase Client-Library installieren**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 5: Supabase Browser-Client erstellen**

Datei: `frontend/src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 6: Supabase Server-Client erstellen**

Datei: `frontend/src/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignorieren
          }
        },
      },
    }
  );
}
```

- [ ] **Step 7: Middleware fuer Auth-Guard erstellen**

Datei: `frontend/middleware.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht eingeloggt und nicht auf Login/Register → Redirect
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  if (!user && !isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Eingeloggt aber Onboarding nicht abgeschlossen → Redirect
  if (user && !isAuthPage && request.nextUrl.pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile && !profile.onboarding_completed && request.nextUrl.pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 8: Dockerfile erstellen**

Datei: `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 9: next.config.js fuer standalone output anpassen**

Datei: `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

- [ ] **Step 10: Lokal testen**

```bash
cd frontend
npm run dev
```

Erwartet: Next.js startet auf http://localhost:3000 ohne Fehler.

- [ ] **Step 11: Commit**

```bash
cd /root/ki-handwerk
git add frontend/
git commit -m "feat: Next.js Projekt mit Supabase Client, Auth Middleware und Docker"
```

---

## Task 4: Login & Registrierung

**Files:**
- Create: `ki-handwerk/frontend/src/app/login/page.tsx`
- Create: `ki-handwerk/frontend/src/app/register/page.tsx`
- Create: `ki-handwerk/frontend/src/app/page.tsx` (modify)

- [ ] **Step 1: Login-Seite erstellen**

Datei: `frontend/src/app/login/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email oder Passwort falsch.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">KI Handwerk</CardTitle>
          <CardDescription>Melde dich an um fortzufahren</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Registrierungs-Seite erstellen**

Datei: `frontend/src/app/register/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== passwordConfirm) {
      setError("Passwoerter stimmen nicht ueberein.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Konto erstellen</CardTitle>
          <CardDescription>Starte jetzt mit KI Handwerk</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mit der Registrierung stimmst du der Verarbeitung deiner Daten gemaess unserer Datenschutzerklaerung zu.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrieren..." : "Kostenlos registrieren"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Schon ein Konto?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Root-Page als Redirect einrichten**

Datei: `frontend/src/app/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

- [ ] **Step 4: Testen — Login und Register Seiten laden**

```bash
cd frontend && npm run dev
# Browser: http://localhost:3000/login → Login-Formular sichtbar
# Browser: http://localhost:3000/register → Register-Formular sichtbar
```

- [ ] **Step 5: Commit**

```bash
cd /root/ki-handwerk
git add frontend/src/app/login/ frontend/src/app/register/ frontend/src/app/page.tsx
git commit -m "feat: Login und Registrierung mit Supabase Auth"
```

---

## Task 5: Onboarding (Firmendaten)

**Files:**
- Create: `ki-handwerk/frontend/src/app/onboarding/page.tsx`

- [ ] **Step 1: Onboarding-Seite erstellen**

Datei: `frontend/src/app/onboarding/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isKleinunternehmer, setIsKleinunternehmer] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    street: "",
    zip_code: "",
    city: "",
    phone: "",
    bank_name: "",
    iban: "",
    bic: "",
    tax_number: "",
    vat_id: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Nicht eingeloggt.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        ...form,
        is_kleinunternehmer: isKleinunternehmer,
        vat_id: isKleinunternehmer ? "" : form.vat_id,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Willkommen bei KI Handwerk</CardTitle>
          <CardDescription>
            Hinterlege deine Firmendaten um loszulegen. Diese erscheinen auf deinen Angeboten und Rechnungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Firmendaten */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Firmendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="company_name">Firmenname *</Label>
                  <Input id="company_name" name="company_name" value={form.company_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <Separator />

            {/* Adresse */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Adresse</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="street">Strasse und Hausnummer *</Label>
                  <Input id="street" name="street" value={form.street} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">PLZ *</Label>
                  <Input id="zip_code" name="zip_code" value={form.zip_code} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ort *</Label>
                  <Input id="city" name="city" value={form.city} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <Separator />

            {/* Bankdaten */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Bankverbindung</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="bank_name">Bank</Label>
                  <Input id="bank_name" name="bank_name" value={form.bank_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input id="iban" name="iban" value={form.iban} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC</Label>
                  <Input id="bic" name="bic" value={form.bic} onChange={handleChange} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Steuerdaten */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Steuerdaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Steuernummer</Label>
                  <Input id="tax_number" name="tax_number" value={form.tax_number} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="md:col-span-2 flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_kleinunternehmer"
                    checked={isKleinunternehmer}
                    onChange={(e) => setIsKleinunternehmer(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_kleinunternehmer">
                    Ich bin Kleinunternehmer (keine Umsatzsteuer gemaess §19 UStG)
                  </Label>
                </div>
                {!isKleinunternehmer && (
                  <div className="space-y-2">
                    <Label htmlFor="vat_id">Umsatzsteuer-ID</Label>
                    <Input id="vat_id" name="vat_id" value={form.vat_id} onChange={handleChange} />
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Speichern..." : "Firmenprofil speichern und loslegen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Testen — Onboarding-Seite laden**

```bash
# Browser: http://localhost:3000/onboarding
# Formular mit allen Feldern sichtbar
# Kleinunternehmer-Checkbox blendet USt-ID Feld aus/ein
```

- [ ] **Step 3: Commit**

```bash
cd /root/ki-handwerk
git add frontend/src/app/onboarding/
git commit -m "feat: Onboarding-Seite mit Firmendaten, Bankdaten und Kleinunternehmer-Flag"
```

---

## Task 6: Dashboard Layout (Grundgeruest)

**Files:**
- Create: `ki-handwerk/frontend/src/app/dashboard/layout.tsx`
- Create: `ki-handwerk/frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Dashboard Layout mit Sidebar erstellen**

Datei: `frontend/src/app/dashboard/layout.tsx`

```typescript
"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const navItems = [
  { label: "Uebersicht", href: "/dashboard" },
  { label: "Angebote", href: "/dashboard/quotes" },
  { label: "Rechnungen", href: "/dashboard/invoices" },
  { label: "Kunden", href: "/dashboard/customers" },
  { label: "Berichte", href: "/dashboard/reports" },
  { label: "KI-Agent", href: "/dashboard/voice" },
  { label: "Profil", href: "/dashboard/profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">KI Handwerk</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-bold">KI Handwerk</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Abmelden
          </Button>
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around py-2 z-50">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs text-center px-2 py-1 ${
                pathname === item.href ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Dashboard Startseite (Platzhalter)**

Datei: `frontend/src/app/dashboard/page.tsx`

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, first_name, last_name")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">
        Willkommen{profile?.company_name ? `, ${profile.company_name}` : ""}
      </h2>
      <p className="text-muted-foreground mb-8">
        Hier siehst du bald deine Uebersicht mit Angeboten, Rechnungen und Kennzahlen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Angebote</p>
        </div>
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Rechnungen</p>
        </div>
        <div className="bg-card border rounded-lg p-6 text-center">
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground">Kunden</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Testen — Dashboard Layout**

```bash
# Browser: http://localhost:3000/dashboard
# Sidebar mit Navigation sichtbar (Desktop)
# Bottom Nav sichtbar (Mobile/schmal)
# Willkommen-Text und 3 Kennzahlen-Karten sichtbar
```

- [ ] **Step 4: Commit**

```bash
cd /root/ki-handwerk
git add frontend/src/app/dashboard/
git commit -m "feat: Dashboard Layout mit Sidebar, Mobile Nav und Startseite"
```

---

## Task 7: End-to-End Test — Kompletter Flow

- [ ] **Step 1: Docker Compose komplett hochfahren**

```bash
cd /root/ki-handwerk
docker compose up -d --build
docker compose ps
```

Erwartet: Alle Services laufen.

- [ ] **Step 2: Registrierung testen**

```
Browser: http://localhost:3000/register
→ Email und Passwort eingeben
→ Weiterleitung zu /onboarding
```

- [ ] **Step 3: Onboarding testen**

```
→ Firmendaten ausfuellen
→ Kleinunternehmer an/aus testen
→ "Speichern und loslegen" klicken
→ Weiterleitung zu /dashboard
```

- [ ] **Step 4: Dashboard testen**

```
→ Firmenname im Willkommen-Text sichtbar
→ Navigation funktioniert
→ Logout → Redirect zu /login
→ Login mit gleichen Daten → Dashboard
```

- [ ] **Step 5: RLS testen**

```bash
# Zweiten User registrieren
# Pruefen: User A sieht keine Daten von User B
docker compose exec supabase-db psql -U postgres -d postgres -c "SELECT id, company_name FROM profiles;"
```

- [ ] **Step 6: Commit — Phase A abgeschlossen**

```bash
cd /root/ki-handwerk
git add -A
git commit -m "feat: Phase A komplett — Infrastruktur, DB-Schema, Auth, Onboarding, Dashboard-Grundgeruest"
```

---

## Zusammenfassung

| Task | Was | Ergebnis |
|------|-----|----------|
| 1 | Docker Compose | Supabase + N8N + Next.js laufen |
| 2 | DB-Schema | 6 Tabellen mit RLS, Nummernkreise, Rechnungsschutz |
| 3 | Next.js Setup | Projekt mit shadcn/ui, Supabase Client, Auth Middleware |
| 4 | Login/Register | Anmeldung und Registrierung funktionieren |
| 5 | Onboarding | Firmendaten inkl. Kleinunternehmer-Flag |
| 6 | Dashboard | Layout mit Sidebar/Mobile Nav, Startseite mit Platzhaltern |
| 7 | E2E Test | Kompletter Flow von Registrierung bis Dashboard |

**Naechster Plan:** Phase B — MVP (Voice-KI Agent, Angebotserstellung, Kundenverwaltung)
