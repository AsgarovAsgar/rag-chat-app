-- Up Migration
ALTER TABLE documents ADD COLUMN storage_path text;

-- Down Migration
ALTER TABLE documents DROP COLUMN storage_path;