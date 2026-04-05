import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  record_count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryData {
  category: string;
  type: string;
  total_amount: number;
  record_count: number;
}

export interface RecentRecord {
  id: string;
  amount: number;
  type: string;
  category: string;
  record_date: string;
  notes: string | null;
  created_at: string;
}

export interface DashboardBundle {
  summary: DashboardSummary;
  trends: MonthlyTrend[];
  categories: CategoryData[];
  recent: RecentRecord[];
}

export type FinancialRecord = Tables<"financial_records">;

export type AppRole = "viewer" | "analyst" | "admin";

export interface UserWithRole {
  user_id: string;
  username: string | null;
  email: string | null;
  status: "active" | "inactive";
  created_at: string;
  role: AppRole;
  role_id: string;
}

export interface RecordFilters {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  search?: string;
  date?: string;
}

export async function getDashboardBundle() {
  const [summaryRes, trendsRes, categoriesRes, recentRes] = await Promise.all([
    supabase.rpc("get_dashboard_summary"),
    supabase.rpc("get_monthly_trends"),
    supabase.rpc("get_category_summary"),
    supabase.rpc("get_recent_activity", { limit_count: 10 }),
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (trendsRes.error) throw trendsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (recentRes.error) throw recentRes.error;

  const summary = (summaryRes.data as DashboardSummary | null) ?? {
    total_income: 0,
    total_expenses: 0,
    net_balance: 0,
    record_count: 0,
  };

  return {
    summary,
    trends: (trendsRes.data as MonthlyTrend[] | null) ?? [],
    categories: (categoriesRes.data as CategoryData[] | null) ?? [],
    recent: (recentRes.data as RecentRecord[] | null) ?? [],
  } satisfies DashboardBundle;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: roleData, error: roleError } = await supabase.rpc("get_user_role", {
    _user_id: user.id,
  });
  if (roleError) throw roleError;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    user: { id: user.id, email: user.email },
    role: (roleData ?? "viewer") as AppRole,
    profile: {
      username: profile?.username ?? null,
    },
  };
}

export async function resolveLoginIdentifier(identifier: string) {
  const normalized = identifier.trim();
  if (!normalized) {
    return { email: null, username: null };
  }

  const { data, error } = await supabase.rpc("resolve_login_identifier", {
    identifier: normalized,
  });

  if (error) {
    if (normalized.includes("@")) {
      return { email: normalized, username: null };
    }
    return { email: null, username: normalized };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (row?.email) {
    return { email: row.email as string, username: (row.username as string | null) ?? normalized };
  }

  if (normalized.includes("@")) {
    return { email: normalized, username: null };
  }

  return { email: null, username: normalized };
}

export async function listRecords(filters: RecordFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, filters.limit ?? 15);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("financial_records")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("record_date", { ascending: false })
    .range(from, to);

  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.search?.trim()) query = query.ilike("notes", `%${filters.search.trim()}%`);
  if (filters.date) query = query.eq("record_date", filters.date);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    page,
    limit,
    total: count ?? 0,
    records: (data ?? []) as FinancialRecord[],
  };
}

export async function createRecord(input: {
  amount: number;
  type: string;
  category: string;
  record_date: string;
  notes?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("financial_records")
    .insert({
      user_id: user.id,
      amount: input.amount,
      type: input.type,
      category: input.category,
      record_date: input.record_date,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return { record: data as FinancialRecord };
}

export async function updateRecord(id: string, input: Partial<{
  amount: number;
  type: string;
  category: string;
  record_date: string;
  notes: string | null;
}>) {
  const { data, error } = await supabase
    .from("financial_records")
    .update(input)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw error;
  return { record: data as FinancialRecord };
}

export async function deleteRecord(id: string) {
  const { error } = await supabase
    .from("financial_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function listAdminUsers() {
  const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("user_roles").select("id, user_id, role, created_at"),
    supabase.from("profiles").select("user_id, username, email, status, created_at"),
  ]);

  if (rolesError) throw rolesError;
  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return (roles ?? []).map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      user_id: r.user_id,
      username: profile?.username ?? null,
      email: profile?.email ?? null,
      status: (profile?.status ?? "active") as "active" | "inactive",
      created_at: profile?.created_at ?? r.created_at,
      role: r.role as AppRole,
      role_id: r.id,
    } satisfies UserWithRole;
  });
}

export async function updateUserRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .update({ role })
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}

export async function updateUserStatus(userId: string, status: "active" | "inactive") {
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}
