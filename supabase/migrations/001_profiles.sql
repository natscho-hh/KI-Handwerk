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
    tax_number TEXT DEFAULT '',
    vat_id TEXT DEFAULT '',
    is_kleinunternehmer BOOLEAN NOT NULL DEFAULT false,
    logo_url TEXT DEFAULT '',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
