-- seed.sql (dev only)
BEGIN;

INSERT INTO users (email, display_name)
VALUES ('fred@example.com', 'Fred')
ON CONFLICT (email) DO NOTHING;

-- Create a sample doc + version for Fred
WITH u AS (
  SELECT id FROM users WHERE email = 'fred@example.com'
),
d AS (
  INSERT INTO documents (owner_id, title)
  SELECT u.id, 'Welcome to DocVault' FROM u
  RETURNING id
)
INSERT INTO document_versions (document_id, version_number, content)
SELECT d.id, 1, 'Hello! This is your first version.'
FROM d
ON CONFLICT (document_id, version_number) DO NOTHING;

COMMIT;
