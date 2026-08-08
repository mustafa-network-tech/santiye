import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotesRepository } from "@/modules/notes/notes-repository";
import { NotesManager } from "@/components/notes/notes-manager";

export const metadata = {
  title: "Notlar",
};

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const repository = new NotesRepository(supabase);
  const [notes, users] = await Promise.all([
    repository.list(),
    repository.listRecipientUsers(),
  ]);

  return (
    <NotesManager
      initialNotes={notes}
      users={users}
      currentUserId={user.id}
    />
  );
}
