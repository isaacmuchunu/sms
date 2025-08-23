-- Non-destructive migration: add module_requests table and update default modules
-- Safe to run on an existing database.

-- Update the default for new schools so optional transport/hostel modules are disabled by default.
ALTER TABLE schools ALTER COLUMN modules SET DEFAULT '{"transport": false, "hostel": false, "library": true}'::jsonb;

-- Create module_requests table if it does not exist.
CREATE TABLE IF NOT EXISTS module_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  module VARCHAR(50) NOT NULL CHECK (module IN ('transport', 'hostel', 'library')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT DEFAULT '',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_module_requests_school_id ON module_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_module_requests_status ON module_requests(status);
CREATE INDEX IF NOT EXISTS idx_module_requests_school_module_status ON module_requests(school_id, module, status);

-- Trigger for updated_at (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_module_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_module_requests_updated_at
      BEFORE UPDATE ON module_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
