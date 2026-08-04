"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandLogo } from "@/components/layout/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projeler", icon: FolderKanban },
  { href: "/work-plans", label: "İş Planı", icon: ClipboardList },
  { href: "/archive", label: "Arşiv", icon: Archive },
  { href: "/search", label: "Arama", icon: Search },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
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

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
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
            {item.label}
          </Link>
        );
      })}
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

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
