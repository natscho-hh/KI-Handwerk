ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY customers_select ON public.customers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY customers_insert ON public.customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY customers_update ON public.customers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY customers_delete ON public.customers
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY quotes_select ON public.quotes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quotes_insert ON public.quotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quotes_update ON public.quotes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY quotes_delete ON public.quotes
    FOR DELETE USING (auth.uid() = user_id);

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

CREATE POLICY invoices_select ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY invoices_insert ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY invoices_update ON public.invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY invoice_items_select ON public.invoice_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
    );
CREATE POLICY invoice_items_insert ON public.invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
    );
