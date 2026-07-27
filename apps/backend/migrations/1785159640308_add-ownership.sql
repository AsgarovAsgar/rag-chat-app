-- Up Migration
ALTER TABLE documents     ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chunks        ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- pre-auth rows have no owner and can never be reached again
DELETE FROM documents     WHERE user_id IS NULL;
DELETE FROM conversations WHERE user_id IS NULL;
DELETE FROM chunks        WHERE user_id IS NULL;

ALTER TABLE documents     ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chunks        ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX documents_user_idx     ON documents (user_id, created_at DESC);
CREATE INDEX conversations_user_idx ON conversations (user_id, created_at DESC);
CREATE INDEX chunks_user_idx        ON chunks (user_id);

-- Down Migration
DROP INDEX chunks_user_idx;
DROP INDEX conversations_user_idx;
DROP INDEX documents_user_idx;

ALTER TABLE chunks        DROP COLUMN user_id;
ALTER TABLE conversations DROP COLUMN user_id;
ALTER TABLE documents     DROP COLUMN user_id;