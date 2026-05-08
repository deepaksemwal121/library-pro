-- Add library_id and is_deleted columns to existing tables for multi-tenancy support

-- Add columns to library_members table
ALTER TABLE library_members
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_library_members_library_id ON library_members(library_id);
CREATE INDEX IF NOT EXISTS idx_library_members_is_deleted ON library_members(is_deleted);

-- Add columns to payment_history table
ALTER TABLE payment_history
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_library_id ON payment_history(library_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_is_deleted ON payment_history(is_deleted);

-- Add columns to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_library_id ON expenses(library_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_deleted ON expenses(is_deleted);

-- Add columns to todos table
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_todos_library_id ON todos(library_id);
CREATE INDEX IF NOT EXISTS idx_todos_is_deleted ON todos(is_deleted);
