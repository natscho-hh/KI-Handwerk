CREATE TYPE public.invoice_status AS ENUM (
    'open',
    'paid',
    'overdue'
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
    is_locked BOOLEAN NOT NULL DEFAULT true,
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

CREATE OR REPLACE FUNCTION public.protect_locked_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = true THEN
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
