-- ============================================================
-- Stations (Állomások/Pultok) – munkaállomás hozzárendelés műszakokhoz
-- ============================================================

create table stations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz default now()
);

-- Shifts táblához station_id mező
alter table shifts
  add column station_id uuid references stations(id) on delete set null;

-- RLS
alter table stations enable row level security;

create policy "stations: company members can read"
  on stations for select
  using (company_id = get_user_company_id());

create policy "stations: managers can insert"
  on stations for insert
  with check (company_id = get_user_company_id());

create policy "stations: managers can update"
  on stations for update
  using (company_id = get_user_company_id());

create policy "stations: managers can delete"
  on stations for delete
  using (company_id = get_user_company_id());
