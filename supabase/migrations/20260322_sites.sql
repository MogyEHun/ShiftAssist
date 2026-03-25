-- ============================================================
-- Sites (Telephelyek) – nagyvállalati hierarchia
-- Egy cég több telephelyet kezel, managerek csak a saját site-jukat látják
-- ============================================================

create table sites (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,
  address    text,
  created_at timestamptz default now()
);

-- Users táblához site_id mező
alter table users
  add column site_id uuid references sites(id) on delete set null;

-- RLS
alter table sites enable row level security;

create policy "sites: company members can read"
  on sites for select
  using (company_id = get_user_company_id());

create policy "sites: owners and admins can insert"
  on sites for insert
  with check (company_id = get_user_company_id());

create policy "sites: owners and admins can update"
  on sites for update
  using (company_id = get_user_company_id());

create policy "sites: owners and admins can delete"
  on sites for delete
  using (company_id = get_user_company_id());
