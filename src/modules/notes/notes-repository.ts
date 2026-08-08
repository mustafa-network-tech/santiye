import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DueNoteNotification,
  NoteRecipientUser,
  SharedNote,
} from "@/types/note";

export class NotesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<SharedNote[]> {
    const { data, error } = await this.supabase.rpc("get_shared_notes");
    if (error) throw error;
    return (data ?? []) as SharedNote[];
  }

  async listRecipientUsers(): Promise<NoteRecipientUser[]> {
    const { data, error } = await this.supabase.rpc(
      "list_note_recipient_users"
    );
    if (error) throw error;
    return (data ?? []) as NoteRecipientUser[];
  }

  async listDueNotifications(): Promise<DueNoteNotification[]> {
    const { data, error } = await this.supabase.rpc(
      "get_due_note_notifications"
    );
    if (error) throw error;
    return (data ?? []) as DueNoteNotification[];
  }

  async create(payload: {
    title: string;
    content: string;
    target_at: string | null;
    reminder_at: string | null;
    recipient_ids: string[];
  }): Promise<void> {
    const { error } = await this.supabase.rpc("create_shared_note", {
      p_title: payload.title,
      p_content: payload.content,
      p_target_at: payload.target_at,
      p_reminder_at: payload.reminder_at,
      p_recipient_ids: payload.recipient_ids,
    });
    if (error) throw error;
  }

  async markRead(
    noteId: string,
    eventType: "reminder" | "target"
  ): Promise<void> {
    const { error } = await this.supabase.rpc(
      "mark_note_notification_read",
      { p_note_id: noteId, p_event_type: eventType }
    );
    if (error) throw error;
  }

  async remove(noteId: string): Promise<void> {
    const { error } = await this.supabase
      .from("shared_notes")
      .delete()
      .eq("id", noteId);
    if (error) throw error;
  }
}
