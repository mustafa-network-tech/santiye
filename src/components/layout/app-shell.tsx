"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  CarFront,
  Boxes,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  CircleUserRound,
  PackageCheck,
  BellRing,
  StickyNote,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandLogo } from "@/components/layout/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { UserProfile, UserRole } from "@/types/auth";
import { USER_ROLE_LABELS } from "@/types/auth";
import type { DueNoteNotification } from "@/types/note";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    accounting: false,
    group: "OPERASYON",
  },
  {
    href: "/projects",
    label: "Projeler",
    icon: FolderKanban,
    accounting: false,
    group: "OPERASYON",
  },
  {
    href: "/work-plans",
    label: "İş Planı",
    icon: ClipboardList,
    accounting: false,
    group: "OPERASYON",
  },

  {
    href: "/personnel",
    label: "Personel",
    icon: Users,
    accounting: true,
    group: "KAYNAKLAR",
  },
  {
    href: "/vehicles",
    label: "Araçlar",
    icon: CarFront,
    accounting: false,
    group: "KAYNAKLAR",
  },
  {
    href: "/inventory",
    label: "Malzeme Stok",
    icon: Boxes,
    accounting: false,
    group: "KAYNAKLAR",
  },
  {
    href: "/custody",
    label: "Malzeme Zimmet",
    icon: PackageCheck,
    accounting: false,
    group: "KAYNAKLAR",
  },

  {
    href: "/attendance",
    label: "Puantaj",
    icon: CalendarCheck,
    accounting: true,
    group: "PERSONEL YÖNETİMİ",
  },

  {
    href: "/notes",
    label: "Notlar",
    icon: StickyNote,
    accounting: true,
    group: "SİSTEM",
  },
  {
    href: "/profile",
    label: "Profilim",
    icon: CircleUserRound,
    accounting: true,
    group: "SİSTEM",
  },
  {
    href: "/settings",
    label: "Ayarlar",
    icon: Settings,
    accounting: false,
    group: "SİSTEM",
  },
];

export function AppShell({
  children,
  profile,
  avatarUrl,
  noteNotifications,
}: {
  children: React.ReactNode;
  profile: UserProfile;
  avatarUrl: string | null;
  noteNotifications: DueNoteNotification[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Çıkış yapılamadı");
      return;
    }
    toast.success("Oturum kapatıldı");
    router.push("/login");
    router.refresh();
  }

 const navGroups = [
  { name: "OPERASYON", icon: LayoutDashboard },
  { name: "KAYNAKLAR", icon: Boxes },
  { name: "PERSONEL YÖNETİMİ", icon: Users },
  { name: "SİSTEM", icon: Settings },
];

const visibleNavItems = NAV_ITEMS.filter((item) => {
  if (item.href === "/settings") {
    return profile.role === "site_chief";
  }

  if (profile.role === "accounting") {
    return item.accounting;
  }

  return true;
});

const nav = (
  <nav className="flex flex-col gap-1 p-3">
    {navGroups.map((group) => {
      const groupItems = visibleNavItems.filter(
        (item) => item.group === group.name
      );

      // Kullanıcının bu grupta görebileceği menü yoksa
      // başlığı da gösterme.
      if (groupItems.length === 0) return null;

      const GroupIcon = group.icon;

      return (
        <div key={group.name} className="mb-4">
          {/* Grup Başlığı */}
          <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <GroupIcon className="h-3.5 w-3.5" />
            <span>{group.name}</span>
          </div>

          {/* Grup Menüleri */}
          <div className="flex flex-col gap-1">
            {groupItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />

                  <span>{item.label}</span>

                  {item.href === "/notes" &&
                    noteNotifications.length > 0 && (
                      <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {noteNotifications.length}
                      </span>
                    )}
                </Link>
              );
            })}
          </div>
        </div>
      );
    })}

    {/* Sadece Şantiye Şefi */}
    {profile.role === "site_chief" && (
      <div className="mt-1 border-t pt-3">
        <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>YÖNETİM</span>
        </div>

        <Link
          href="/users"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/users")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Kullanıcı Yetkileri</span>
        </Link>
      </div>
    )}
  </nav>
);
   

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-background to-background dark:from-slate-900 dark:via-background dark:to-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-background/80 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-3 px-5 py-6">
            <BrandLogo size={40} priority />
            <div>
              <p className="text-sm font-semibold tracking-tight">
                AZG İLETİŞİM
              </p>
              <p className="text-xs text-muted-foreground">Şantiye Proje Takip</p>
            </div>
          </div>
          {nav}
          <div className="mt-auto space-y-2 border-t border-border/70 p-3">
            {noteNotifications.length > 0 && (
              <Link
                href="/notes"
                className="block rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <BellRing className="h-4 w-4" />
                  {noteNotifications.length} Not Bildirimi
                </span>
                <span className="mt-1 block truncate text-[11px]">
                  {noteNotifications[0].event_type === "target"
                    ? "Not tarihi"
                    : "Hatırlatma"}
                  : {noteNotifications[0].title}
                </span>
                {noteNotifications[0].target_at && (
                  <span className="block text-[10px] opacity-80">
                    {formatDateTime(noteNotifications[0].target_at)}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 transition-colors hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={`${profile.full_name || "Kullanıcı"} profil fotoğrafı`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUserRound className="h-5 w-5 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">
                  {profile.full_name || profile.email}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {profile.job_title ||
                    USER_ROLE_LABELS[profile.role as UserRole]}
                </span>
              </span>
            </Link>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Menü"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <BrandLogo size={28} />
              <span className="text-sm font-semibold">AZG İLETİŞİM ŞANTİYE</span>
            </div>
            <ThemeToggle />
          </header>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border/70 bg-background md:hidden"
              >
                {nav}
                <div className="p-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 p-4 md:p-8">
            {profile.role === "company_manager" && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                Şirket yöneticisi hesabı: işlem yetkileri şantiye şefi
                tarafından alan bazında belirlenir.
              </div>
            )}
            {profile.role === "accounting" && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                Muhasebe hesabı: Personel ve Puantaj bilgileri salt okunur
                gösterilir.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
