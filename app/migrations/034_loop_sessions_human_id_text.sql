-- Allow human_id to store UUID (36 chars); migration 023 had VARCHAR(32) which breaks Google OAuth.
ALTER TABLE loop_sessions ALTER COLUMN human_id TYPE TEXT;
