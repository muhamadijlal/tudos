import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { statusLabel } from "@/lib/task";
import { useEffect, useState } from "react";

// Copy dialog beda-beda tergantung jenis transisinya (lihat
// requiresReviewNote di lib/task.js) — biar gak semua kasus keliatan kayak
// "reject", padahal ada 3 makna beda: dikembalikan reviewer, diajukan buat
// direview, atau dibuka lagi setelah Done.
function getDialogCopy(fromStatus, toStatus) {
  if (fromStatus === "in_review") {
    return {
      title: `Kembalikan ke ${statusLabel(toStatus)}`,
      description: "Kasih catatan buat assignee, jelasin kenapa task ini dikembalikan dari In Review.",
      submitLabel: "Kembalikan",
    };
  }
  if (toStatus === "in_review") {
    return {
      title: "Ajukan untuk Review",
      description: "Kasih catatan singkat soal apa yang udah dikerjakan, biar reviewer gampang ngecek.",
      submitLabel: "Ajukan",
    };
  }
  if (fromStatus === "done") {
    return {
      title: `Buka Kembali ke ${statusLabel(toStatus)}`,
      description: "Kasih catatan kenapa task yang udah Done ini dibuka lagi.",
      submitLabel: "Buka Kembali",
    };
  }
  return {
    title: `Ubah Status ke ${statusLabel(toStatus)}`,
    description: "Kasih catatan buat perubahan status ini.",
    submitLabel: "Simpan",
  };
}

// Dialog buat minta catatan wajib waktu status task berubah lewat salah satu
// transisi yang butuh penjelasan (lihat requiresReviewNote di lib/task.js) —
// dipakai bareng dari TudosPage, KanbanPage (drag & drop), ReviewPendingPage,
// dan TaskFormDialog biar perilakunya konsisten di semua tempat status task
// bisa diubah.
export function ReviewNoteDialog({ open, onOpenChange, fromStatus, toStatus, onSubmit }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote("");
      setError("");
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Catatan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch {
      // Dialog tetap kebuka biar user bisa coba lagi — pesan error-nya
      // ditampilin lewat FeedbackDialog di halaman pemanggil.
    } finally {
      setIsSubmitting(false);
    }
  }

  const copy = getDialogCopy(fromStatus, toStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
          <FormRequiredNote />
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-note">
              Catatan
              <RequiredMark />
            </Label>
            <Textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Menyimpan..." : copy.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
