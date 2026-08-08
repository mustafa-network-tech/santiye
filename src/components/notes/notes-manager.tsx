"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { NoteRecipientUser, SharedNote } from "@/types/note";
import { USER_ROLE_LABELS } from "@/types/auth";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotesRepository } from "@/modules/notes/notes-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NotesManager({
  initialNotes,
  users,
  currentUserId,
}: {
  initialNotes: SharedNote[];
  users: NoteRecipientUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAt, setTargetAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [recipientIds, setRecipientIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setTitle("");
    setContent("");
    setTargetAt("");
    setReminderAt("");
    setRecipientIds(new Set());
    setOpen(true);
  }

  function updateTarget(value: string) {
    setTargetAt(value);
    if (!value) {
      setReminderAt("");
      setRecipientIds(new Set());
      return;
    }
    const target = new Date(value);
    const reminder = new Date(target.getTime() - 24 * 60 * 60 * 1000);
    const local = new Date(
      reminder.getTime() - reminder.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 16);
    setReminderAt(local);
  }

  function toggleRecipient(userId: string) {
    setRecipientIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function createNote() {
    if (title.trim().length < 2 || content.trim().length < 2) {
      toast.error("Başlık ve not içeriği zorunlu");
      return;
    }
    if (targetAt) {
      const target = new Date(targetAt);
      const reminder = new Date(reminderAt);
      if (!reminderAt || reminder >= target) {
        toast.error("Bildirim tarihi not tarihinden önce olmalıdır");
        return;
      }
      if (recipientIds.size === 0) {
        toast.error("En az bir bildirim kullanıcısı seçin");
        return;
      }
    }

    setLoading(true);
    try {
      await new NotesRepository(createClient()).create({
        title: title.trim(),
        content: content.trim(),
        target_at: targetAt ? new Date(targetAt).toISOString() : null,
        reminder_at: reminderAt
          ? new Date(reminderAt).toISOString()
          : null,
        recipient_ids: [...recipientIds],
      });
      toast.success("Not eklendi");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Not eklenemedi", {
        description: (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function markRead(
    noteId: string,
    eventType: "reminder" | "target"
  ) {
    try {
      await new NotesRepository(createClient()).markRead(noteId, eventType);
      setNotes((current) =>
        current.map((note) =>
          note.id === noteId
            ? {
                ...note,
                [eventType === "reminder"
                  ? "current_user_reminder_read_at"
                  : "current_user_target_read_at"]: new Date().toISOString(),
              }
            : note
        )
      );
      router.refresh();
    } catch {
      toast.error("Bildirim durumu güncellenemedi");
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm("Bu not silinsin mi?")) return;
    try {
      await new NotesRepository(createClient()).remove(noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast.success("Not silindi");
      router.refresh();
    } catch {
      toast.error("Not silinemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ortak notlar ve ileri tarihli kullanıcı bildirimleri
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Not Ekle
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {notes.map((note) => {
          const isRecipient = note.recipients.some(
            (recipient) => recipient.user_id === currentUserId
          );
          const reminderDue =
            note.reminder_at &&
            new Date(note.reminder_at) <= new Date() &&
            !note.current_user_reminder_read_at &&
            isRecipient;
          const targetDue =
            note.target_at &&
            new Date(note.target_at) <= new Date() &&
            !note.current_user_target_read_at &&
            isRecipient;
          const isDue = reminderDue || targetDue;
          return (
            <Card
              key={note.id}
              className={
                isDue
                  ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                  : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {isDue ? (
                        <BellRing className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                      {note.title}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.author_name} · {formatDateTime(note.created_at)}
                    </p>
                  </div>
                  {note.created_by === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNote(note.id)}
                      aria-label="Notu sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                {note.target_at && (
                  <div className="rounded-lg bg-muted/70 p-3 text-xs">
                    <p>Not tarihi: {formatDateTime(note.target_at)}</p>
                    <p>Bildirim: {formatDateTime(note.reminder_at)}</p>
                  </div>
                )}
                {note.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.recipients.map((recipient) => (
                      <Badge
                        key={recipient.user_id}
                        className="bg-muted text-foreground hover:bg-muted"
                      >
                        {recipient.full_name}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {reminderDue && (
                    <Button
                      size="sm"
                      onClick={() => markRead(note.id, "reminder")}
                    >
                      <Check className="h-4 w-4" />
                      Hatırlatma Okundu
                    </Button>
                  )}
                  {targetDue && (
                    <Button
                      size="sm"
                      onClick={() => markRead(note.id, "target")}
                    >
                      <Check className="h-4 w-4" />
                      Not Tarihi Bildirimi Okundu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {notes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Henüz not eklenmemiş.
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Not</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Başlık">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={150}
              />
            </Field>
            <Field label="Not">
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={5}
                maxLength={5000}
              />
            </Field>
            <Field label="Not Tarihi ve Saati (Zorunlu Değil)">
              <Input
                type="datetime-local"
                value={targetAt}
                onChange={(event) => updateTarget(event.target.value)}
              />
            </Field>

            {targetAt && (
              <>
                <Field label="Bildirim Tarihi ve Saati">
                  <Input
                    type="datetime-local"
                    value={reminderAt}
                    max={targetAt}
                    onChange={(event) => setReminderAt(event.target.value)}
                  />
                </Field>
                <div className="space-y-2">
                  <Label>Bildirimin Gideceği Kullanıcılar</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {users.map((user) => {
                      const selected = recipientIds.has(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleRecipient(user.id)}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="block text-sm font-medium">
                            {user.full_name || user.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {USER_ROLE_LABELS[user.role]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Button
              className="w-full"
              onClick={createNote}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Notu Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
