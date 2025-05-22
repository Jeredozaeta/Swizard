/*
  # Create subscriptions table

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `stripe_customer_id` (text)
      - `stripe_sub_id` (text)
      - `plan` (text)
      - `status` (text)
      - `current_period_end` (timestamp)

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policy for authenticated users to read their own subscriptions
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  stripe_customer_id text,
  stripe_sub_id text,
  plan text,
  status text,
  current_period_end timestamp without time zone
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
  ON subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);