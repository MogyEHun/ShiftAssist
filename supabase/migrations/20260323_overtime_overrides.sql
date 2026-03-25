-- Túlóra override rendszer: személyre, telephelyre, állomásra szabható határok
create table if not exists overtime_overrides (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  entity_type         text not null check (entity_type in ('user', 'site', 'station')),
  entity_id           uuid not null,
  weekly_hour_warning int  not null check (weekly_hour_warning > 0),
  weekly_hour_max     int  not null check (weekly_hour_max > weekly_hour_warning),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (company_id, entity_type, entity_id)
);

create index if not exists overtime_overrides_company_idx
  on overtime_overrides (company_id, entity_type);

alter table overtime_overrides enable row level security;

create policy "overtime_overrides_select" on overtime_overrides
  for select using (company_id = get_user_company_id());

create policy "overtime_overrides_manage" on overtime_overrides
  for all using (
    company_id = get_user_company_id()
    and get_user_role() in ('owner', 'admin')
  );

-- QR token frissítési idő rögzítése
alter table companies
  add column if not exists clock_token_issued_at timestamptz default now();

update companies set clock_token_issued_at = now() where clock_token_issued_at is null;
