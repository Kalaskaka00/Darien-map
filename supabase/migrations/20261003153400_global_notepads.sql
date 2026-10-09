CREATE TABLE IF NOT EXISTS public.darien_notepads (
    owner text PRIMARY KEY CHECK (owner IN ('GM', 'Party', 'Ludwig', 'Mallena', 'Rasmus')),
    state jsonb NOT NULL CHECK (
        jsonb_typeof(state) = 'object' AND
        jsonb_typeof(state -> 'notes') = 'array'
    ),
    backups jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(backups) = 'array'),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.darien_notepads IS
    'Publicly readable and writable campaign notebooks. No authentication is used; backups are for recovery, not access control.';

ALTER TABLE public.darien_notepads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read Darien notepads" ON public.darien_notepads;
CREATE POLICY "Public can read Darien notepads"
    ON public.darien_notepads
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Public can create Darien notepads" ON public.darien_notepads;
CREATE POLICY "Public can create Darien notepads"
    ON public.darien_notepads
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update Darien notepads" ON public.darien_notepads;
CREATE POLICY "Public can update Darien notepads"
    ON public.darien_notepads
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

REVOKE ALL ON public.darien_notepads FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.darien_notepads TO anon;
REVOKE DELETE ON public.darien_notepads FROM anon;

CREATE OR REPLACE FUNCTION public.backup_darien_notepad_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    latest_backup_ms bigint;
    backup_now_ms bigint;
BEGIN
    IF NEW.state IS DISTINCT FROM OLD.state THEN
        backup_now_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
        IF COALESCE(jsonb_typeof(NEW.backups), 'null') <> 'array' THEN
            NEW.backups := '[]'::jsonb;
        END IF;
        IF (NEW.backups -> 0 ->> 'createdAt') ~ '^[0-9]+$' THEN
            latest_backup_ms := (NEW.backups -> 0 ->> 'createdAt')::bigint;
        ELSE
            latest_backup_ms := NULL;
        END IF;

        IF latest_backup_ms IS NULL OR backup_now_ms - latest_backup_ms >= 30000 THEN
            NEW.backups := jsonb_build_array(jsonb_build_object(
                'createdAt', backup_now_ms,
                'state', OLD.state
            )) || COALESCE(NEW.backups, '[]'::jsonb);
        END IF;

        SELECT COALESCE(jsonb_agg(entry.value ORDER BY entry.ordinality), '[]'::jsonb)
        INTO NEW.backups
        FROM jsonb_array_elements(NEW.backups) WITH ORDINALITY AS entry(value, ordinality)
        WHERE entry.ordinality <= 20;
    END IF;

    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS darien_notepad_backup_before_update ON public.darien_notepads;
CREATE TRIGGER darien_notepad_backup_before_update
    BEFORE UPDATE ON public.darien_notepads
    FOR EACH ROW
    EXECUTE FUNCTION public.backup_darien_notepad_before_update();

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.darien_notepads;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
