-- Up Migration
ALTER TABLE users ADD COLUMN is_demo_seed boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX users_demo_seed_idx ON users (is_demo_seed) WHERE is_demo_seed;

-- Down Migration
DROP INDEX users_demo_seed_idx;
ALTER TABLE users DROP COLUMN is_demo;
ALTER TABLE users DROP COLUMN is_demo_seed;