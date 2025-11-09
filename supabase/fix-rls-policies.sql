-- Fix for infinite recursion in organization_members RLS policies
-- Run this script in your Supabase SQL Editor
-- This will completely fix the recursion issue

-- Step 1: Drop ALL existing policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Step 2: Drop the functions if they exist
DROP FUNCTION IF EXISTS public.user_is_org_member(UUID);
DROP FUNCTION IF EXISTS public.user_is_org_admin(UUID);

-- Step 3: Create a SECURITY DEFINER function that bypasses RLS completely
-- This function runs with the privileges of the function owner (postgres)
-- and can query organization_members without triggering RLS policies
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- This query runs with SECURITY DEFINER, so it bypasses RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Step 4: Create a simple policy for users to see their own memberships
-- This has no recursion because it's a direct user_id check
CREATE POLICY "Users can view their own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Step 5: Create a policy for users to see other members in their organizations
-- This uses the SECURITY DEFINER function which bypasses RLS
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members FOR SELECT
  USING (
    -- Either it's their own membership (handled by first policy)
    user_id = auth.uid()
    OR
    -- Or they're a member of the same organization (checked via function that bypasses RLS)
    public.user_is_org_member(organization_id) = true
  );

-- Step 6: Create a helper function to check if user is admin/owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Step 7: Recreate the admin management policy using the function (no recursion)
CREATE POLICY "Admins can manage organization members"
  ON public.organization_members FOR ALL
  USING (public.user_is_org_admin(organization_id) = true)
  WITH CHECK (public.user_is_org_admin(organization_id) = true);

-- Verify the policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'organization_members';
