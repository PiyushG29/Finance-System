# Database Schema Documentation

## Overview

This finance dashboard uses a PostgreSQL database with Row-Level Security (RLS) to enforce role-based access control.

## Enum Types

### `app_role`
- `viewer` — Can only view dashboard data and financial records
- `analyst` — Can view records and access summary analytics
- `admin` — Full CRUD access on records and user management

## Tables

### `profiles`
Auto-created on user signup via database trigger.

| Column       | Type                     | Nullable | Default            | Description                |
|-------------|--------------------------|----------|--------------------|----------------------------|
| id          | UUID (PK)                | No       | gen_random_uuid()  | Primary key                |
| user_id     | UUID (FK → auth.users)   | No       | —                  | Links to auth user         |
| display_name| TEXT                     | Yes      | —                  | User's display name        |
| email       | TEXT                     | Yes      | —                  | User's email               |
| status      | TEXT                     | No       | 'active'           | 'active' or 'inactive'     |
| created_at  | TIMESTAMPTZ              | No       | now()              | Creation timestamp         |
| updated_at  | TIMESTAMPTZ              | No       | now()              | Last update timestamp      |

### `user_roles`
Stores role assignments. New users automatically get the `viewer` role.

| Column      | Type                     | Nullable | Default            | Description                |
|------------|--------------------------|----------|--------------------|----------------------------|
| id         | UUID (PK)                | No       | gen_random_uuid()  | Primary key                |
| user_id    | UUID (FK → auth.users)   | No       | —                  | User receiving the role    |
| role       | app_role                 | No       | 'viewer'           | The assigned role          |
| assigned_by| UUID (FK → auth.users)   | Yes      | —                  | Admin who assigned role    |
| created_at | TIMESTAMPTZ              | No       | now()              | Assignment timestamp       |

**Constraint:** UNIQUE(user_id, role) — a user cannot have duplicate roles.

### `financial_records`
Stores all financial transactions. Supports soft delete via `deleted_at`.

| Column      | Type                     | Nullable | Default            | Description                |
|------------|--------------------------|----------|--------------------|----------------------------|
| id         | UUID (PK)                | No       | gen_random_uuid()  | Primary key                |
| user_id    | UUID (FK → auth.users)   | No       | —                  | Record creator             |
| amount     | NUMERIC(12,2)            | No       | —                  | Transaction amount         |
| type       | TEXT                     | No       | —                  | 'income' or 'expense'      |
| category   | TEXT                     | No       | 'uncategorized'    | Transaction category       |
| record_date| DATE                     | No       | CURRENT_DATE       | Date of transaction        |
| notes      | TEXT                     | Yes      | —                  | Optional description       |
| deleted_at | TIMESTAMPTZ              | Yes      | —                  | Soft delete timestamp      |
| created_at | TIMESTAMPTZ              | No       | now()              | Creation timestamp         |
| updated_at | TIMESTAMPTZ              | No       | now()              | Last update timestamp      |

**Check constraint:** type must be 'income' or 'expense'.

## Indexes

- `idx_financial_records_user_id` — Fast lookup by user
- `idx_financial_records_type` — Filter by income/expense
- `idx_financial_records_category` — Filter by category
- `idx_financial_records_record_date` — Date range queries
- `idx_financial_records_deleted_at` — Exclude soft-deleted records
- `idx_user_roles_user_id` — Fast role lookup

## Database Functions

### `has_role(user_id, role)` → boolean
Security definer function that checks if a user has a specific role. Used in RLS policies to avoid recursion.

### `get_user_role(user_id)` → app_role
Returns the highest-priority role for a user (admin > analyst > viewer).

### `get_dashboard_summary()` → JSON
Returns aggregated totals: total_income, total_expenses, net_balance, record_count.

### `get_category_summary()` → JSON
Returns totals grouped by category and type.

### `get_monthly_trends()` → JSON
Returns income, expenses, and net balance grouped by month (last 12 months).

### `get_recent_activity(limit_count)` → JSON
Returns the most recent financial records (default 10).

### `handle_new_user()` — Trigger Function
Auto-creates a profile and assigns the `viewer` role when a new user signs up.

## RLS Policies

### profiles
- Users can view their own profile
- Admins can view and update all profiles
- Users can update their own profile

### user_roles
- Users can view their own roles
- Admins can view, create, update, and delete all roles

### financial_records
- All authenticated users with a role can view non-deleted records
- Only admins can create, update, and delete records
- Soft-deleted records (deleted_at IS NOT NULL) are hidden from SELECT

## Triggers

- `update_profiles_updated_at` — Auto-updates `updated_at` on profile changes
- `update_financial_records_updated_at` — Auto-updates `updated_at` on record changes
- `on_auth_user_created` — Creates profile + viewer role on signup
