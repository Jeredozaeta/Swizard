/*
  # Add presets table for sharing system

  1. New Tables
    - `presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text)
      - `data` (jsonb)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `views` (int)

  2. Security
    - Enable RLS on `presets` table
    - Add policy for authenticated users to read their own presets
    - Add policy for anyone to read shared presets
    - Add policy for authenticated users to create presets
*/

CREATE TABLE IF NOT EXISTS presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  views integer DEFAULT 0,
  
  CONSTRAINT valid_name CHECK (length(name) >= 1 AND length(name) <= 100)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_expires_at ON presets(expires_at);

-- Enable RLS
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own presets"
  ON presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read shared presets"
  ON presets
  FOR SELECT
  TO public
  USING (expires_at > now());

CREATE POLICY "Users can create presets"
  ON presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to increment views
CREATE OR REPLACE FUNCTION increment_preset_views(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE presets
  SET views = views + 1
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql;