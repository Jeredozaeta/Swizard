/*
  # Add user roles table and policies

  1. New Tables
    - `user_roles`
      - `user_id` (uuid, primary key, references auth.users)
      - `role` (text, check constraint for valid roles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_roles` table
    - Add policies for:
      - Users can read their own role
      - Service role can manage all roles
*/

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'user')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for service role to manage all roles
CREATE POLICY "Service role can manage all roles"
  ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);