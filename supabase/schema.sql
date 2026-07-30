-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 실행하세요.
-- (Supabase 대시보드 > SQL Editor > New query > 붙여넣기 > Run)

create table if not exists weight_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric not null,
  memo text,
  exercise boolean not null default false,
  drink boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table weight_records enable row level security;

create policy "Users can view own records"
  on weight_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own records"
  on weight_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own records"
  on weight_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own records"
  on weight_records for delete
  using (auth.uid() = user_id);
