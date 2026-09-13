import { ImageLightbox } from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";
import { fetchFileBlob } from "@/lib/api";
import {
  ATTACHMENT_ACCEPT,
  formatFileSize,
  getExtension,
  isImageName,
  MAX_ATTACHMENT_COUNT,
  validateAttachment,
} from "@/lib/file";
import { cn } from "@/lib/utils";
import {
  FileCsv,
  FileIcon,
  FilePdf,
  FileXls,
  Spinner,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

function iconFor(name) {
  switch (getExtension(name)) {
    case "pdf":
      return FilePdf;
    case "xlsx":
    case "xls":
      return FileXls;
    case "csv":
      return FileCsv;
    default:
      return FileIcon;
  }
}

// Chip buat 1 file yang baru dipilih di device (belum keupload).
function LocalAttachmentChip({ file, onOpen, onRemove, disabled }) {
  const Icon = iconFor(file.name);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Bikin & revoke object URL-nya di effect yang sama (bukan useMemo + effect
  // terpisah) — kalau dipisah, StrictMode dev bakal jalanin mount->cleanup->mount
  // dan revoke URL yang lagi dipakai <img> sebelum sempat kemuat (race).
  useEffect(() => {
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex items-center gap-2 border border-border bg-muted/40 px-2 py-1.5">
      <button
        type="button"
        onClick={() => onOpen(previewUrl)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {previewUrl ? (
          <img src={previewUrl} alt={file.name} className="size-8 shrink-0 rounded-none border border-border object-cover" />
        ) : (
          <Icon className="size-8 shrink-0 text-muted-foreground" weight="duotone" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs">{file.name}</span>
          <span className="block text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Hapus lampiran"
      >
        <X />
      </Button>
    </div>
  );
}

// Chip buat 1 file yang udah ada di server (dari task.attachments).
function ExistingAttachmentChip({ attachment, onOpen, onRemove, disabled, readOnly }) {
  const Icon = iconFor(attachment.name);
  const isImage = isImageName(attachment.name);
  const [remoteBlobUrl, setRemoteBlobUrl] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    let objectUrl = null;
    setRemoteLoading(true);
    fetchFileBlob(attachment.url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setRemoteBlobUrl(objectUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRemoteLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isImage, attachment.url]);

  async function handleOpen() {
    if (isImage) {
      if (remoteBlobUrl) onOpen(remoteBlobUrl);
      return;
    }
    try {
      const blob = await fetchFileBlob(attachment.url);
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    } catch {
      // noop
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 border border-border bg-muted/40 px-2 py-1.5">
      <button
        type="button"
        onClick={handleOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {isImage ? (
          remoteBlobUrl ? (
            <img src={remoteBlobUrl} alt={attachment.name} className="size-8 shrink-0 rounded-none border border-border object-cover" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center border border-border">
              {remoteLoading && <Spinner className="size-4 animate-spin text-muted-foreground" />}
            </span>
          )
        ) : (
          <Icon className="size-8 shrink-0 text-muted-foreground" weight="duotone" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs">{attachment.name}</span>
      </button>
      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled || removing}
          onClick={handleRemove}
          aria-label="Hapus lampiran"
        >
          {removing ? <Spinner className="animate-spin" /> : <X />}
        </Button>
      )}
    </div>
  );
}

// Field lampiran multi-file. `existing` = attachment yang udah tersimpan di
// server ({id, name, url}[]), `files` = file baru yang barusan dipilih user
// dan belum keupload (File[]). Hapus attachment existing langsung manggil
// `onExistingRemove` (API call ke server), sedangkan file baru cuma dilepas
// dari state lokal lewat `onFileRemove`.
export function AttachmentsField({
  files = [],
  existing = [],
  onFilesAdd,
  onFileRemove,
  onExistingRemove,
  disabled,
  readOnly = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const total = files.length + existing.length;
  const remainingSlots = MAX_ATTACHMENT_COUNT - total;
  const dropDisabled = disabled || remainingSlots <= 0;

  function processFiles(picked) {
    if (picked.length === 0) return;

    if (picked.length > remainingSlots) {
      setError(`Maksimal ${MAX_ATTACHMENT_COUNT} lampiran per task.`);
      return;
    }

    for (const file of picked) {
      const message = validateAttachment(file);
      if (message) {
        setError(message);
        return;
      }
    }

    setError(null);
    onFilesAdd(picked);
  }

  function handlePick(e) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    processFiles(picked);
  }

  function handleDragEnter(e) {
    e.preventDefault();
    if (dropDisabled) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    if (dropDisabled) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (dropDisabled) return;
    processFiles(Array.from(e.dataTransfer.files ?? []));
  }

  const hasItems = total > 0;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={handlePick}
      />

      {hasItems ? (
        <div className="flex flex-col gap-1.5">
          {existing.map((attachment) => (
            <ExistingAttachmentChip
              key={`existing-${attachment.id}`}
              attachment={attachment}
              onOpen={setLightboxSrc}
              onRemove={() => onExistingRemove(attachment.id)}
              disabled={disabled}
              readOnly={readOnly}
            />
          ))}
          {files.map((file, index) => (
            <LocalAttachmentChip
              key={`local-${index}-${file.name}`}
              file={file}
              onOpen={setLightboxSrc}
              onRemove={() => onFileRemove(index)}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        readOnly && <p className="text-xs text-muted-foreground">Tidak ada lampiran.</p>
      )}

      {!readOnly && (
        <>
          <button
            type="button"
            data-slot="attachments-dropzone"
            disabled={dropDisabled}
            onClick={() => inputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-1 border border-dashed border-border text-center transition-colors disabled:pointer-events-none disabled:opacity-50",
              hasItems ? "px-3 py-3" : "px-3 py-6",
              isDragging ? "border-primary bg-primary/5" : "hover:border-foreground/40 hover:bg-muted/40",
            )}
          >
            <UploadSimple className={cn("text-muted-foreground", isDragging && "text-primary")} />
            <span className="text-xs">
              <span className="font-medium text-foreground">Klik untuk pilih file</span>{" "}
              <span className="text-muted-foreground">atau seret &amp; taruh di sini</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {remainingSlots > 0
                ? `Maks ${MAX_ATTACHMENT_COUNT} file, masing-masing 2MB. JPG, PNG, XLSX, XLS, CSV, atau PDF.`
                : "Sudah mencapai batas maksimal lampiran."}
            </span>
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}

      <ImageLightbox
        open={Boolean(lightboxSrc)}
        onOpenChange={(open) => !open && setLightboxSrc(null)}
        src={lightboxSrc}
      />
    </div>
  );
}
