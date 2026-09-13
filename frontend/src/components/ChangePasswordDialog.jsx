import { FeedbackDialog } from "@/components/FeedbackDialog";
import { PasswordInput } from "@/components/PasswordInput";
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
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { collectErrors, validatePassword, validateRequired } from "@/lib/validation";
import { useState } from "react";

const EMPTY_FORM = { currentPassword: "", password: "", passwordConfirmation: "" };
const EMPTY_FEEDBACK = { open: false, variant: "error", title: "", description: "" };

export function ChangePasswordDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validate() {
    return collectErrors({
      currentPassword: validateRequired(form.currentPassword, "Password saat ini"),
      password: validatePassword(form.password),
      passwordConfirmation:
        form.password !== form.passwordConfirmation
          ? "Konfirmasi password tidak cocok"
          : validateRequired(form.passwordConfirmation, "Konfirmasi password"),
    });
  }

  function reset() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/users/${user.id}/password`, form);
      onOpenChange(false);
      reset();
      setFeedback({
        open: true,
        variant: "success",
        title: "Password berhasil diubah",
        description: "Gunakan password baru kamu di login berikutnya.",
      });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(normalizeFieldErrors(err.errors));
      }
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal mengubah password",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
            <DialogDescription>
              Masukkan password saat ini dan password baru kamu.
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">
                Password Saat Ini
                <RequiredMark />
              </Label>
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.currentPassword)}
                value={form.currentPassword}
                onChange={updateField("currentPassword")}
              />
              {fieldErrors.currentPassword && (
                <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">
                Password Baru
                <RequiredMark />
              </Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password)}
                value={form.password}
                onChange={updateField("password")}
              />
              {fieldErrors.password ? (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Min. 8 karakter, kombinasi huruf besar, kecil, angka, dan simbol.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-passwordConfirmation">
                Konfirmasi Password Baru
                <RequiredMark />
              </Label>
              <PasswordInput
                id="new-passwordConfirmation"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                value={form.passwordConfirmation}
                onChange={updateField("passwordConfirmation")}
              />
              {fieldErrors.passwordConfirmation && (
                <p className="text-xs text-destructive">{fieldErrors.passwordConfirmation}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FeedbackDialog
        open={feedback.open}
        onClose={() => setFeedback(EMPTY_FEEDBACK)}
        variant={feedback.variant}
        title={feedback.title}
        description={feedback.description}
      />
    </>
  );
}
