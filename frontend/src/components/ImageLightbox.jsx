import { Button } from "@/components/ui/button";
import { X } from "@phosphor-icons/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

// Custom overlay (bukan pakai <Dialog> base-ui) karena komponen ini selalu
// dipakai bersarang di dalam Dialog/Sheet lain yang sudah kebuka (form task,
// detail sheet). Dua Dialog.Root base-ui yang sama-sama modal & kebuka
// bareng bikin logika dismiss (klik luar/Escape) bentrok — klik luar/Escape
// jadi gak reliable nutup yang benar. Overlay manual di sini gak punya
// masalah itu karena cuma bergantung ke onClick backdrop & keydown biasa.
export function ImageLightbox({ open, onOpenChange, src, alt }) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      // Capture phase + stopPropagation biar Escape ini berhenti di sini aja
      // — kalau dibiarin nembus, Dialog/Sheet lain yang lagi kebuka di
      // belakang lightbox (base-ui-nya) ikut denger Escape yang sama dan
      // ikutan ketutup bareng dalam satu kali tekan.
      e.stopPropagation();
      onOpenChange(false);
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onOpenChange]);

  if (!open || !src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Preview gambar"}
      onClick={() => onOpenChange(false)}
      className="fixed inset-0 isolate z-50 flex items-center justify-center bg-black/60 p-4 supports-backdrop-filter:backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl"
      >
        <img
          src={src}
          alt={alt || ""}
          className="max-h-[80vh] w-full rounded-none border border-border bg-popover object-contain"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 bg-popover"
          aria-label="Tutup"
        >
          <X />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
