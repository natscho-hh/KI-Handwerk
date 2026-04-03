CREATE SEQUENCE public.quote_number_seq START 1;

CREATE TYPE public.quote_status AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected'
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
