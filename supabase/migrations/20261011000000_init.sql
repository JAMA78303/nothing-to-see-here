-- Nothing To See Here: world visit counter, server-side rolls and sightings.
--
-- Every write goes through a security definer function. Tables are read-only
-- to clients (RLS select policies only), so visits, rolls and legendary
-- moments cannot be faked by editing the page.

-- ---------------------------------------------------------------------------
-- Tuning. One row. Change these in the SQL editor to test (e.g. milestone 20,
-- odds_boost 100) and put them back before launch.
-- ---------------------------------------------------------------------------
create table public.settings (
  id int primary key default 1 check (id = 1),
  milestone int not null default 50000 check (milestone > 0),
  odds_boost int not null default 1 check (odds_boost between 1 and 1000),
  visit_cooldown interval not null default interval '30 minutes',
  roll_cooldown interval not null default interval '25 seconds'
);
insert into public.settings default values;

create table public.world (
  id int primary key default 1 check (id = 1),
  visits bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.world default values;

create table public.visitors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  visits int not null default 0,
  last_visit_at timestamptz,
  last_roll_at timestamptz,
  created_at timestamptz not null default now()
);

-- Must match src/game/moments.ts
create table public.moments (
  id text primary key,
  tier text not null check (tier in ('small', 'big', 'legend', 'often', 'secret')),
  sort int not null
);
insert into public.moments (id, tier, sort) values
  ('grape', 'small', 1), ('pigeon', 'small', 2), ('sneeze', 'small', 3), ('shadow', 'small', 4),
  ('hello', 'small', 5), ('twin', 'small', 6), ('knock', 'small', 7), ('leave', 'small', 8),
  ('timer', 'small', 9), ('pressure', 'small', 10),
  ('ferrets', 'big', 1), ('backflip', 'big', 2), ('tux', 'big', 3), ('violin', 'big', 4), ('cake', 'big', 5),
  ('nesting', 'legend', 1), ('disco', 'legend', 2), ('ufo', 'legend', 3), ('confess', 'legend', 4),
  ('link', 'often', 1), ('video', 'often', 2),
  ('belt', 'secret', 1);

create table public.sightings (
  user_id uuid not null references auth.users (id) on delete cascade,
  moment_id text not null references public.moments (id),
  visit_number bigint,
  seen_at timestamptz not null default now(),
  primary key (user_id, moment_id)
);

-- "You're one of N people who've seen this", kept up to date by trigger.
create table public.moment_counts (
  moment_id text primary key references public.moments (id),
  witnesses int not null default 0
);
insert into public.moment_counts (moment_id) select id from public.moments;

create function public.bump_moment_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.moment_counts set witnesses = witnesses + 1 where moment_id = new.moment_id;
  return new;
end $$;

create trigger sightings_bump_count after insert on public.sightings
for each row execute function public.bump_moment_count();

-- ---------------------------------------------------------------------------
-- Row level security: clients can read, never write.
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.world enable row level security;
alter table public.visitors enable row level security;
alter table public.moments enable row level security;
alter table public.sightings enable row level security;
alter table public.moment_counts enable row level security;

create policy "settings are public" on public.settings for select to anon, authenticated using (true);
create policy "world is public" on public.world for select to anon, authenticated using (true);
create policy "moments are public" on public.moments for select to anon, authenticated using (true);
create policy "counts are public" on public.moment_counts for select to anon, authenticated using (true);
create policy "read own visitor row" on public.visitors for select to authenticated using (user_id = auth.uid());
create policy "read own sightings" on public.sightings for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- record_visit(): one visit per visitor per cooldown window. The world row
-- lock makes the increment atomic, so exactly one visitor gets each number
-- and whoever lands a multiple of the milestone gets the legendary moment.
-- ---------------------------------------------------------------------------
create function public.record_visit() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.settings;
  v public.visitors;
  n bigint;
  legend_count int;
  legend text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  select * into s from public.settings where id = 1;
  insert into public.visitors (user_id) values (uid) on conflict do nothing;
  select * into v from public.visitors where user_id = uid for update;

  if v.last_visit_at is not null and v.last_visit_at > now() - s.visit_cooldown then
    return jsonb_build_object(
      'counted', false,
      'world_visits', (select visits from public.world where id = 1),
      'my_visits', v.visits,
      'legendary', null,
      'visit_number', null
    );
  end if;

  update public.world set visits = visits + 1, updated_at = now() where id = 1 returning visits into n;
  update public.visitors set visits = visits + 1, last_visit_at = now() where user_id = uid returning * into v;

  if n % s.milestone = 0 then
    select count(*) into legend_count from public.moments where tier = 'legend';
    select id into legend from public.moments where tier = 'legend'
      order by sort offset ((n / s.milestone - 1) % legend_count) limit 1;
    insert into public.sightings (user_id, moment_id, visit_number) values (uid, legend, n)
      on conflict do nothing;
  end if;

  return jsonb_build_object(
    'counted', true,
    'world_visits', n,
    'my_visits', v.visits,
    'legendary', legend,
    'visit_number', case when legend is not null then n end
  );
end $$;

-- ---------------------------------------------------------------------------
-- roll_moment(): the client asks on arrival and every 30 seconds; the server
-- decides. At most one roll per visitor per roll_cooldown.
-- ---------------------------------------------------------------------------
create function public.roll_moment() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.settings;
  v public.visitors;
  r double precision := random();
  p_big double precision;
  p_small double precision;
  t text;
  pick text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  select * into s from public.settings where id = 1;
  select * into v from public.visitors where user_id = uid for update;
  if not found or (v.last_roll_at is not null and v.last_roll_at > now() - s.roll_cooldown) then
    return jsonb_build_object('moment', null);
  end if;
  update public.visitors set last_roll_at = now() where user_id = uid;

  p_big := s.odds_boost / 5000.0;
  p_small := s.odds_boost / 500.0;
  if r < p_big then
    t := 'big';
  elsif r < p_big + p_small then
    t := 'small';
  else
    return jsonb_build_object('moment', null);
  end if;

  select id into pick from public.moments where tier = t order by random() limit 1;
  insert into public.sightings (user_id, moment_id) values (uid, pick) on conflict do nothing;
  return jsonb_build_object('moment', pick);
end $$;

-- ---------------------------------------------------------------------------
-- record_sighting(): only for moments the client legitimately decides
-- (links he sends, secrets you find). Rare tiers are refused.
-- ---------------------------------------------------------------------------
create function public.record_sighting(p_moment text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.moments where id = p_moment and tier in ('often', 'secret')) then
    raise exception 'moment % cannot be recorded by the client', p_moment;
  end if;
  insert into public.sightings (user_id, moment_id) values (auth.uid(), p_moment) on conflict do nothing;
end $$;

revoke execute on function public.record_visit() from public, anon;
revoke execute on function public.roll_moment() from public, anon;
revoke execute on function public.record_sighting(text) from public, anon;
revoke execute on function public.bump_moment_count() from public, anon, authenticated;
grant execute on function public.record_visit() to authenticated;
grant execute on function public.roll_moment() to authenticated;
grant execute on function public.record_sighting(text) to authenticated;

-- Live world counter.
alter publication supabase_realtime add table public.world;
