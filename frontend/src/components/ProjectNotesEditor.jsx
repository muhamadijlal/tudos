import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { getCaretCoordinates } from "@/lib/caretPosition";
import { filterSlashCommands, notesGuideText } from "@/lib/slashCommands";
import { cn } from "@/lib/utils";
import { Eye, PencilSimple } from "@phosphor-icons/react";
import "highlight.js/styles/vs2015.css";
import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

// Cari trigger "/" aktif di teks sebelum caret — aktif selama karakter
// setelah "/" sampai caret gak ada spasi/baris baru (ketik spasi = batal).
function detectSlashTrigger(value, cursor) {
  const match = /\/(\S*)$/.exec(value.slice(0, cursor));
  if (!match) return null;
  return { index: match.index, query: match[1] };
}

// Toggle satu baris checklist berdasarkan nomor baris ASLI di source
// Markdown (1-indexed, dari node.position.start.line) — bukan urutan
// render, biar akurat walau komponennya sempat dirender ulang (StrictMode).
function toggleChecklistAtLine(text, line) {
  if (!line) return text;
  const lines = text.split("\n");
  const index = line - 1;
  const target = lines[index];
  if (target === undefined) return text;

  const match = /^(\s*[-*+]\s+)\[([ xX])\](.*)$/.exec(target);
  if (!match) return text;

  const isChecked = match[2].toLowerCase() === "x";
  lines[index] = `${match[1]}[${isChecked ? " " : "x"}]${match[3]}`;
  return lines.join("\n");
}

// react-markdown selalu bikin checkbox checklist `disabled` (cuma buat
// tampilan) — override <li> task-list biar checkbox-nya beneran bisa
// diklik, dengan mapping ke baris sumbernya lewat `node.position`. Di mode
// read-only, checkbox-nya sengaja dibiarin disabled (viewer gak boleh ubah).
function CheckableListItem({ node, className, children, onToggle, readOnly }) {
  const isTask = typeof className === "string" && className.includes("task-list-item");
  if (!isTask) {
    return <li className={className}>{children}</li>;
  }

  const line = node?.position?.start?.line;
  const mappedChildren = Children.map(children, (child) =>
    isValidElement(child) && child.type === "input"
      ? cloneElement(child, {
          disabled: readOnly,
          onChange: readOnly ? undefined : () => onToggle(line),
          className: cn(
            "mr-2 size-4 -translate-y-px align-middle accent-primary",
            readOnly ? "cursor-not-allowed" : "cursor-pointer",
          ),
        })
      : child,
  );

  return <li className={className}>{mappedChildren}</li>;
}

// Editor 1 catatan (mendukung Markdown — heading, bold, list, checklist,
// code block dengan syntax highlighting, dll) ala Notion, tapi cuma
// textarea + preview, gak pakai toolbar/block editor supaya tetap ringan.
// Ketik "/" buat munculin menu command cepat ala Notion. Gak tau/gak peduli
// endpoint-nya — pemanggil yang nentuin cara nyimpennya lewat `onSave`.
export function ProjectNotesEditor({ noteId, content, onSave, readOnly = false }) {
  const [mode, setMode] = useState("preview");
  const [draft, setDraft] = useState(content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [slashMenu, setSlashMenu] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(content ?? "");
    setMode(content ? "preview" : "edit");
    setError("");
  }, [noteId, content]);

  const isDirty = draft !== (content ?? "");

  async function persistNotes(nextContent) {
    setIsSaving(true);
    setError("");
    try {
      await onSave(nextContent);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan catatan.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    const saved = await persistNotes(draft);
    if (saved) {
      setSlashMenu(null);
      setMode("preview");
    }
  }

  function handleCancel() {
    setDraft(content ?? "");
    setError("");
    setSlashMenu(null);
    setMode("preview");
  }

  // Klik checkbox di preview mode langsung persist — gak ada tombol "Simpan"
  // di preview, jadi harus langsung disimpan begitu di-toggle.
  function handleToggleChecklist(line) {
    const next = toggleChecklistAtLine(draft, line);
    if (next === draft) return;
    setDraft(next);
    persistNotes(next);
  }

  function handleChange(e) {
    const el = e.target;
    setDraft(el.value);

    const trigger = detectSlashTrigger(el.value, el.selectionStart);
    if (!trigger) {
      setSlashMenu(null);
      return;
    }

    const coords = getCaretCoordinates(el, el.selectionStart);
    const rect = el.getBoundingClientRect();
    setSlashMenu({
      index: trigger.index,
      query: trigger.query,
      activeIndex: 0,
      top: rect.top + coords.top + coords.height - el.scrollTop,
      left: rect.left + coords.left - el.scrollLeft,
    });
  }

  function applySlashCommand(command) {
    const el = textareaRef.current;
    if (!el || !slashMenu) return;

    const cursor = el.selectionStart;
    const next = draft.slice(0, slashMenu.index) + command.snippet + draft.slice(cursor);
    setDraft(next);
    setSlashMenu(null);

    const placeholderOffset = command.placeholder ? command.snippet.indexOf(command.placeholder) : -1;
    const selStart =
      placeholderOffset === -1 ? slashMenu.index + command.snippet.length : slashMenu.index + placeholderOffset;
    const selEnd = placeholderOffset === -1 ? selStart : selStart + command.placeholder.length;

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function handleKeyDown(e) {
    if (!slashMenu) return;
    const matches = filterSlashCommands(slashMenu.query);
    if (matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashMenu((prev) => ({ ...prev, activeIndex: (prev.activeIndex + 1) % matches.length }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashMenu((prev) => ({
        ...prev,
        activeIndex: (prev.activeIndex - 1 + matches.length) % matches.length,
      }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applySlashCommand(matches[slashMenu.activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSlashMenu(null);
    }
  }

  const slashMatches = slashMenu ? filterSlashCommands(slashMenu.query) : [];

  const isEditMode = !readOnly && mode === "edit";

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "edit" ? "secondary" : "ghost"}
              onClick={() => setMode("edit")}
            >
              <PencilSimple /> Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "preview" ? "secondary" : "ghost"}
              onClick={() => setMode("preview")}
            >
              <Eye /> Preview
            </Button>
          </div>
          {isEditMode && (
            <div className="flex gap-2">
              {isDirty && (
                <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                  Batal
                </Button>
              )}
              <Button type="button" size="sm" disabled={isSaving || !isDirty} onClick={handleSave}>
                {isSaving && <Spinner />}
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isEditMode ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            rows={10}
            placeholder={notesGuideText()}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setSlashMenu(null)}
          />
          {slashMenu && slashMatches.length > 0 && (
            <div
              className="fixed z-50 flex max-h-56 w-56 flex-col gap-0.5 overflow-y-auto rounded-none bg-popover p-1 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
              style={{ top: slashMenu.top, left: slashMenu.left }}
            >
              {slashMatches.map((command, index) => (
                <button
                  key={command.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySlashCommand(command)}
                  className={cn(
                    "flex shrink-0 items-center rounded-none px-2 py-1.5 text-left",
                    index === slashMenu.activeIndex ? "bg-muted text-foreground" : "hover:bg-muted/60",
                  )}
                >
                  {command.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : draft.trim() ? (
        <div
          className={cn(
            "prose prose-sm max-w-none rounded-none border border-border px-3 py-2 dark:prose-invert",
            "prose-headings:font-heading prose-p:leading-relaxed",
            "[&_.task-list-item]:list-none [&_.task-list-item]:pl-0",
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              li: (props) => (
                <CheckableListItem {...props} onToggle={handleToggleChecklist} readOnly={readOnly} />
              ),
            }}
          >
            {draft}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada catatan.</p>
      )}
    </div>
  );
}
