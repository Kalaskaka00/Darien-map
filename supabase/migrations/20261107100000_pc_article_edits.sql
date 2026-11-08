CREATE TABLE IF NOT EXISTS public.darien_pc_article_edits (
    article_file text PRIMARY KEY CHECK (article_file ~ '^PCs/[^/]+\.md$'),
    proposed_markdown text NOT NULL CHECK (char_length(proposed_markdown) BETWEEN 1 AND 1000000),
    base_markdown text NOT NULL CHECK (char_length(base_markdown) BETWEEN 1 AND 1000000),
    proposed_by text NOT NULL CHECK (proposed_by IN ('GM', 'Ludwig', 'Mallena', 'Rasmus')),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved'))
);

ALTER TABLE public.darien_pc_article_edits
    DROP CONSTRAINT IF EXISTS darien_pc_article_edits_proposed_by_check;
ALTER TABLE public.darien_pc_article_edits
    ADD CONSTRAINT darien_pc_article_edits_proposed_by_check
    CHECK (proposed_by IN ('GM', 'Ludwig', 'Mallena', 'Rasmus'));

COMMENT ON TABLE public.darien_pc_article_edits IS
    'Shared PC article revisions. Editor identity and approval are enforced in the app workflow only; this project has no authenticated user accounts.';

ALTER TABLE public.darien_pc_article_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read PC article edits" ON public.darien_pc_article_edits;
CREATE POLICY "Public can read PC article edits"
    ON public.darien_pc_article_edits
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Public can create PC article edits" ON public.darien_pc_article_edits;
CREATE POLICY "Public can create PC article edits"
    ON public.darien_pc_article_edits
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update PC article edits" ON public.darien_pc_article_edits;
CREATE POLICY "Public can update PC article edits"
    ON public.darien_pc_article_edits
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete PC article edits" ON public.darien_pc_article_edits;
CREATE POLICY "Public can delete PC article edits"
    ON public.darien_pc_article_edits
    FOR DELETE
    TO anon
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.darien_pc_article_edits TO anon;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.darien_pc_article_edits;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
