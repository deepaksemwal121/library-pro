-- Create libraries table for multi-location support
CREATE TABLE IF NOT EXISTS libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{"seats": {"firstFloor": 40, "secondFloor": 40}, "pricing": {"firstFloor": 4000, "secondFloor": 3000}}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on libraries table
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_libraries_created_by ON libraries(created_by);
CREATE INDEX idx_libraries_is_active ON libraries(is_active);
