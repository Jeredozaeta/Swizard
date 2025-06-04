/*
  # Secure Storage Access with RLS

  1. Changes
    - Updates storage.objects table RLS policies
    - Restricts file access to owners only
    - Ensures proper bucket isolation
    - Adds secure upload policies

  2. Security
    - Files can only be read by their owners
    - Uploads restricted to authenticated users
    - Bucket access properly scoped
*/

-- Drop any existing policies
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to shared files" ON storage.objects;

-- Create secure read policy
CREATE POLICY "Users can only read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  -- Ensure user can only access files in their own folder
  auth.uid()::text = storage.foldername(name)
  -- Allow access to shared public assets in specific folders
  OR bucket_id = 'public'
);

-- Create secure insert policy
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure uploads only go to user's own folder
  auth.uid()::text = storage.foldername(name)
  AND (bucket_id = 'user_uploads' OR bucket_id = 'private')
);

-- Create secure update policy
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  -- Can only update files in own folder
  auth.uid()::text = storage.foldername(name)
)
WITH CHECK (
  -- Ensure updates maintain proper folder structure
  auth.uid()::text = storage.foldername(name)
);

-- Create secure delete policy
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  -- Can only delete files in own folder
  auth.uid()::text = storage.foldername(name)
);