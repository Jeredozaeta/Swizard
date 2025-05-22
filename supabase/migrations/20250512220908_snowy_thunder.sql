/*
  # Add admin role to specified user

  1. Changes
    - Adds admin role to specified user email
    - Ensures user_roles table exists
*/

-- First ensure the user exists and get their ID
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'hello@realsoundwizard.com';

  IF user_id IS NOT NULL THEN
    -- Insert or update the admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
  END IF;
END $$;