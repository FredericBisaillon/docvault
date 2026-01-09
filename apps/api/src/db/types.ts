export type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  owner_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  created_at: string;
};
