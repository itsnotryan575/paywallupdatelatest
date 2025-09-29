/*
  # Fix user_profiles foreign key constraint

  1. Schema Changes
    - Drop existing foreign key constraint that references non-existent users table
    - Add proper foreign key constraint that references auth.users
    - Ensure RLS policies work correctly with auth.uid()

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control for user profiles
*/

-- Drop the existing foreign key constraint that references the wrong table
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Add the correct foreign key constraint that references auth.users
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure the constraint is properly named and documented
COMMENT ON CONSTRAINT user_profiles_user_id_fkey ON user_profiles IS 
  'Foreign key constraint linking user_profiles to auth.users';