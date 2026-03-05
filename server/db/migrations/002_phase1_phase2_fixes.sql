-- Phase 1 + Phase 2 non-destructive schema fixes.
-- Safe to run on an existing database; all statements are idempotent.

-- Fix self-contradicting FK on module_requests.requested_by.
-- A NOT NULL column cannot be set to NULL on delete; use CASCADE instead.
ALTER TABLE module_requests
  DROP CONSTRAINT IF EXISTS module_requests_requested_by_fkey;
ALTER TABLE module_requests
  ADD CONSTRAINT module_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE;

-- Add missing net_amount and advance_amount columns to fee_invoices.
ALTER TABLE fee_invoices
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE fee_invoices
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill net_amount for existing invoices.
UPDATE fee_invoices
SET net_amount = total_amount - concession_amount + fine_amount
WHERE net_amount = 0 AND (total_amount <> 0 OR concession_amount <> 0 OR fine_amount <> 0);

-- Add missing shelf_location column to books.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(100) DEFAULT '';

-- Add missing hostel_visitors table.
CREATE TABLE IF NOT EXISTS hostel_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES hostel_rooms(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES hostel_room_beds(id) ON DELETE SET NULL,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(50) DEFAULT '',
  visitor_relation VARCHAR(100) DEFAULT '',
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  purpose TEXT DEFAULT '',
  visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_date TIMESTAMP DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hostel_visitors_hostel_id ON hostel_visitors(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_visitors_school_id ON hostel_visitors(school_id);
CREATE INDEX IF NOT EXISTS idx_hostel_visitors_status ON hostel_visitors(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_hostel_visitors_updated_at'
  ) THEN
    CREATE TRIGGER trg_hostel_visitors_updated_at
      BEFORE UPDATE ON hostel_visitors
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Per-school sequences for invoice and receipt numbering to prevent races.
CREATE SEQUENCE IF NOT EXISTS invoice_no_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS receipt_no_seq START 1000;

-- Backfill existing invoice numbers that are purely numeric so the sequence
-- continues above the maximum used value. Non-numeric prefixes remain as-is.
DO $$
DECLARE
  max_invoice BIGINT;
  max_receipt BIGINT;
BEGIN
  SELECT MAX(NULLIF(regexp_replace(invoice_no, '[^0-9]', '', 'g'), '')::BIGINT)
  INTO max_invoice
  FROM fee_invoices
  WHERE invoice_no ~ '^[0-9]+$';

  SELECT MAX(NULLIF(regexp_replace(receipt_no, '[^0-9]', '', 'g'), '')::BIGINT)
  INTO max_receipt
  FROM fee_payments
  WHERE receipt_no ~ '^[0-9]+$';

  IF max_invoice IS NOT NULL THEN
    PERFORM setval('invoice_no_seq', GREATEST(max_invoice, 1000));
  END IF;

  IF max_receipt IS NOT NULL THEN
    PERFORM setval('receipt_no_seq', GREATEST(max_receipt, 1000));
  END IF;
END $$;
