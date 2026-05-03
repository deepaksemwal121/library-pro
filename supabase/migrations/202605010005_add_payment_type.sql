-- Add payment_type column to payment_history table to categorize payments
alter table public.payment_history
add column if not exists payment_type text not null default 'Monthly Fee' check (payment_type in ('Registration Fee', 'Monthly Fee', 'Locker Security', 'Other'));

-- Create index for faster queries by payment type
create index if not exists payment_history_payment_type_idx
  on public.payment_history (payment_type);

-- Add comment for clarity
comment on column public.payment_history.payment_type is 'Type of payment: Registration Fee, Monthly Fee, Locker Security, or Other';
