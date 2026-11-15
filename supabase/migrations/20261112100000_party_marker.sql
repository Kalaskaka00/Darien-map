CREATE TABLE IF NOT EXISTS public.darien_party_marker (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    history jsonb NOT NULL CHECK (
        jsonb_typeof(history) = 'array' AND
        jsonb_array_length(history) BETWEEN 1 AND 10
    ),
    history_index integer NOT NULL CHECK (history_index >= 0 AND history_index < jsonb_array_length(history)),
    lock_id text,
    lock_until timestamptz,
    CHECK ((lock_id IS NULL) = (lock_until IS NULL))
);

COMMENT ON TABLE public.darien_party_marker IS
    'Shared party location and its ten-entry undo/redo history. An expiring database lock coordinates simultaneous editors.';

INSERT INTO public.darien_party_marker (id, lat, lng, history, history_index)
VALUES (true, 529, 747, '[{"lat":529,"lng":747}]'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.darien_party_marker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read Darien party marker" ON public.darien_party_marker;
CREATE POLICY "Public can read Darien party marker"
    ON public.darien_party_marker
    FOR SELECT
    TO anon
    USING (true);

REVOKE ALL ON public.darien_party_marker FROM anon;
GRANT SELECT ON public.darien_party_marker TO anon;

CREATE OR REPLACE FUNCTION public.party_marker_acquire(p_lock_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changed integer;
BEGIN
    UPDATE public.darien_party_marker
    SET lock_id = p_lock_id,
        lock_until = clock_timestamp() + interval '30 seconds'
    WHERE id = true
      AND p_lock_id IS NOT NULL
      AND (lock_id IS NULL OR lock_until <= clock_timestamp() OR lock_id = p_lock_id);
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.party_marker_renew(p_lock_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changed integer;
BEGIN
    UPDATE public.darien_party_marker
    SET lock_until = clock_timestamp() + interval '30 seconds'
    WHERE id = true
      AND lock_id = p_lock_id
      AND lock_until > clock_timestamp();
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.party_marker_release(p_lock_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changed integer;
BEGIN
    UPDATE public.darien_party_marker
    SET lock_id = NULL,
        lock_until = NULL
    WHERE id = true
      AND lock_id = p_lock_id;
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.party_marker_finish(
    p_lock_id text,
    p_lat double precision,
    p_lng double precision
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    marker public.darien_party_marker%ROWTYPE;
    new_history jsonb;
BEGIN
    IF p_lat IS NULL OR p_lng IS NULL OR p_lat < 0 OR p_lat > 1058 OR p_lng < 0 OR p_lng > 1494 THEN
        RAISE EXCEPTION 'Party marker location is outside the map bounds.';
    END IF;

    SELECT * INTO marker
    FROM public.darien_party_marker
    WHERE id = true
      AND lock_id = p_lock_id
      AND lock_until > clock_timestamp()
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF marker.lat IS DISTINCT FROM p_lat OR marker.lng IS DISTINCT FROM p_lng THEN
        SELECT COALESCE(jsonb_agg(entry.value ORDER BY entry.ordinality), '[]'::jsonb)
        INTO new_history
        FROM jsonb_array_elements(marker.history) WITH ORDINALITY AS entry(value, ordinality)
        WHERE entry.ordinality <= marker.history_index + 1;

        new_history := new_history || jsonb_build_array(jsonb_build_object('lat', p_lat, 'lng', p_lng));
        SELECT COALESCE(jsonb_agg(entry.value ORDER BY entry.ordinality), '[]'::jsonb)
        INTO new_history
        FROM jsonb_array_elements(new_history) WITH ORDINALITY AS entry(value, ordinality)
        WHERE entry.ordinality > jsonb_array_length(new_history) - 10;

        UPDATE public.darien_party_marker
        SET lat = p_lat,
            lng = p_lng,
            history = new_history,
            history_index = jsonb_array_length(new_history) - 1,
            lock_id = NULL,
            lock_until = NULL
        WHERE id = true;
    ELSE
        UPDATE public.darien_party_marker
        SET lock_id = NULL,
            lock_until = NULL
        WHERE id = true;
    END IF;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.party_marker_navigate(p_lock_id text, p_direction integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    marker public.darien_party_marker%ROWTYPE;
    next_index integer;
BEGIN
    IF p_direction IS NULL OR p_direction NOT IN (-1, 1) THEN
        RAISE EXCEPTION 'Party marker history direction must be -1 or 1.';
    END IF;

    SELECT * INTO marker
    FROM public.darien_party_marker
    WHERE id = true
      AND lock_id = p_lock_id
      AND lock_until > clock_timestamp()
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    next_index := marker.history_index + p_direction;
    IF next_index < 0 OR next_index >= jsonb_array_length(marker.history) THEN
        RETURN false;
    END IF;

    UPDATE public.darien_party_marker
    SET lat = (history -> next_index ->> 'lat')::double precision,
        lng = (history -> next_index ->> 'lng')::double precision,
        history_index = next_index
    WHERE id = true;
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.party_marker_acquire(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.party_marker_renew(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.party_marker_release(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.party_marker_finish(text, double precision, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.party_marker_navigate(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.party_marker_acquire(text) TO anon;
GRANT EXECUTE ON FUNCTION public.party_marker_renew(text) TO anon;
GRANT EXECUTE ON FUNCTION public.party_marker_release(text) TO anon;
GRANT EXECUTE ON FUNCTION public.party_marker_finish(text, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.party_marker_navigate(text, integer) TO anon;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.darien_party_marker;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
