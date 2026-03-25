alter table clock_entries
  add column if not exists lat_in  double precision,
  add column if not exists lon_in  double precision,
  add column if not exists lat_out double precision,
  add column if not exists lon_out double precision;
