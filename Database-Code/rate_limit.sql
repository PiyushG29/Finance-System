-- Add per-user write rate limiting for financial records.
-- Buckets used to track request counts in rolling windows.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No direct client access required; block all table access from anon/authenticated roles.
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;

-- Enforce a rolling-window rate limit per bucket key.
-- Raises SQLSTATE 42900 when the limit is exceeded.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  _bucket_key TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF _bucket_key IS NULL OR _bucket_key = '' THEN
    RAISE EXCEPTION 'Rate limit bucket key is required';
  END IF;

  IF _max_requests <= 0 OR _window_seconds <= 0 THEN
    RAISE EXCEPTION 'Rate limit max requests and window must be > 0';
  END IF;
  INSERT INTO public.rate_limit_buckets (bucket_key, window_start, request_count, updated_at)
  VALUES (_bucket_key, now(), 1, now())
  ON CONFLICT (bucket_key)
  DO UPDATE SET
    request_count = CASE
      WHEN public.rate_limit_buckets.window_start <= now() - make_interval(secs => _window_seconds) THEN 1
      ELSE public.rate_limit_buckets.request_count + 1
    END,
    window_start = CASE
      WHEN public.rate_limit_buckets.window_start <= now() - make_interval(secs => _window_seconds) THEN now()
      ELSE public.rate_limit_buckets.window_start
    END,
    updated_at = now()
  RETURNING request_count INTO current_count;

  IF current_count > _max_requests THEN
    RAISE EXCEPTION 'Rate limit exceeded for %: max % requests per % seconds', _bucket_key, _max_requests, _window_seconds
      USING ERRCODE = '42900';
  END IF;
END;
$$;

-- Trigger function to throttle financial_records writes.
CREATE OR REPLACE FUNCTION public.rate_limit_financial_records_writes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  bucket TEXT;
BEGIN
  actor_id := auth.uid();

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;
  bucket := 'financial_records:write:' || actor_id::TEXT;

  -- 60 write operations per 60 seconds per authenticated user.
  PERFORM public.enforce_rate_limit(bucket, 60, 60);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_financial_records_writes ON public.financial_records;
CREATE TRIGGER rate_limit_financial_records_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_financial_records_writes();
