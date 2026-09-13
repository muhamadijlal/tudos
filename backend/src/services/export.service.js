import ExcelJS from "exceljs";
import { createRequire } from "module";
import path from "path";

// pdfmake gak punya export map (`package.json` tanpa "exports"), dan entry
// utamanya (`pdfmake/js/index.js`) itu buat browser doang (nyetel
// urlAccessPolicy/dll lewat window.pdfMake). `pdfmake/js/base.js` itu kelas
// dasarnya sebelum di-extend buat browser — `.createPdf()`-nya otomatis
// ngerakit `URLResolver` dengan bener (kalau bikin `PdfPrinter` manual
// sendiri tanpa urlResolver, resolveUrls() dalemnya bakal throw karena
// `this.urlResolver` undefined). Diimport lewat `createRequire` (bukan
// `import` ESM biasa) soalnya file CJS-nya dibungkus interop Babel yang,
// kalau di-`import` langsung, ke-double-wrap — `require()` gak kena masalah itu.
const require = createRequire(import.meta.url);
const PdfMakeBase = require("pdfmake/js/base.js").default;

// Font Roboto yang emang udah dibundel pdfmake sendiri (buat contoh server-
// side usage-nya) — dipakai apa adanya, gak perlu nyediain font sendiri.
const FONT_DIR = path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto");
const FONTS = {
  Roboto: {
    normal: path.join(FONT_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONT_DIR, "Roboto-Medium.ttf"),
    italics: path.join(FONT_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONT_DIR, "Roboto-MediumItalic.ttf"),
  },
};

// `title`, dipakai juga buat nama file — dibersihin dari karakter yang gak
// valid buat header Content-Disposition/nama file (newline, kutip, slash,
// dll), biar gak ada celah header injection dari client.
export function sanitizeFilename(title) {
  const cleaned = (title || "export").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  return cleaned || "export";
}

// Generik: `columns` = [{key, label, width?}], `rows` = array of object
// (key-nya harus cocok sama `columns[].key`). Data-nya udah difilter di
// frontend (sesuai apa yang lagi ditampilin di halaman itu) — di sini
// tinggal dirender jadi file, gak query DB apa pun, jadi gak ada risiko
// akses data yang gak seharusnya (cuma nge-render apa yang client udah
// punya & udah keliatan di layar).
export async function buildExcelBuffer({ title, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet((title || "Sheet1").slice(0, 31));

  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  for (const row of rows) sheet.addRow(row);

  return workbook.xlsx.writeBuffer();
}

export async function buildPdfBuffer({ title, columns, rows }) {
  const printer = new PdfMakeBase();
  printer.setFonts(FONTS);

  const tableBody = [
    columns.map((c) => ({ text: c.label, bold: true, fillColor: "#e5e7eb" })),
    ...rows.map((row) => columns.map((c) => String(row[c.key] ?? "-"))),
  ];

  const docDefinition = {
    pageOrientation: columns.length > 5 ? "landscape" : "portrait",
    pageMargins: [30, 40, 30, 30],
    content: [
      { text: title, style: "header" },
      { text: `Diekspor pada ${new Date().toLocaleString("id-ID")}`, style: "subheader" },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => "*"),
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: { fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
      subheader: { fontSize: 8, color: "#6b7280", margin: [0, 0, 0, 10] },
    },
    defaultStyle: { fontSize: 8 },
  };

  // `createPdf()` balikin Promise (bukan dokumen langsung) — WAJIB di-await,
  // kalau enggak, rejection dari dalemnya jadi unhandled promise rejection
  // yang bisa nge-crash seluruh proses Node (ini bug awal yang kejadian pas
  // pertama nulis fungsi ini: `resolveUrls()` throw internal, gak ke-catch
  // try/catch di controller sama sekali karena promise-nya gak pernah
  // di-await/di-.catch di sini).
  const doc = await printer.createPdf(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
