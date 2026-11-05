-- APPLY. Moves K24001's recorded payments back one month so payment 1 is
-- 2024-08-22 (matching the note's first payment date) and payment n is
-- 2024-08-22 + (n - 1) months. Amounts are unchanged. Run the preview first.
begin;

update public.note_payments np
set payment_date = (date '2024-08-22' + (np.payment_number - 1) * interval '1 month')::date
from public.notes n
where n.id = np.note_id
  and n.note_id = 'K24001'
  and np.payment_number is not null;

-- Check: every K24001 payment now sits on its scheduled date (expect 0 rows).
select np.payment_number, np.payment_date
from public.note_payments np
join public.notes n on n.id = np.note_id
where n.note_id = 'K24001'
  and np.payment_date <> (date '2024-08-22' + (np.payment_number - 1) * interval '1 month')::date;

commit;
