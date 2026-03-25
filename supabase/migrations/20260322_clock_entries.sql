-- ============================================================
-- Jelenléti (Clock-in/out) rendszer
-- ============================================================

-- Stabil QR-token a céghez (nyomtatható, nem forgó)
alter table companies
  add column if not exists clock_token text unique default encode(gen_random_bytes(16), 'hex');

-- Meglévő cégeknek is generálunk tokent ha még nincs
update companies set clock_token = encode(gen_random_bytes(16), 'hex') where clock_token is null;

-- Jelenléti bejegyzések táblája
create table if not exists clock_entries (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  site_id      uuid references sites(id) on delete set null,
  clock_in_at  timestamptz not null default now(),
  clock_out_at timestamptz,
  created_at   timestamptz default now()
);

create index if not exists clock_entries_company_time_idx on clock_entries (company_id, clock_in_at desc);
create index if not exists clock_entries_user_time_idx    on clock_entries (user_id, clock_in_at desc);

-- RLS
alter table clock_entries enable row level security;

-- Dolgozók látják saját bejegyzéseiket
create policy "clock_entries_employee_own" on clock_entries
  for select using (user_id = auth.uid());

-- Manager/admin/owner látja a cég összes bejegyzését
create policy "clock_entries_manager_company" on clock_entries
  for select using (
    company_id in (
      select company_id from users
      where id = auth.uid() and role in ('owner', 'admin', 'manager')
    )
  );

-- Mindenki tud magának bejelentkezni
create policy "clock_entries_insert_own" on clock_entries
  for insert with check (user_id = auth.uid());

-- Mindenki tudja frissíteni saját nyitott bejegyzését (kijelentkezés)
create policy "clock_entries_update_own" on clock_entries
  for update using (user_id = auth.uid() and clock_out_at is null);
