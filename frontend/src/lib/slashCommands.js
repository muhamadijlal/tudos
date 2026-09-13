// Command yang muncul di popover "/" ala Notion (ProjectNotesEditor) — tiap
// command nyisipin snippet Markdown ke posisi tempat "/" diketik.
// `placeholder` (kalau ada) otomatis ke-select abis disisipkan, biar user
// bisa langsung ngetik buat nimpa teks contohnya. `keywords` dipakai buat
// nyaring command pas user ngetik query setelah "/". `mdHint` — contoh
// sintaks Markdown mentah buat teks panduan di textarea kosong (lihat
// `notesGuideText()` di bawah) — SATU-SATUNYA tempat yang perlu diubah kalau
// nambah/ubah command, biar teks panduannya gak pernah ketinggalan lagi.
export const SLASH_COMMANDS = [
  {
    key: "h1",
    label: "Heading 1",
    keywords: ["heading", "judul", "h1"],
    snippet: "# Judul 1",
    placeholder: "Judul 1",
    mdHint: "# heading",
  },
  {
    key: "h2",
    label: "Heading 2",
    keywords: ["heading", "judul", "h2"],
    snippet: "## Judul 2",
    placeholder: "Judul 2",
    mdHint: null,
  },
  {
    key: "h3",
    label: "Heading 3",
    keywords: ["heading", "judul", "h3"],
    snippet: "### Judul 3",
    placeholder: "Judul 3",
    mdHint: null,
  },
  { key: "bold", label: "Bold", keywords: ["bold", "tebal"], snippet: "**tebal**", placeholder: "tebal", mdHint: "**bold**" },
  {
    key: "italic",
    label: "Italic",
    keywords: ["italic", "miring"],
    snippet: "*miring*",
    placeholder: "miring",
    mdHint: "*italic*",
  },
  {
    key: "strikethrough",
    label: "Strikethrough",
    keywords: ["strikethrough", "coret"],
    snippet: "~~coret~~",
    placeholder: "coret",
    mdHint: "~~coret~~",
  },
  {
    key: "bullet",
    label: "Bullet List",
    keywords: ["bullet", "list", "daftar"],
    snippet: "- List item",
    placeholder: "List item",
    mdHint: "- list",
  },
  {
    key: "numbered",
    label: "Numbered List",
    keywords: ["numbered", "list", "nomor"],
    snippet: "1. List item",
    placeholder: "List item",
    mdHint: "1. list",
  },
  {
    key: "checklist",
    label: "Checklist",
    keywords: ["checklist", "todo", "checkbox", "tugas"],
    snippet: "- [ ] Tugas",
    placeholder: "Tugas",
    mdHint: "- [ ] checklist",
  },
  {
    key: "quote",
    label: "Quote",
    keywords: ["quote", "kutipan"],
    snippet: "> Kutipan",
    placeholder: "Kutipan",
    mdHint: "> quote",
  },
  {
    key: "code",
    label: "Code Block",
    keywords: ["code", "kode", "block"],
    snippet: "```\nkode di sini\n```",
    placeholder: "kode di sini",
    mdHint: "```code```",
  },
  {
    key: "inline-code",
    label: "Inline Code",
    keywords: ["inline", "code", "kode"],
    snippet: "`kode`",
    placeholder: "kode",
    mdHint: "`kode`",
  },
  {
    key: "divider",
    label: "Divider",
    keywords: ["divider", "garis", "pemisah"],
    snippet: "---",
    placeholder: null,
    mdHint: "---",
  },
  {
    key: "table",
    label: "Table",
    keywords: ["table", "tabel"],
    snippet: "| a | b |\n| --- | --- |\n| 1 | 2 |",
    placeholder: null,
    mdHint: "tabel",
  },
];

export function filterSlashCommands(query) {
  if (!query) return SLASH_COMMANDS;
  const q = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q)),
  );
}

// Teks panduan di textarea kosong — di-generate dari SLASH_COMMANDS
// (bukan diketik manual) biar gak ada lagi command baru yang lupa
// ditambahin ke panduannya (`mdHint: null` buat command yang cuma variasi
// dari command lain, mis. Heading 2/3, gak usah diulang di sini).
export function notesGuideText() {
  const commandNames = SLASH_COMMANDS.map((c) => c.label.toLowerCase()).join(", ");
  const mdHints = SLASH_COMMANDS.filter((c) => c.mdHint).map((c) => c.mdHint).join(", ");
  return `Tulis catatan bebas di sini... ketik '/' buat menu format cepat (${commandNames}), atau pakai Markdown langsung (${mdHints})`;
}
