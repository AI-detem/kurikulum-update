// Typy, které odpovídají tabulkám v Supabase (viz supabase/migrations/0001_init.sql).
// Když přidáš/změníš sloupec v databázi, uprav ho i tady.

export type UserRole = "admin" | "editor" | "viewer";

export type Country = {
  id: string;
  name: string;
  locale: string; // jazykový kód, např. "cs", "sk", "en", "hu"
  created_at: string;
};

export type AppUser = {
  id: string; // stejné jako auth.users.id
  email: string;
  country_id: string | null;
  role: UserRole;
  created_at: string;
};

export type Module = {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
};

export type DocumentVersion = {
  id: string;
  module_id: string;
  country_id: string;
  file_url: string;
  version_number: number;
  uploaded_at: string;
  uploaded_by: string | null;
};

export type Change = {
  id: string;
  document_version_id: string;
  note: string;
  category: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  change_id: string;
  read_at: string | null;
  email_sent_at: string | null;
};

// Rozšířený tvar pro zobrazení v UI (spojené s modulem a poznámkami)
export type ModuleWithLatestVersion = Module & {
  latest_version: (DocumentVersion & { changes: Change[] }) | null;
  version_count: number;
};
