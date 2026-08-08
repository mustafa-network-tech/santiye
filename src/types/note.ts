import type { UserRole } from "@/types/auth";

export type NoteRecipientUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
};

export type SharedNoteRecipient = {
  user_id: string;
  full_name: string;
  reminder_read_at: string | null;
  target_read_at: string | null;
};

export type SharedNote = {
  id: string;
  title: string;
  content: string;
  target_at: string | null;
  reminder_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  recipients: SharedNoteRecipient[];
  current_user_reminder_read_at: string | null;
  current_user_target_read_at: string | null;
};

export type DueNoteNotification = {
  note_id: string;
  title: string;
  target_at: string | null;
  reminder_at: string;
  author_name: string;
  event_type: "reminder" | "target";
  due_at: string;
};
