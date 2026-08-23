import type { ProductionEntry } from "@/types/production";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 14;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_MM * 2;
const RENDER_WIDTH_PX = 760;

export async function downloadDailyProductionPdf(entries: ProductionEntry[], date: string) {
  if (!entries.length) throw new Error("PDF oluşturmak için günlük imalat kaydı bulunamadı");

  const [{ default: jsPDF }, { toPng }] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);
  const root = buildPdfDom(entries, date);
  document.body.appendChild(root);

  try {
    await document.fonts.ready;
    await waitForImages(root);
    const header = root.querySelector<HTMLElement>("[data-pdf-header]")!;
    const teams = [...root.querySelectorAll<HTMLElement>("[data-pdf-team]")];
    const headerImage = await captureElement(header, toPng);
    const teamImages = [];
    for (const team of teams) teamImages.push(await captureElement(team, toPng));

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const headerHeight = imageHeightMm(headerImage);
    let y = MARGIN_MM;

    const addHeader = () => {
      pdf.addImage(headerImage.url, "PNG", MARGIN_MM, MARGIN_MM, CONTENT_WIDTH_MM, headerHeight, undefined, "FAST");
      y = MARGIN_MM + headerHeight + 6;
    };
    const addPage = () => {
      pdf.addPage();
      addHeader();
    };
    addHeader();

    for (const image of teamImages) {
      const heightMm = imageHeightMm(image);
      const available = PAGE_HEIGHT_MM - MARGIN_MM - y;
      if (heightMm <= CONTENT_HEIGHT_MM - headerHeight - 6) {
        if (heightMm > available) addPage();
        pdf.addImage(image.url, "PNG", MARGIN_MM, y, CONTENT_WIDTH_MM, heightMm, undefined, "FAST");
        y += heightMm + 5;
        continue;
      }

      const source = await loadImage(image.url);
      let sourceY = 0;
      while (sourceY < source.height) {
        const remainingMm = PAGE_HEIGHT_MM - MARGIN_MM - y;
        if (remainingMm < 25) addPage();
        const usableMm = PAGE_HEIGHT_MM - MARGIN_MM - y;
        const sliceHeightPx = Math.min(source.height - sourceY, Math.floor((usableMm / CONTENT_WIDTH_MM) * source.width));
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = sliceHeightPx;
        canvas.getContext("2d")!.drawImage(source, 0, sourceY, source.width, sliceHeightPx, 0, 0, source.width, sliceHeightPx);
        const sliceHeightMm = (sliceHeightPx / source.width) * CONTENT_WIDTH_MM;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_MM, y, CONTENT_WIDTH_MM, sliceHeightMm, undefined, "FAST");
        sourceY += sliceHeightPx;
        y += sliceHeightMm;
        if (sourceY < source.height) addPage();
      }
      y += 5;
    }

    pdf.save(`AZG-Gunluk-Imalat-${date}.pdf`);
  } finally {
    root.remove();
  }
}

type CapturedImage = { url: string; width: number; height: number };

async function captureElement(element: HTMLElement, toPng: typeof import("html-to-image").toPng): Promise<CapturedImage> {
  const url = await toPng(element, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true });
  const image = await loadImage(url);
  return { url, width: image.width, height: image.height };
}

function imageHeightMm(image: CapturedImage) {
  return (image.height / image.width) * CONTENT_WIDTH_MM;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("PDF görseli hazırlanamadı"));
    image.src = url;
  });
}

function waitForImages(root: HTMLElement) {
  return Promise.all([...root.querySelectorAll("img")].map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("AZG logosu yüklenemedi"));
      })));
}

function buildPdfDom(entries: ProductionEntry[], date: string) {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed", left: "-10000px", top: "0", width: `${RENDER_WIDTH_PX}px`,
    background: "#ffffff", color: "#111827", fontFamily: "Arial, sans-serif", fontSize: "16px",
  });

  const header = document.createElement("header");
  header.dataset.pdfHeader = "true";
  Object.assign(header.style, { display: "grid", gridTemplateColumns: "130px 1fr 160px", alignItems: "center", gap: "16px", borderBottom: "3px solid #111827", paddingBottom: "14px" });
  const logo = document.createElement("img");
  logo.src = "/images/logo-azg.jpeg";
  logo.alt = "AZG";
  Object.assign(logo.style, { width: "112px", height: "64px", objectFit: "contain" });
  const title = document.createElement("strong");
  title.textContent = "AZG MERKEZ GÜNLÜK İŞ PLANI";
  Object.assign(title.style, { textAlign: "center", fontSize: "22px" });
  const dateLabel = document.createElement("strong");
  dateLabel.textContent = `Tarih: ${formatPdfDate(date)}`;
  Object.assign(dateLabel.style, { textAlign: "right", fontSize: "15px" });
  header.append(logo, title, dateLabel);
  root.appendChild(header);

  entries.forEach((entry) => {
    const team = document.createElement("section");
    team.dataset.pdfTeam = "true";
    Object.assign(team.style, { marginTop: "20px", border: "2px solid #111827", borderLeftWidth: "8px", background: "#ffffff" });
    const teamTitle = document.createElement("div");
    teamTitle.textContent = `EKİP ADI: ${entry.team_leader_name_snapshot}`;
    Object.assign(teamTitle.style, { padding: "10px 14px", borderBottom: "2px solid #111827", background: "#f1f5f9", fontWeight: "700" });
    team.appendChild(teamTitle);
    const jobs = document.createElement("div");
    Object.assign(jobs.style, { padding: "12px" });
    entry.jobs.forEach((job, jobIndex) => {
      const jobBlock = document.createElement("div");
      Object.assign(jobBlock.style, { border: "1px solid #111827", padding: "12px", marginBottom: jobIndex === entry.jobs.length - 1 ? "0" : "12px" });
      const jobHeader = document.createElement("div");
      Object.assign(jobHeader.style, { display: "flex", justifyContent: "space-between", gap: "16px", borderBottom: "1px solid #111827", paddingBottom: "8px", marginBottom: "8px", fontWeight: "700" });
      const jobName = document.createElement("span");
      jobName.textContent = `İŞ / PROJE ${jobIndex + 1}`;
      const jobId = document.createElement("span");
      jobId.textContent = `ID: ${job.project_code_snapshot || "-"}`;
      jobHeader.append(jobName, jobId);
      const list = document.createElement("ol");
      Object.assign(list.style, { margin: "0", paddingLeft: "26px" });
      job.items.forEach((item) => {
        const line = document.createElement("li");
        line.textContent = item.unit_snapshot === "SATIR" && Number(item.quantity) === 1
          ? item.item_name_snapshot
          : `${item.item_name_snapshot} — ${Number(item.quantity).toLocaleString("tr-TR")} ${item.unit_snapshot}`;
        Object.assign(line.style, { marginBottom: "7px", lineHeight: "1.45", whiteSpace: "pre-wrap", overflowWrap: "anywhere" });
        list.appendChild(line);
      });
      jobBlock.append(jobHeader, list);
      jobs.appendChild(jobBlock);
    });
    team.appendChild(jobs);
    root.appendChild(team);
  });
  return root;
}

function formatPdfDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}.${month}.${year}` : date;
}
