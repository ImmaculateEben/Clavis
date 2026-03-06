-- ============================================
-- Clavis - Exam Management Platform
-- Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app data
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- EXAMS TABLE
-- ============================================
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.profiles(id) on delete cascade not null,
  duration_minutes integer not null default 30,
  pin text unique not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  shuffle_questions boolean not null default false,
  show_results boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  type text not null check (type in ('multiple_choice', 'true_false')),
  text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  points integer not null default 1,
  order_number integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- EXAM ATTEMPTS TABLE
-- Tracks student exam sessions
-- ============================================
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score numeric(5,2) default 0,
  total_points integer default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'timed_out')),
  created_at timestamptz not null default now(),
  unique(exam_id, student_id)
);

-- ============================================
-- ANSWERS TABLE
-- Individual question answers
-- ============================================
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.exam_attempts(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  selected_answer text,
  is_correct boolean default false,
  points_earned integer default 0,
  created_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.answers enable row level security;

-- PROFILES policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Allow insert during signup"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Teachers and admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'teacher')
    )
  );

-- EXAMS policies
create policy "Teachers/admins can create exams"
  on public.exams for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'teacher')
    )
  );

create policy "Teachers/admins can view their exams"
  on public.exams for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Teachers/admins can update their exams"
  on public.exams for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Teachers/admins can delete their exams"
  on public.exams for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Students can view active exams by PIN"
  on public.exams for select
  using (status = 'active');

-- QUESTIONS policies
create policy "Exam creators can manage questions"
  on public.questions for all
  using (
    exists (
      select 1 from public.exams
      where exams.id = questions.exam_id
      and (
        exams.created_by = auth.uid()
        or exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy "Students can view questions for active exams they are taking"
  on public.questions for select
  using (
    exists (
      select 1 from public.exam_attempts
      where exam_attempts.exam_id = questions.exam_id
      and exam_attempts.student_id = auth.uid()
      and exam_attempts.status = 'in_progress'
    )
  );

-- EXAM ATTEMPTS policies
create policy "Students can create attempts"
  on public.exam_attempts for insert
  with check (auth.uid() = student_id);

create policy "Students can view own attempts"
  on public.exam_attempts for select
  using (student_id = auth.uid());

create policy "Students can update own in-progress attempts"
  on public.exam_attempts for update
  using (student_id = auth.uid() and status = 'in_progress');

create policy "Teachers can view attempts for their exams"
  on public.exam_attempts for select
  using (
    exists (
      select 1 from public.exams
      where exams.id = exam_attempts.exam_id
      and exams.created_by = auth.uid()
    )
  );

-- ANSWERS policies
create policy "Students can insert answers"
  on public.answers for insert
  with check (
    exists (
      select 1 from public.exam_attempts
      where exam_attempts.id = answers.attempt_id
      and exam_attempts.student_id = auth.uid()
      and exam_attempts.status = 'in_progress'
    )
  );

create policy "Students can view own answers"
  on public.answers for select
  using (
    exists (
      select 1 from public.exam_attempts
      where exam_attempts.id = answers.attempt_id
      and exam_attempts.student_id = auth.uid()
    )
  );

create policy "Students can update own answers for in-progress attempts"
  on public.answers for update
  using (
    exists (
      select 1 from public.exam_attempts
      where exam_attempts.id = answers.attempt_id
      and exam_attempts.student_id = auth.uid()
      and exam_attempts.status = 'in_progress'
    )
  );

create policy "Teachers can view answers for their exams"
  on public.answers for select
  using (
    exists (
      select 1 from public.exam_attempts ea
      join public.exams e on e.id = ea.exam_id
      where ea.id = answers.attempt_id
      and e.created_by = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generate unique 6-digit PIN
create or replace function public.generate_exam_pin()
returns text as $$
declare
  new_pin text;
  pin_exists boolean;
begin
  loop
    new_pin := lpad(floor(random() * 1000000)::text, 6, '0');
    select exists(select 1 from public.exams where pin = new_pin) into pin_exists;
    exit when not pin_exists;
  end loop;
  return new_pin;
end;
$$ language plpgsql;

-- Auto-grade an attempt
create or replace function public.grade_attempt(attempt_uuid uuid)
returns void as $$
declare
  total integer := 0;
  earned numeric := 0;
begin
  -- Calculate scores
  update public.answers a
  set
    is_correct = (a.selected_answer = q.correct_answer),
    points_earned = case when a.selected_answer = q.correct_answer then q.points else 0 end
  from public.questions q
  where a.question_id = q.id
  and a.attempt_id = attempt_uuid;

  -- Get totals
  select
    coalesce(sum(q.points), 0),
    coalesce(sum(case when a.selected_answer = q.correct_answer then q.points else 0 end), 0)
  into total, earned
  from public.answers a
  join public.questions q on q.id = a.question_id
  where a.attempt_id = attempt_uuid;

  -- Update attempt
  update public.exam_attempts
  set
    score = case when total > 0 then round((earned::numeric / total::numeric) * 100, 2) else 0 end,
    total_points = total,
    completed_at = now(),
    status = 'completed'
  where id = attempt_uuid;
end;
$$ language plpgsql security definer;
