-- ============================================================================
-- SEED DATA SCRIPT FOR BIZMEASUREUP
-- ============================================================================
-- This script populates the database with test data for development/testing.
-- Assumes users already exist in auth.users and public.users tables.
-- 
-- Usage: Run this script in Supabase SQL Editor
-- ============================================================================

-- Cleanup: Delete existing seed data (in reverse order of dependencies)
-- Note: This will delete ALL data, not just seed data. Use with caution!
DELETE FROM public.flow_views;
DELETE FROM public.scoreboard_metrics;
DELETE FROM public.checklist_items;
DELETE FROM public.checklists;
DELETE FROM public.tasks;
DELETE FROM public.organization_members;
DELETE FROM public.organizations;
-- Note: We don't delete users as they should already exist

-- ============================================================================
-- STEP 1: Get existing users from auth.users
-- ============================================================================
-- Check if users exist first
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 0 THEN
    RAISE EXCEPTION 'No users found in auth.users. Please create at least one user before running this seed script.';
  END IF;
END $$;

-- We'll use the first 8 users from auth.users and assign them roles
WITH user_roles AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (ORDER BY created_at) as user_num
  FROM auth.users
  ORDER BY created_at
  LIMIT 8
),
assigned_users AS (
  SELECT 
    id,
    email,
    CASE 
      WHEN user_num = 1 THEN 'admin'
      WHEN user_num = 2 THEN 'owner'
      WHEN user_num = 3 THEN 'owner'
      WHEN user_num = 4 THEN 'doer'
      WHEN user_num = 5 THEN 'doer'
      WHEN user_num = 6 THEN 'doer'
      WHEN user_num = 7 THEN 'viewer'
      WHEN user_num = 8 THEN 'viewer'
    END as default_role
  FROM user_roles
)
SELECT * INTO TEMP TABLE seed_users FROM assigned_users;

-- ============================================================================
-- STEP 2: Create Organizations
-- ============================================================================
DO $$
DECLARE
  admin_user_id UUID;
  owner_user_id UUID;
  first_user_id UUID;
BEGIN
  -- Get users with fallback to first available user
  SELECT id INTO admin_user_id FROM seed_users WHERE default_role = 'admin' LIMIT 1;
  SELECT id INTO owner_user_id FROM seed_users WHERE default_role = 'owner' LIMIT 1;
  SELECT id INTO first_user_id FROM seed_users ORDER BY default_role LIMIT 1;
  
  -- Use first available user as fallback if specific role doesn't exist
  IF admin_user_id IS NULL THEN
    admin_user_id := first_user_id;
  END IF;
  IF owner_user_id IS NULL THEN
    owner_user_id := first_user_id;
  END IF;
  
  -- Only proceed if we have at least one user
  IF first_user_id IS NOT NULL THEN
    -- Create Acme Corporation
    INSERT INTO public.organizations (id, name, description, created_by)
    VALUES (
      uuid_generate_v4(),
      'Acme Corporation',
      'Leading provider of innovative business solutions and enterprise software.',
      admin_user_id
    );
    
    -- Create TechStart Inc
    INSERT INTO public.organizations (id, name, description, created_by)
    VALUES (
      uuid_generate_v4(),
      'TechStart Inc',
      'Fast-growing technology startup focused on AI and machine learning products.',
      COALESCE(owner_user_id, admin_user_id, first_user_id)
    );
    
    -- Create Global Solutions Group
    INSERT INTO public.organizations (id, name, description, created_by)
    VALUES (
      uuid_generate_v4(),
      'Global Solutions Group',
      'International consulting firm specializing in digital transformation.',
      admin_user_id
    );
  ELSE
    RAISE EXCEPTION 'No users found in auth.users. Please create at least one user before running this seed script.';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create Organization Memberships
-- ============================================================================
-- Acme Corporation members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM public.organizations WHERE name = 'Acme Corporation' LIMIT 1),
  id,
  default_role::user_role
FROM seed_users
WHERE default_role IN ('admin', 'owner', 'doer')
LIMIT 3;

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM public.organizations WHERE name = 'Acme Corporation' LIMIT 1),
  id,
  'viewer'::user_role
FROM seed_users
WHERE default_role = 'viewer'
LIMIT 1;

-- TechStart Inc members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM public.organizations WHERE name = 'TechStart Inc' LIMIT 1),
  id,
  default_role::user_role
FROM seed_users
WHERE default_role IN ('owner', 'doer')
LIMIT 4;

-- Global Solutions Group members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM public.organizations WHERE name = 'Global Solutions Group' LIMIT 1),
  id,
  default_role::user_role
FROM seed_users
LIMIT 5;

-- ============================================================================
-- STEP 4: Create Tasks
-- ============================================================================
-- Helper function to get random user from org
DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
  admin_user UUID;
  owner_user UUID;
  doer1 UUID;
  doer2 UUID;
  doer3 UUID;
  first_user UUID;
BEGIN
  SELECT id INTO org1_id FROM public.organizations WHERE name = 'Acme Corporation' LIMIT 1;
  SELECT id INTO org2_id FROM public.organizations WHERE name = 'TechStart Inc' LIMIT 1;
  SELECT id INTO org3_id FROM public.organizations WHERE name = 'Global Solutions Group' LIMIT 1;
  
  -- Get users with fallbacks
  SELECT id INTO admin_user FROM seed_users WHERE default_role = 'admin' LIMIT 1;
  SELECT id INTO owner_user FROM seed_users WHERE default_role = 'owner' LIMIT 1;
  SELECT id INTO doer1 FROM seed_users WHERE default_role = 'doer' LIMIT 1 OFFSET 0;
  SELECT id INTO doer2 FROM seed_users WHERE default_role = 'doer' LIMIT 1 OFFSET 1;
  SELECT id INTO doer3 FROM seed_users WHERE default_role = 'doer' LIMIT 1 OFFSET 2;
  
  -- Get first available user as fallback
  SELECT id INTO first_user FROM seed_users ORDER BY default_role LIMIT 1;
  
  -- Use fallbacks if specific roles don't exist
  IF admin_user IS NULL THEN
    admin_user := first_user;
  END IF;
  IF owner_user IS NULL THEN
    owner_user := COALESCE(admin_user, first_user);
  END IF;
  IF doer1 IS NULL THEN
    doer1 := COALESCE(owner_user, admin_user, first_user);
  END IF;
  IF doer2 IS NULL THEN
    doer2 := doer1;  -- Reuse doer1 if only one doer exists
  END IF;
  IF doer3 IS NULL THEN
    doer3 := doer1;  -- Reuse doer1 if only one doer exists
  END IF;

  -- Acme Corporation Tasks (10 tasks)
  INSERT INTO public.tasks (organization_id, title, description, assigned_to, created_by, status, priority, due_date, completed_at, created_at)
  VALUES
    (org1_id, 'Implement user authentication system', 'Set up OAuth2 and JWT token management for secure user access', doer1, admin_user, 'in_progress', 'high', NOW() + INTERVAL '5 days', NULL, NOW() - INTERVAL '3 days'),
    (org1_id, 'Design database schema for analytics', 'Create ERD and migration scripts for analytics module', doer2, admin_user, 'pending', 'medium', NOW() + INTERVAL '10 days', NULL, NOW() - INTERVAL '2 days'),
    (org1_id, 'Write API documentation', 'Document all REST endpoints with examples and error codes', doer1, owner_user, 'completed', 'medium', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
    (org1_id, 'Setup CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', doer3, admin_user, 'in_progress', 'high', NOW() + INTERVAL '7 days', NULL, NOW() - INTERVAL '4 days'),
    (org1_id, 'Review security audit findings', 'Address vulnerabilities identified in recent security audit', doer2, admin_user, 'pending', 'urgent', NOW() + INTERVAL '2 days', NULL, NOW() - INTERVAL '1 day'),
    (org1_id, 'Create user onboarding flow', 'Design and implement welcome screens and tutorial for new users', doer1, owner_user, 'pending', 'low', NOW() + INTERVAL '14 days', NULL, NOW() - INTERVAL '6 days'),
    (org1_id, 'Optimize database queries', 'Review slow queries and add necessary indexes', doer3, admin_user, 'completed', 'medium', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
    (org1_id, 'Implement real-time notifications', 'Add WebSocket support for live updates', doer2, owner_user, 'in_progress', 'high', NOW() + INTERVAL '6 days', NULL, NOW() - INTERVAL '3 days'),
    (org1_id, 'Write unit tests for core modules', 'Achieve 80% code coverage for critical business logic', doer1, admin_user, 'pending', 'medium', NOW() + INTERVAL '12 days', NULL, NOW() - INTERVAL '2 days'),
    (org1_id, 'Migrate legacy data', 'Import historical data from old system with data validation', doer3, admin_user, 'cancelled', 'low', NULL, NULL, NOW() - INTERVAL '8 days');

  -- TechStart Inc Tasks (8 tasks)
  INSERT INTO public.tasks (organization_id, title, description, assigned_to, created_by, status, priority, due_date, completed_at, created_at)
  VALUES
    (org2_id, 'Train ML model for recommendation engine', 'Collect training data and fine-tune model parameters', doer1, owner_user, 'in_progress', 'urgent', NOW() + INTERVAL '3 days', NULL, NOW() - INTERVAL '4 days'),
    (org2_id, 'Build API for mobile app', 'Create RESTful endpoints for iOS and Android clients', doer2, owner_user, 'pending', 'high', NOW() + INTERVAL '8 days', NULL, NOW() - INTERVAL '2 days'),
    (org2_id, 'Design user interface mockups', 'Create wireframes and high-fidelity designs for new features', doer3, owner_user, 'completed', 'medium', NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '7 days'),
    (org2_id, 'Setup monitoring and logging', 'Configure Datadog and Sentry for production monitoring', doer1, owner_user, 'in_progress', 'high', NOW() + INTERVAL '5 days', NULL, NOW() - INTERVAL '3 days'),
    (org2_id, 'Conduct user research interviews', 'Interview 10 potential users to gather feedback', doer2, owner_user, 'pending', 'medium', NOW() + INTERVAL '9 days', NULL, NOW() - INTERVAL '1 day'),
    (org2_id, 'Implement payment processing', 'Integrate Stripe for subscription billing', doer3, owner_user, 'pending', 'urgent', NOW() + INTERVAL '4 days', NULL, NOW() - INTERVAL '5 days'),
    (org2_id, 'Write technical blog post', 'Document our ML architecture for company blog', doer1, owner_user, 'completed', 'low', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
    (org2_id, 'Prepare investor pitch deck', 'Create presentation for Series A funding round', doer2, owner_user, 'in_progress', 'high', NOW() + INTERVAL '6 days', NULL, NOW() - INTERVAL '2 days');

  -- Global Solutions Group Tasks (7 tasks)
  INSERT INTO public.tasks (organization_id, title, description, assigned_to, created_by, status, priority, due_date, completed_at, created_at)
  VALUES
    (org3_id, 'Conduct client needs assessment', 'Meet with stakeholders to identify requirements', doer1, admin_user, 'completed', 'high', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
    (org3_id, 'Develop project roadmap', 'Create detailed timeline and milestones for Q1 2024', doer2, admin_user, 'in_progress', 'medium', NOW() + INTERVAL '7 days', NULL, NOW() - INTERVAL '5 days'),
    (org3_id, 'Prepare training materials', 'Create documentation and video tutorials for end users', doer3, admin_user, 'pending', 'medium', NOW() + INTERVAL '11 days', NULL, NOW() - INTERVAL '3 days'),
    (org3_id, 'Schedule team building workshop', 'Organize off-site event for cross-functional teams', doer1, admin_user, 'pending', 'low', NOW() + INTERVAL '15 days', NULL, NOW() - INTERVAL '2 days'),
    (org3_id, 'Review compliance requirements', 'Ensure all processes meet industry regulations', doer2, admin_user, 'in_progress', 'urgent', NOW() + INTERVAL '2 days', NULL, NOW() - INTERVAL '1 day'),
    (org3_id, 'Update client portal', 'Add new features based on user feedback', doer3, admin_user, 'completed', 'high', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '12 days'),
    (org3_id, 'Analyze market trends', 'Research competitor strategies and market opportunities', doer1, admin_user, 'pending', 'medium', NOW() + INTERVAL '13 days', NULL, NOW() - INTERVAL '4 days');
END $$;

-- ============================================================================
-- STEP 5: Create Checklists and Checklist Items
-- ============================================================================
DO $$
DECLARE
  task_rec RECORD;
  checklist_id_var UUID;
  item_index INTEGER;
  completed_user UUID;
  first_user UUID;
BEGIN
  -- Get a doer user for completing items, with fallback
  SELECT id INTO completed_user FROM seed_users WHERE default_role = 'doer' LIMIT 1;
  SELECT id INTO first_user FROM seed_users ORDER BY default_role LIMIT 1;
  
  -- Use first available user if no doer exists
  IF completed_user IS NULL THEN
    completed_user := first_user;
  END IF;
  
  -- Create checklists for various tasks
  FOR task_rec IN 
    SELECT id, title, organization_id 
    FROM public.tasks 
    WHERE status IN ('pending', 'in_progress')
    ORDER BY created_at
    LIMIT 15
  LOOP
    -- Create checklist for this task
    INSERT INTO public.checklists (task_id, title, description, created_by)
    VALUES (
      task_rec.id,
      'Implementation Checklist for ' || LEFT(task_rec.title, 40),
      'Step-by-step checklist to complete ' || task_rec.title,
      (SELECT created_by FROM public.tasks WHERE id = task_rec.id LIMIT 1)
    )
    RETURNING id INTO checklist_id_var;
    
    -- Create 3-5 checklist items
    item_index := 0;
    
    -- Item 1: Usually completed
    INSERT INTO public.checklist_items (checklist_id, title, description, is_completed, completed_by, completed_at, order_index)
    VALUES (
      checklist_id_var,
      'Review requirements',
      'Understand all requirements and constraints',
      CASE WHEN random() > 0.3 THEN TRUE ELSE FALSE END,
      CASE WHEN random() > 0.3 THEN completed_user ELSE NULL END,
      CASE WHEN random() > 0.3 THEN NOW() - INTERVAL '2 days' ELSE NULL END,
      item_index
    );
    item_index := item_index + 1;
    
    -- Item 2: Mixed completion
    INSERT INTO public.checklist_items (checklist_id, title, description, is_completed, completed_by, completed_at, order_index)
    VALUES (
      checklist_id_var,
      'Create initial design',
      'Draft initial design or architecture',
      CASE WHEN random() > 0.5 THEN TRUE ELSE FALSE END,
      CASE WHEN random() > 0.5 THEN completed_user ELSE NULL END,
      CASE WHEN random() > 0.5 THEN NOW() - INTERVAL '1 day' ELSE NULL END,
      item_index
    );
    item_index := item_index + 1;
    
    -- Item 3: Usually pending
    INSERT INTO public.checklist_items (checklist_id, title, description, is_completed, completed_by, completed_at, order_index)
    VALUES (
      checklist_id_var,
      'Implement core functionality',
      'Build the main features',
      CASE WHEN random() > 0.7 THEN TRUE ELSE FALSE END,
      CASE WHEN random() > 0.7 THEN completed_user ELSE NULL END,
      CASE WHEN random() > 0.7 THEN NOW() - INTERVAL '12 hours' ELSE NULL END,
      item_index
    );
    item_index := item_index + 1;
    
    -- Item 4: Often pending
    IF random() > 0.3 THEN
      INSERT INTO public.checklist_items (checklist_id, title, description, is_completed, completed_by, completed_at, order_index)
      VALUES (
        checklist_id_var,
        'Write tests',
        'Create unit and integration tests',
        CASE WHEN random() > 0.8 THEN TRUE ELSE FALSE END,
        CASE WHEN random() > 0.8 THEN completed_user ELSE NULL END,
        CASE WHEN random() > 0.8 THEN NOW() - INTERVAL '6 hours' ELSE NULL END,
        item_index
      );
      item_index := item_index + 1;
    END IF;
    
    -- Item 5: Usually pending
    IF random() > 0.5 THEN
      INSERT INTO public.checklist_items (checklist_id, title, description, is_completed, completed_by, completed_at, order_index)
      VALUES (
        checklist_id_var,
        'Code review and documentation',
        'Get peer review and update documentation',
        FALSE,
        NULL,
        NULL,
        item_index
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Create Scoreboard Metrics
-- ============================================================================
DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
BEGIN
  SELECT id INTO org1_id FROM public.organizations WHERE name = 'Acme Corporation' LIMIT 1;
  SELECT id INTO org2_id FROM public.organizations WHERE name = 'TechStart Inc' LIMIT 1;
  SELECT id INTO org3_id FROM public.organizations WHERE name = 'Global Solutions Group' LIMIT 1;
  
  -- Acme Corporation Metrics
  INSERT INTO public.scoreboard_metrics (organization_id, name, description, metric_type, target_value, current_value, period)
  VALUES
    (org1_id, 'Task Completion Rate', 'Percentage of tasks completed on time', 'task_completion', 85, 72, 'monthly'),
    (org1_id, 'Code Quality Score', 'Average code review rating', 'custom', 90, 87, 'weekly'),
    (org1_id, 'Checklist Completion', 'Average checklist items completed per task', 'checklist_completion', 80, 65, 'monthly'),
    (org1_id, 'Sprint Velocity', 'Story points completed per sprint', 'custom', 100, 95, 'weekly');
  
  -- TechStart Inc Metrics
  INSERT INTO public.scoreboard_metrics (organization_id, name, description, metric_type, target_value, current_value, period)
  VALUES
    (org2_id, 'Feature Delivery Rate', 'Number of features shipped per month', 'custom', 12, 9, 'monthly'),
    (org2_id, 'Task Completion Rate', 'Percentage of tasks completed', 'task_completion', 90, 78, 'weekly'),
    (org2_id, 'Checklist Completion', 'Average checklist completion rate', 'checklist_completion', 85, 70, 'monthly');
  
  -- Global Solutions Group Metrics
  INSERT INTO public.scoreboard_metrics (organization_id, name, description, metric_type, target_value, current_value, period)
  VALUES
    (org3_id, 'Client Satisfaction Score', 'Average client feedback rating', 'custom', 95, 92, 'monthly'),
    (org3_id, 'Project Delivery Rate', 'Projects delivered on time', 'task_completion', 88, 85, 'monthly');
END $$;

-- ============================================================================
-- STEP 7: Create Flow Views
-- ============================================================================
DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
  admin_user UUID;
  owner_user UUID;
  first_user UUID;
BEGIN
  SELECT id INTO org1_id FROM public.organizations WHERE name = 'Acme Corporation' LIMIT 1;
  SELECT id INTO org2_id FROM public.organizations WHERE name = 'TechStart Inc' LIMIT 1;
  SELECT id INTO org3_id FROM public.organizations WHERE name = 'Global Solutions Group' LIMIT 1;
  
  SELECT id INTO admin_user FROM seed_users WHERE default_role = 'admin' LIMIT 1;
  SELECT id INTO owner_user FROM seed_users WHERE default_role = 'owner' LIMIT 1;
  SELECT id INTO first_user FROM seed_users ORDER BY default_role LIMIT 1;
  
  -- Use fallbacks if specific roles don't exist
  IF admin_user IS NULL THEN
    admin_user := first_user;
  END IF;
  IF owner_user IS NULL THEN
    owner_user := COALESCE(admin_user, first_user);
  END IF;
  
  -- Acme Corporation Flow Views
  INSERT INTO public.flow_views (organization_id, name, description, view_type, filter_config, created_by)
  VALUES
    (org1_id, 'Development Pipeline', 'Kanban view for development tasks', 'kanban', '{"status": ["pending", "in_progress"], "priority": ["high", "urgent"]}'::jsonb, admin_user),
    (org1_id, 'All Tasks Calendar', 'Calendar view of all tasks with due dates', 'calendar', '{}'::jsonb, admin_user),
    (org1_id, 'High Priority List', 'List view of urgent and high priority tasks', 'list', '{"priority": ["urgent", "high"]}'::jsonb, owner_user);
  
  -- TechStart Inc Flow Views
  INSERT INTO public.flow_views (organization_id, name, description, view_type, filter_config, created_by)
  VALUES
    (org2_id, 'Sprint Board', 'Kanban board for current sprint', 'kanban', '{"status": ["pending", "in_progress"]}'::jsonb, owner_user),
    (org2_id, 'Project Timeline', 'Gantt chart view of project milestones', 'gantt', '{}'::jsonb, owner_user);
  
  -- Global Solutions Group Flow Views
  INSERT INTO public.flow_views (organization_id, name, description, view_type, filter_config, created_by)
  VALUES
    (org3_id, 'Client Projects', 'List view of all client-related tasks', 'list', '{}'::jsonb, admin_user),
    (org3_id, 'Monthly Overview', 'Calendar view for monthly planning', 'calendar', '{}'::jsonb, admin_user);
END $$;

-- ============================================================================
-- CLEANUP TEMP TABLES
-- ============================================================================
DROP TABLE IF EXISTS seed_users;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to verify seed data)
-- ============================================================================
-- SELECT 'Organizations' as table_name, COUNT(*) as count FROM public.organizations
-- UNION ALL
-- SELECT 'Organization Members', COUNT(*) FROM public.organization_members
-- UNION ALL
-- SELECT 'Tasks', COUNT(*) FROM public.tasks
-- UNION ALL
-- SELECT 'Checklists', COUNT(*) FROM public.checklists
-- UNION ALL
-- SELECT 'Checklist Items', COUNT(*) FROM public.checklist_items
-- UNION ALL
-- SELECT 'Scoreboard Metrics', COUNT(*) FROM public.scoreboard_metrics
-- UNION ALL
-- SELECT 'Flow Views', COUNT(*) FROM public.flow_views;

