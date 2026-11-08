ALTER TABLE public.darien_pc_article_edits
    RENAME TO darien_wiki_article_edits;

ALTER TABLE public.darien_wiki_article_edits
    DROP CONSTRAINT IF EXISTS darien_pc_article_edits_article_file_check;
ALTER TABLE public.darien_wiki_article_edits
    ADD CONSTRAINT darien_wiki_article_edits_article_file_check
    CHECK (
        article_file ~ '^[^/]+(/[^/]+)*\.md$' AND
        article_file !~ '(^|/)\.\.?(/|$)'
    );

ALTER TABLE public.darien_wiki_article_edits
    DROP CONSTRAINT IF EXISTS darien_pc_article_edits_proposed_by_check;
ALTER TABLE public.darien_wiki_article_edits
    ADD CONSTRAINT darien_wiki_article_edits_proposed_by_check
    CHECK (proposed_by IN ('GM', 'Ludwig', 'Mallena', 'Rasmus'));

DROP POLICY IF EXISTS "Public can read PC article edits" ON public.darien_wiki_article_edits;
CREATE POLICY "Public can read wiki article edits"
    ON public.darien_wiki_article_edits
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Public can create PC article edits" ON public.darien_wiki_article_edits;
CREATE POLICY "Public can create wiki article edits"
    ON public.darien_wiki_article_edits
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update PC article edits" ON public.darien_wiki_article_edits;
CREATE POLICY "Public can update wiki article edits"
    ON public.darien_wiki_article_edits
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete PC article edits" ON public.darien_wiki_article_edits;
CREATE POLICY "Public can delete wiki article edits"
    ON public.darien_wiki_article_edits
    FOR DELETE
    TO anon
    USING (true);

COMMENT ON TABLE public.darien_wiki_article_edits IS
    'Shared player PC and GM wiki article revisions. Identity and approval are enforced in the app workflow only; this project has no authenticated user accounts.';
