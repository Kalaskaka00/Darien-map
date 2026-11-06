CREATE TABLE IF NOT EXISTS public.darien_map_pins (
    id text PRIMARY KEY,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
    visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
    owner_role text NOT NULL CHECK (owner_role IN ('gm', 'player', 'guest')),
    owner_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (owner_role = 'gm' AND owner_name = 'GM') OR
        (owner_role = 'player' AND owner_name IN ('Ludwig', 'Mallena', 'Rasmus')) OR
        (owner_role = 'guest' AND owner_name IS NULL)
    ),
    CHECK (visibility <> 'private' OR owner_role <> 'guest')
);

COMMENT ON TABLE public.darien_map_pins IS
    'Shared map pins. Visibility and editing permissions are enforced in the app UI only; this project has no authenticated user accounts.';

ALTER TABLE public.darien_map_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read Darien map pins" ON public.darien_map_pins;
CREATE POLICY "Public can read Darien map pins"
    ON public.darien_map_pins
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Public can create Darien map pins" ON public.darien_map_pins;
CREATE POLICY "Public can create Darien map pins"
    ON public.darien_map_pins
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update Darien map pins" ON public.darien_map_pins;
CREATE POLICY "Public can update Darien map pins"
    ON public.darien_map_pins
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete Darien map pins" ON public.darien_map_pins;
CREATE POLICY "Public can delete Darien map pins"
    ON public.darien_map_pins
    FOR DELETE
    TO anon
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.darien_map_pins TO anon;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.darien_map_pins;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
