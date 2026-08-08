import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { UserRepository } from "@/modules/users/user-repository";
import { NotesRepository } from "@/modules/notes/notes-repository";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const profile = await new UserRepository(supabase).getCurrent();
  if (!profile) redirect("/login");
  if (!profile.is_approved || profile.role === "pending")
    redirect("/pending-approval");
  const [avatarUrl, noteNotifications] = await Promise.all([
    new UserRepository(supabase).createAvatarUrl(profile.avatar_path),
    new NotesRepository(supabase).listDueNotifications(),
  ]);

  return (
    <AppShell
      profile={profile}
      avatarUrl={avatarUrl}
      noteNotifications={noteNotifications}
    >
      {children}
    </AppShell>
  );
}
