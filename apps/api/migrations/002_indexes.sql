-- 002_indexes.sql

CREATE INDEX IF NOT EXISTS documents_owner_id_id_idx
ON documents (owner_id, id);

CREATE INDEX IF NOT EXISTS document_versions_docid_version_desc_idx
ON document_versions (document_id, version_number DESC);
