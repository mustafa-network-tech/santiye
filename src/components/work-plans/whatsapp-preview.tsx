"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Download, Pencil, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { DailyWorkPlanWithTeams } from "@/types/work-plan";
import { buildWhatsAppText } from "@/modules/work-plans/whatsapp-formatter";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

type Props = {
  plan: DailyWorkPlanWithTeams;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
};

export function WhatsAppPreview({ plan, open, onClose, onEdit }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const text = useMemo(() => buildWhatsAppText(plan), [plan]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Metin panoya kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  }

  async function createImageBlob(): Promise<Blob | null> {
    if (!posterRef.current) return null;
    const dataUrl = await toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function handleDownload() {
    try {
      setSharing(true);
      const blob = await createImageBlob();
      if (!blob) throw new Error("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gunluk-is-plani-${plan.plan_date}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Görsel indirildi");
    } catch {
      toast.error("Görsel oluşturulamadı");
    } finally {
      setSharing(false);
    }
  }

  async function handleShare() {
    try {
      setSharing(true);
      const blob = await createImageBlob();
      if (!blob) throw new Error("blob");

      const file = new File([blob], `gunluk-is-plani-${plan.plan_date}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Günlük İş Planı",
          text: `Günlük İş Planı — ${plan.plan_date}`,
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Günlük İş Planı",
          text,
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      toast.message("Doğrudan paylaşım desteklenmiyor", {
        description: "Metin panoya kopyalandı. Görsel indirip WhatsApp’tan gönderebilirsiniz.",
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      toast.error("Paylaşım başarısız");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">WhatsApp Önizleme</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(plan.plan_date)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Kapat">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div
            ref={posterRef}
            className="rounded-2xl border bg-white p-5 text-slate-900 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
              <BrandLogo size={48} />
              <div>
                <p className="text-lg font-bold tracking-tight">
                  GÜNLÜK İŞ PLANI
                </p>
                <p className="text-sm text-slate-600">
                  {formatDate(plan.plan_date, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {plan.teams.map((team, index) => (
                <div
                  key={team.id ?? index}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="grid grid-cols-2 gap-px bg-slate-200 text-sm sm:grid-cols-4">
                    <div className="bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Proje ID
                      </p>
                      <p className="font-semibold">{team.project_code}</p>
                    </div>
                    <div className="bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Proje
                      </p>
                      <p className="font-semibold">{team.project_name}</p>
                    </div>
                    <div className="bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Ekip Türü
                      </p>
                      <p className="font-semibold">{team.team_type}</p>
                    </div>
                    <div className="bg-slate-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Araç
                      </p>
                      <p className="font-semibold">{team.vehicle_plate}</p>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-3">
                    <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
                      Personel
                    </p>
                    <ul className="space-y-1 text-sm">
                      {team.members.map((member, mIdx) => (
                        <li key={`${member.full_name}-${mIdx}`}>
                          <span className="font-medium">{member.full_name}</span>
                          {member.is_chief && (
                            <span className="ml-2 text-slate-600">
                              {member.phone || team.chief_phone}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <pre className="overflow-auto rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap">
            {text}
          </pre>
        </div>
      </div>

      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>
            Geri Dön
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Düzenle
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            Kopyala
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={sharing}>
            <Download className="h-4 w-4" />
            Görsel Olarak İndir
          </Button>
          <Button onClick={handleShare} disabled={sharing}>
            <Share2 className="h-4 w-4" />
            WhatsApp&apos;ta Paylaş
          </Button>
        </div>
      </div>
    </div>
  );
}
