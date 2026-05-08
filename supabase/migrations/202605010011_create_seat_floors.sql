-- Create seat_floors table to store floor configurations per library
CREATE TABLE IF NOT EXISTS seat_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  floor_name TEXT NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 40,
  price DECIMAL(10, 2) NOT NULL,
  seat_prices JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on seat_floors table
ALTER TABLE seat_floors ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX idx_seat_floors_library_id ON seat_floors(library_id);
CREATE INDEX idx_seat_floors_is_active ON seat_floors(is_active);
