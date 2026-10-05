import type { InventoryCatalog, InventoryMaterial, InventoryStockCategory } from "@/types/inventory";
import { INVENTORY_STOCK_CATEGORIES, INVENTORY_UNITS } from "@/lib/constants/inventory";

export async function downloadInventoryStockExcel(options: {
  catalogs: InventoryCatalog[];
  materials: InventoryMaterial[];
  categories: InventoryStockCategory[];
  fileName: string;
}) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Malzeme Stok");

  worksheet.columns = [
    { header: "Sıra", key: "sequence", width: 7 },
    { header: "Kategori", key: "category", width: 22 },
    { header: "Malzeme Adı", key: "materialName", width: 32 },
    { header: "Tür", key: "materialType", width: 18 },
    { header: "Malzeme ID", key: "materialCode", width: 18 },
    { header: "Birim", key: "unit", width: 10 },
    { header: "Merkez Depo Stok", key: "center", width: 18 },
  ];

  const unitLabel = (unit: InventoryCatalog["unit"]) => INVENTORY_UNITS.find((item) => item.value === unit)?.label ?? unit;
  let sequence = 0;
  for (const category of INVENTORY_STOCK_CATEGORIES.filter((item) => options.categories.includes(item.value))) {
    const catalogs = options.catalogs
      .filter((catalog) => catalog.stock_category === category.value)
      .sort((a, b) => a.material_name.localeCompare(b.material_name, "tr"));
    for (const catalog of catalogs) {
      const base = { category: category.label, materialName: catalog.material_name, materialType: catalog.material_type ?? "" };
      // Yalnızca Merkez Depo stoğu raporlanır; Biga'ya tamamen sevk edilmiş ID'ler listelenmez.
      const lots = options.materials.filter((item) => item.catalog_id === catalog.id && Number(item.stock_quantity) > 0);
      if (!lots.length) {
        worksheet.addRow({ sequence: ++sequence, ...base, materialCode: "", unit: unitLabel(catalog.unit), center: 0 });
        continue;
      }
      for (const lot of lots) {
        worksheet.addRow({ sequence: ++sequence, ...base, materialCode: lot.material_code ?? "", unit: unitLabel(lot.unit), center: Math.round(Number(lot.stock_quantity)) });
      }
    }
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.getColumn("materialCode").numFmt = "@";
  worksheet.getColumn("center").numFmt = "0";
  worksheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 28 : 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle", horizontal: rowNumber === 1 ? "center" : "left" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    if (rowNumber > 1) {
      for (const key of ["sequence", "center"]) row.getCell(key).alignment = { vertical: "middle", horizontal: "right" };
    }
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `${worksheet.getColumn(worksheet.columnCount).letter}1` };
  worksheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
