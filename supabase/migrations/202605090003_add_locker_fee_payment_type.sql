alter table public.payment_history
  drop constraint if exists payment_history_payment_type_check;

alter table public.payment_history
  add constraint payment_history_payment_type_check
  check (payment_type in ('Registration Fee', 'Monthly Fee', 'Locker Security', 'Locker Fee', 'Other'));
r