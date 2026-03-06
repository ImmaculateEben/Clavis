-- ============================================
-- Clavis Security Hardening
-- ============================================

-- Ensure exam creator is tied to the authenticated user by default.
alter table public.exams
  alter column created_by set default auth.uid();

drop policy if exists "Teachers/admins can create exams" on public.exams;

create policy "Teachers/admins can create own exams"
  on public.exams for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'teacher')
    )
  );

drop policy if exists "Teachers/admins can update their exams" on public.exams;

create policy "Teachers/admins can update their exams"
  on public.exams for update
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- Remove direct profile updates to block self role-escalation.
drop policy if exists "Users can update their own profile" on public.profiles;

-- Harden signup profile creation: only allow student/teacher self-selection.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    case
      when requested_role in ('student', 'teacher') then requested_role
      else 'student'
    end
  );

  return new;
end;
$$;

-- Students can only create attempts on active exams.
drop policy if exists "Students can create attempts" on public.exam_attempts;
drop policy if exists "Students can update own in-progress attempts" on public.exam_attempts;

create policy "Students can create attempts for active exams"
  on public.exam_attempts for insert
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.exams e
      where e.id = exam_id
        and e.status = 'active'
    )
  );

-- Prevent direct question table access during active attempts.
drop policy if exists "Students can view questions for active exams they are taking"
  on public.questions;

create policy "Students can view questions for completed attempts when results are enabled"
  on public.questions for select
  using (
    exists (
      select 1
      from public.exam_attempts ea
      join public.exams e on e.id = ea.exam_id
      where ea.exam_id = questions.exam_id
        and ea.student_id = auth.uid()
        and ea.status = 'completed'
        and e.show_results = true
    )
  );

-- Tighten answer writes to the student's own in-progress attempt and exam questions.
drop policy if exists "Students can insert answers" on public.answers;
drop policy if exists "Students can update own answers for in-progress attempts"
  on public.answers;

create policy "Students can insert answers for own in-progress attempt"
  on public.answers for insert
  with check (
    exists (
      select 1
      from public.exam_attempts ea
      join public.questions q on q.id = answers.question_id
      where ea.id = answers.attempt_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
        and q.exam_id = ea.exam_id
    )
    and coalesce(is_correct, false) = false
    and coalesce(points_earned, 0) = 0
  );

create policy "Students can update selected answers for own in-progress attempt"
  on public.answers for update
  using (
    exists (
      select 1
      from public.exam_attempts ea
      join public.questions q on q.id = answers.question_id
      where ea.id = answers.attempt_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
        and q.exam_id = ea.exam_id
    )
  )
  with check (
    exists (
      select 1
      from public.exam_attempts ea
      join public.questions q on q.id = answers.question_id
      where ea.id = answers.attempt_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
        and q.exam_id = ea.exam_id
    )
    and coalesce(is_correct, false) = false
    and coalesce(points_earned, 0) = 0
  );

-- Restrict and harden PIN generation to teachers/admins.
create or replace function public.generate_exam_pin()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_pin text;
  pin_exists boolean;
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('admin', 'teacher') then
    raise exception 'Only teachers/admins can generate exam PINs';
  end if;

  loop
    new_pin := lpad(floor(random() * 1000000)::text, 6, '0');
    select exists(select 1 from public.exams where pin = new_pin) into pin_exists;
    exit when not pin_exists;
  end loop;

  return new_pin;
end;
$$;

-- Restrict and harden grading to authorized users only.
create or replace function public.grade_attempt(attempt_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer := 0;
  earned numeric := 0;
  caller_id uuid := auth.uid();
  caller_role text;
  attempt_student_id uuid;
  attempt_status text;
  exam_owner_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  select ea.student_id, ea.status, e.created_by
  into attempt_student_id, attempt_status, exam_owner_id
  from public.exam_attempts ea
  join public.exams e on e.id = ea.exam_id
  where ea.id = attempt_uuid;

  if not found then
    raise exception 'Attempt not found';
  end if;

  select role into caller_role
  from public.profiles
  where id = caller_id;

  if caller_id <> attempt_student_id
     and caller_id <> exam_owner_id
     and caller_role <> 'admin' then
    raise exception 'Not authorized to grade this attempt';
  end if;

  if attempt_status <> 'in_progress' then
    raise exception 'Attempt is already finalized';
  end if;

  update public.answers a
  set
    is_correct = (a.selected_answer = q.correct_answer),
    points_earned = case when a.selected_answer = q.correct_answer then q.points else 0 end
  from public.questions q
  where a.question_id = q.id
    and a.attempt_id = attempt_uuid;

  select
    coalesce(sum(q.points), 0),
    coalesce(sum(case when a.selected_answer = q.correct_answer then q.points else 0 end), 0)
  into total, earned
  from public.answers a
  join public.questions q on q.id = a.question_id
  where a.attempt_id = attempt_uuid;

  update public.exam_attempts
  set
    score = case when total > 0 then round((earned::numeric / total::numeric) * 100, 2) else 0 end,
    total_points = total,
    completed_at = now(),
    status = 'completed'
  where id = attempt_uuid;
end;
$$;

-- Safe question retrieval for active attempts (no correct answer exposure).
create or replace function public.get_attempt_questions(attempt_uuid uuid)
returns table (
  id uuid,
  type text,
  text text,
  options jsonb,
  points integer,
  order_number integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_exam_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select ea.exam_id
  into attempt_exam_id
  from public.exam_attempts ea
  join public.exams e on e.id = ea.exam_id
  where ea.id = attempt_uuid
    and ea.student_id = auth.uid()
    and ea.status = 'in_progress'
    and e.status = 'active';

  if not found then
    raise exception 'Attempt not available';
  end if;

  return query
  select q.id, q.type, q.text, q.options, q.points, q.order_number
  from public.questions q
  where q.exam_id = attempt_exam_id
  order by q.order_number;
end;
$$;

-- Tighten function execute permissions.
revoke all on function public.generate_exam_pin() from public;
revoke all on function public.grade_attempt(uuid) from public;
revoke all on function public.get_attempt_questions(uuid) from public;

grant execute on function public.generate_exam_pin() to authenticated;
grant execute on function public.grade_attempt(uuid) to authenticated;
grant execute on function public.get_attempt_questions(uuid) to authenticated;
