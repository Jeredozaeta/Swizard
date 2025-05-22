/*
  # Add storage bucket for user uploads

  1. New Storage Bucket
    - Creates a public bucket for user uploads
    - Enables RLS policies for secure access

  2. Security
    - Adds policies for authenticated users to:
      - Upload their own files
      - Read any public file
      - Delete their own files
*/

-- Create a new public bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_uploads', 'user_uploads', true);

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to read any file
CREATE POLICY "Users can read all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user_uploads');

-- Policy to allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user_uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user_uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);