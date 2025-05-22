/*
  # Add email logs table

  1. New Tables
    - `email_logs`
      - `id` (uuid, primary key)
      - `user_email` (text)
      - `email_type` (text)
      - `subject` (text)
      - `sent_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `email_logs` table
    - Add policy for service role to manage all logs
    - Add policy for authenticated users to read their own logs
*/

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all logs
CREATE POLICY "Service role can manage all logs"
  ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read their own logs
CREATE POLICY "Users can read own logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');