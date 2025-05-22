/*
  # Add audio fingerprints table

  1. New Tables
    - `audio_fingerprints`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `timestamp` (timestamptz)
      - `signature` (text)
      - `version` (text)
      - `metadata` (jsonb, for additional data)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `audio_fingerprints` table
    - Add policy for authenticated users to read their own fingerprints
    - Add policy for service role to manage all fingerprints

  3. Indexes
    - Index on user_id for faster lookups
    - Index on timestamp for range queries
    - Index on signature for uniqueness checks
*/

CREATE TABLE IF NOT EXISTS audio_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  signature text NOT NULL,
  version text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT signature_length CHECK (length(signature) >= 16)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON audio_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_timestamp ON audio_fingerprints(timestamp);
CREATE INDEX IF NOT EXISTS idx_fingerprints_signature ON audio_fingerprints(signature);

-- Enable RLS
ALTER TABLE audio_fingerprints ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own fingerprints"
  ON audio_fingerprints
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all fingerprints"
  ON audio_fingerprints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);