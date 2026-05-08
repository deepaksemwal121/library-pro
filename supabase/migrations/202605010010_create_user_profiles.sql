-- Create user_profiles table to link auth users to roles and libraries
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id UUID REFERENCES libraries(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES user_roles(id),
  full_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX idx_user_profiles_library_id ON user_profiles(library_id);
CREATE INDEX idx_user_profiles_role_id ON user_profiles(role_id);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
