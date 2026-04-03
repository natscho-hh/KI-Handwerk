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
