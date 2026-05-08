-- Create RLS policies for multi-tenancy and role-based access control

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user's library_id (NULL means admin, can see all)
CREATE OR REPLACE FUNCTION auth.user_library_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT library_id FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current user's role name
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT ur.role_name 
    FROM user_profiles up 
    JOIN user_roles ur ON up.role_id = ur.id 
    WHERE up.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is admin (library_id IS NULL)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT library_id IS NULL FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user can delete records (only admins)
CREATE OR REPLACE FUNCTION auth.can_delete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.is_admin();
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- LIBRARIES TABLE POLICIES
-- ============================================================================

-- Admins (library_id IS NULL) can see all libraries
CREATE POLICY "Admins can view all libraries"
  ON libraries
  FOR SELECT
  USING (auth.is_admin());

-- Managers/Staff see only their assigned library
CREATE POLICY "Users can view their assigned library"
  ON libraries
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE library_id = libraries.id)
  );

-- Only admins can insert libraries
CREATE POLICY "Only admins can create libraries"
  ON libraries
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Only admins can update libraries
CREATE POLICY "Only admins can update libraries"
  ON libraries
  FOR UPDATE
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Only admins can delete libraries
CREATE POLICY "Only admins can delete libraries"
  ON libraries
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- USER_ROLES TABLE POLICIES
-- ============================================================================

-- Everyone can read roles (needed for dropdowns)
CREATE POLICY "Everyone can view roles"
  ON user_roles
  FOR SELECT
  USING (TRUE);

-- Only admins can modify roles
CREATE POLICY "Only admins can modify roles"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- ============================================================================
-- USER_PROFILES TABLE POLICIES
-- ============================================================================

-- Admins can see all user profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  USING (auth.is_admin());

-- Users can see their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Only admins can insert user profiles
CREATE POLICY "Only admins can create user profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.is_admin());

-- Only admins can update user profiles
CREATE POLICY "Only admins can update user profiles"
  ON user_profiles
  FOR UPDATE
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Only admins can delete user profiles
CREATE POLICY "Only admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- SEAT_FLOORS TABLE POLICIES
-- ============================================================================

-- Admins can see all floor configurations
CREATE POLICY "Admins can view all seat floors"
  ON seat_floors
  FOR SELECT
  USING (auth.is_admin());

-- Users can see seat floors for their assigned library
CREATE POLICY "Users can view seat floors for their library"
  ON seat_floors
  FOR SELECT
  USING (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Only admins can insert/update seat floors
CREATE POLICY "Only admins can create seat floors"
  ON seat_floors
  FOR INSERT
  WITH CHECK (auth.is_admin());

CREATE POLICY "Only admins can update seat floors"
  ON seat_floors
  FOR UPDATE
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Only admins can delete seat floors
CREATE POLICY "Only admins can delete seat floors"
  ON seat_floors
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- LIBRARY_MEMBERS TABLE POLICIES
-- ============================================================================

-- Admins can view all members (active and soft-deleted)
CREATE POLICY "Admins can view all members"
  ON library_members
  FOR SELECT
  USING (auth.is_admin());

-- Regular users (managers/staff) see only their library's active members
CREATE POLICY "Users can view members in their library"
  ON library_members
  FOR SELECT
  USING (
    library_id = auth.user_library_id() 
    AND is_deleted = FALSE
  );

-- Admins and users can insert members in their library
CREATE POLICY "Users can create members in their library"
  ON library_members
  FOR INSERT
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Admins and users can update members in their library
CREATE POLICY "Users can update members in their library"
  ON library_members
  FOR UPDATE
  USING (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  )
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Only admins can hard delete members
-- Managers/Staff must use soft delete (UPDATE with is_deleted = TRUE)
CREATE POLICY "Only admins can delete members"
  ON library_members
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- PAYMENT_HISTORY TABLE POLICIES
-- ============================================================================

-- Admins can view all payments (active and soft-deleted)
CREATE POLICY "Admins can view all payments"
  ON payment_history
  FOR SELECT
  USING (auth.is_admin());

-- Regular users see only their library's active payments
CREATE POLICY "Users can view payments in their library"
  ON payment_history
  FOR SELECT
  USING (
    library_id = auth.user_library_id() 
    AND is_deleted = FALSE
  );

-- Users can insert payments in their library
CREATE POLICY "Users can create payments in their library"
  ON payment_history
  FOR INSERT
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Users can update payments in their library
CREATE POLICY "Users can update payments in their library"
  ON payment_history
  FOR UPDATE
  USING (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  )
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Only admins can hard delete payments
CREATE POLICY "Only admins can delete payments"
  ON payment_history
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- EXPENSES TABLE POLICIES
-- ============================================================================

-- Admins can view all expenses (active and soft-deleted)
CREATE POLICY "Admins can view all expenses"
  ON expenses
  FOR SELECT
  USING (auth.is_admin());

-- Regular users see only their library's active expenses
CREATE POLICY "Users can view expenses in their library"
  ON expenses
  FOR SELECT
  USING (
    library_id = auth.user_library_id() 
    AND is_deleted = FALSE
  );

-- Users can insert expenses in their library
CREATE POLICY "Users can create expenses in their library"
  ON expenses
  FOR INSERT
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Users can update expenses in their library
CREATE POLICY "Users can update expenses in their library"
  ON expenses
  FOR UPDATE
  USING (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  )
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Only admins can hard delete expenses
CREATE POLICY "Only admins can delete expenses"
  ON expenses
  FOR DELETE
  USING (auth.is_admin());

-- ============================================================================
-- TODOS TABLE POLICIES
-- ============================================================================

-- Admins can view all todos (active and soft-deleted)
CREATE POLICY "Admins can view all todos"
  ON todos
  FOR SELECT
  USING (auth.is_admin());

-- Regular users see only their library's active todos
CREATE POLICY "Users can view todos in their library"
  ON todos
  FOR SELECT
  USING (
    library_id = auth.user_library_id() 
    AND is_deleted = FALSE
  );

-- Users can insert todos in their library
CREATE POLICY "Users can create todos in their library"
  ON todos
  FOR INSERT
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Users can update todos in their library
CREATE POLICY "Users can update todos in their library"
  ON todos
  FOR UPDATE
  USING (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  )
  WITH CHECK (
    library_id = auth.user_library_id() 
    OR auth.is_admin()
  );

-- Only admins can hard delete todos
CREATE POLICY "Only admins can delete todos"
  ON todos
  FOR DELETE
  USING (auth.is_admin());
