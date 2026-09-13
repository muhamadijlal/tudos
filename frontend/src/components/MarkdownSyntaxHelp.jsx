// Legenda sintaks Markdown yang didukung ProjectNotesEditor — ditaruh di
// atas editor biar user tau "command" apa aja yang bisa dipakai buat
// styling teks, tanpa harus nebak-nebak sintaks Markdown.
const SYNTAX_ITEMS = [
  { command: "# Judul", description: "Heading (# s/d ###### untuk level 1-6)" },
  { command: "**tebal**", description: "Bold" },
  { command: "*miring*", description: "Italic" },
  { command: "~~coret~~", description: "Strikethrough" },
  { command: "- item", description: "Bullet list" },
  { command: "1. item", description: "Numbered list" },
  { command: "- [ ] tugas", description: "Checklist (centang: - [x])" },
  { command: "> kutipan", description: "Blockquote" },
  { command: "`kode`", description: "Inline code" },
  { command: "```kode```", description: "Code block" },
  { command: "[teks](url)", description: "Link" },
  { command: "![alt](url)", description: "Gambar" },
  { command: "---", description: "Garis pemisah" },
  { command: "| a | b |", description: "Tabel" },
];

export function MarkdownSyntaxHelp() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 border border-border bg-muted/30 p-3 sm:grid-cols-2">
      {SYNTAX_ITEMS.map((item) => (
        <div key={item.command} className="flex items-baseline gap-2 text-xs">
          <code className="shrink-0 rounded-none bg-muted px-1 py-0.5 font-mono text-[11px]">
            {item.command}
          </code>
          <span className="text-muted-foreground">{item.description}</span>
        </div>
      ))}
    </div>
  );
}
