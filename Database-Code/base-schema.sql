-- Create role enum
CREATE TYPE public.app_role AS ENUM ('viewer', 'analyst', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create financial_records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'uncategorized',
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_financial_records_user_id ON public.financial_records(user_id);
CREATE INDEX idx_financial_records_type ON public.financial_records(type);
CREATE INDEX idx_financial_records_category ON public.financial_records(category);
CREATE INDEX idx_financial_records_record_date ON public.financial_records(record_date);
CREATE INDEX idx_financial_records_deleted_at ON public.financial_records(deleted_at);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE UNIQUE INDEX idx_profiles_username_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Helper function: check if user has a specific role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'analyst' THEN 2 WHEN 'viewer' THEN 3 END
  LIMIT 1
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES RLS
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can assign roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- FINANCIAL_RECORDS RLS
CREATE POLICY "Authenticated users can view non-deleted records" ON public.financial_records
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'analyst')
      OR public.has_role(auth.uid(), 'viewer')
    )
  );

-- Keep write policies rerunnable by dropping known variants first.
DROP POLICY IF EXISTS "Admins can create records" ON public.financial_records;
DROP POLICY IF EXISTS "Admins and analysts can create records" ON public.financial_records;
DROP POLICY IF EXISTS "Admins can update non-deleted records" ON public.financial_records;
DROP POLICY IF EXISTS "Admins and analysts can update non-deleted records" ON public.financial_records;
DROP POLICY IF EXISTS "Admins can soft-delete records" ON public.financial_records;

CREATE POLICY "Admins and analysts can create records" ON public.financial_records
  FOR INSERT WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst'))
    AND auth.uid() = user_id
  );

CREATE POLICY "Admins and analysts can update non-deleted records" ON public.financial_records
  FOR UPDATE USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst'))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst'))
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can soft-delete records" ON public.financial_records
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Summary view: dashboard stats (accessible via RPC)
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check that user has a valid role
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst') OR
    public.has_role(auth.uid(), 'viewer')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'total_income', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    'total_expenses', COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    'net_balance', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0),
    'record_count', COUNT(*)
  ) INTO result
  FROM public.financial_records
  WHERE deleted_at IS NULL;

  RETURN result;
END;
$$;

-- Summary: category totals
CREATE OR REPLACE FUNCTION public.get_category_summary()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst') OR
    public.has_role(auth.uid(), 'viewer')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT category, type,
      SUM(amount) as total_amount,
      COUNT(*) as record_count
    FROM public.financial_records
    WHERE deleted_at IS NULL
    GROUP BY category, type
    ORDER BY total_amount DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Summary: monthly trends
CREATE OR REPLACE FUNCTION public.get_monthly_trends()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst') OR
    public.has_role(auth.uid(), 'viewer')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      TO_CHAR(record_date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
    FROM public.financial_records
    WHERE deleted_at IS NULL
    GROUP BY TO_CHAR(record_date, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Recent activity
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count INT DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst') OR
    public.has_role(auth.uid(), 'viewer')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT id, amount, type, category, record_date, notes, created_at
    FROM public.financial_records
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT limit_count
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
