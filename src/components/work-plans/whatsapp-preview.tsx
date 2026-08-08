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
import { WorkPlanTeamTable } from "@/components/work-plans/work-plan-team-table";

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

    return () => {
      window.removeEventListener("keydown", onKey);
    };
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

    const element = posterRef.current;

    // Mevcut inline stilleri sakla
    const oldWidth = element.style.width;
    const oldMinWidth = element.style.minWidth;
    const oldMaxWidth = element.style.maxWidth;
    const oldOverflow = element.style.overflow;

    try {
      // PNG oluşturulurken gerçek poster alanını genişlet.
      // Böylece tablo da w-full sayesinde tüm genişliği kullanır.
      element.style.width = "900px";
      element.style.minWidth = "900px";
      element.style.maxWidth = "900px";
      element.style.overflow = "visible";

      // Tarayıcının yeni ölçüyü layout'a uygulamasını bekle
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      const height = element.scrollHeight;

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: 900,
        height,
        style: {
          width: "900px",
          minWidth: "900px",
          maxWidth: "900px",
          height: "auto",
          overflow: "visible",
        },
      });

      const res = await fetch(dataUrl);
      return await res.blob();
    } finally {
      // Önizlemeyi eski haline geri getir
      element.style.width = oldWidth;
      element.style.minWidth = oldMinWidth;
      element.style.maxWidth = oldMaxWidth;
      element.style.overflow = oldOverflow;
    }
  }

  async function handleDownload() {
    try {
      setSharing(true);

      const blob = await createImageBlob();

      if (!blob) {
        throw new Error("blob");
      }

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

      if (!blob) {
        throw new Error("blob");
      }

      const file = new File(
        [blob],
        `gunluk-is-plani-${plan.plan_date}.png`,
        {
          type: "image/png",
        }
      );

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
        description:
          "Metin panoya kopyalandı. Görsel indirip WhatsApp’tan gönderebilirsiniz.",
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
      {/* ÜST BAR */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">WhatsApp Önizleme</p>

          <p className="text-xs text-muted-foreground">
            {formatDate(plan.plan_date)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* İÇERİK */}
      <div className="min-w-0 flex-1 overflow-auto p-2 sm:p-4">
        <div className="mx-auto min-w-0 max-w-3xl space-y-4">
          {/* PNG OLARAK ALINACAK ALAN */}
          <div
            ref={posterRef}
            className="w-full min-w-0 overflow-hidden rounded-2xl border bg-white p-3 text-slate-900 shadow-sm sm:p-5"
          >
            {/* BAŞLIK */}
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

            {/* EKİPLER */}
            <WorkPlanTeamTable teams={plan.teams} />
          </div>

          {/* METİN ÖNİZLEME */}
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed">
            {text}
          </pre>
        </div>
      </div>

      {/* ALT BUTONLAR */}
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

          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={sharing}
          >
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