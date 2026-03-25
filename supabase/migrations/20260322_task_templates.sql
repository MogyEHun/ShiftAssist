-- Ismétlődő feladat sablonok (pl. "Napi nyitás", "Kassza zárás")
create table if not exists task_templates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  title        text not null,
  description  text,
  recurrence   text not null default 'daily' check (recurrence in ('daily', 'weekdays', 'weekly')),
  day_of_week  smallint,         -- 0=hétfő..6=vasárnap, csak weekly esetén
  is_active    boolean default true,
  created_by   uuid not null references users(id),
  created_at   timestamptz default now()
);

-- Napi elvégzés nyilvántartás (user, dátum, sablon)
create table if not exists task_template_completions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references task_templates(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  date         date not null,
  completed_at timestamptz default now(),
  unique (template_id, user_id, date)
);

alter table task_templates enable row level security;
alter table task_template_completions enable row level security;

-- Cég tagjai olvashatják a sablonjaikat
create policy "company members read templates"
  on task_templates for select
  using (company_id = (select company_id from users where id = auth.uid()));

-- Admin/manager kezeli
create policy "managers manage templates"
  on task_templates for all
  using (company_id = (select company_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('owner', 'admin', 'manager'));

-- Mindenki látja a saját befejezéseit
create policy "users read own completions"
  on task_template_completions for select
  using (user_id = auth.uid());

create policy "users insert own completions"
  on task_template_completions for insert
  with check (user_id = auth.uid());

-- Admin látja az összeset
create policy "managers read all completions"
  on task_template_completions for select
  using ((select role from users where id = auth.uid()) in ('owner', 'admin', 'manager'));
