import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { exportDailyActivity } from "@/lib/export";
import { collectErrors, validateNik, validateRequired } from "@/lib/validation";
import { useEffect, useState } from "react";

const EMPTY_FORM = {
  fullName: "",
  nik: "",
  department: "",
  supervisorName: "",
  supervisorNik: "",
  supervisorTitle: "",
};

// Popup export "Daily Activity" (.xlsx). Nama Lengkap/NIK/Department itu
// identitas resmi user sendiri — normalnya udah keisi pas register, jadi di
// sini cuma ditampilin read-only. User lama (daftar sebelum field ini ada)
// yang belum punya data itu bakal ngeliat inputnya di sini, wajib dilengkapi
// dulu baru bisa export. Nama/NIK/Jabatan Penanggung Jawab (atasan) selalu
// bisa diedit tiap export, disimpen ke profil user biar gak nanya ulang.
export function DailyActivityExportDialog({ open, onOpenChange, tasks, onError }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileComplete = Boolean(user?.fullName && user?.nik && user?.department);

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      fullName: user.fullName || "",
      nik: user.nik || "",
      department: user.department || "",
      supervisorName: user.supervisorName || "",
      supervisorNik: user.supervisorNik || "",
      supervisorTitle: user.supervisorTitle || "",
    });
    setFieldErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    return collectErrors({
      ...(profileComplete
        ? {}
        : {
            fullName: validateRequired(form.fullName, "Nama lengkap"),
            nik: validateNik(form.nik),
            department: validateRequired(form.department, "Department"),
          }),
      supervisorName: validateRequired(form.supervisorName, "Nama penanggung jawab"),
      supervisorNik: validateNik(form.supervisorNik),
      supervisorTitle: validateRequired(form.supervisorTitle, "Jabatan penanggung jawab"),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.put(`/users/${user.id}`, {
        name: user.name,
        email: user.email,
        ...(profileComplete
          ? {}
          : { fullName: form.fullName, nik: form.nik, department: form.department }),
        supervisorName: form.supervisorName,
        supervisorNik: form.supervisorNik,
        supervisorTitle: form.supervisorTitle,
      });
      updateUser(res.data);
      await exportDailyActivity({ tasks, profile: form });
      onOpenChange(false);
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : "Gagal membuat file export.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Daily Activity</DialogTitle>
          <DialogDescription>
            Task dikelompokkan per hari (berdasarkan tanggal dibuat) — Sabtu/Minggu/libur nasional
            dikosongin & digeser ke hari kerja berikutnya. Data Penanggung Jawab disimpen ke profil
            kamu, jadi gak perlu diisi ulang tiap export.
          </DialogDescription>
          <FormRequiredNote />
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {profileComplete ? (
            <div className="flex flex-col gap-1 border border-border bg-muted/30 p-3 text-xs">
              <span className="text-muted-foreground">
                Nama: <span className="text-foreground">{form.fullName}</span>
              </span>
              <span className="text-muted-foreground">
                NIK: <span className="text-foreground">{form.nik}</span>
              </span>
              <span className="text-muted-foreground">
                Department: <span className="text-foreground">{form.department}</span>
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="daily-full-name">
                  Nama Lengkap
                  <RequiredMark />
                </Label>
                <Input
                  id="daily-full-name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="daily-nik">
                  NIK
                  <RequiredMark />
                </Label>
                <Input
                  id="daily-nik"
                  inputMode="numeric"
                  maxLength={8}
                  aria-invalid={Boolean(fieldErrors.nik)}
                  value={form.nik}
                  onChange={(e) => updateField("nik", e.target.value.replace(/\D/g, ""))}
                />
                {fieldErrors.nik && <p className="text-xs text-destructive">{fieldErrors.nik}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="daily-department">
                  Department
                  <RequiredMark />
                </Label>
                <Input
                  id="daily-department"
                  aria-invalid={Boolean(fieldErrors.department)}
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="cth. IT Development"
                />
                {fieldErrors.department && (
                  <p className="text-xs text-destructive">{fieldErrors.department}</p>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="daily-supervisor-name">
              Nama Penanggung Jawab
              <RequiredMark />
            </Label>
            <Input
              id="daily-supervisor-name"
              aria-invalid={Boolean(fieldErrors.supervisorName)}
              value={form.supervisorName}
              onChange={(e) => updateField("supervisorName", e.target.value)}
              placeholder="cth. Department Head kamu"
            />
            {fieldErrors.supervisorName && (
              <p className="text-xs text-destructive">{fieldErrors.supervisorName}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="daily-supervisor-nik">
              NIK Penanggung Jawab
              <RequiredMark />
            </Label>
            <Input
              id="daily-supervisor-nik"
              inputMode="numeric"
              maxLength={8}
              aria-invalid={Boolean(fieldErrors.supervisorNik)}
              value={form.supervisorNik}
              onChange={(e) => updateField("supervisorNik", e.target.value.replace(/\D/g, ""))}
            />
            {fieldErrors.supervisorNik && (
              <p className="text-xs text-destructive">{fieldErrors.supervisorNik}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="daily-supervisor-title">
              Jabatan Penanggung Jawab
              <RequiredMark />
            </Label>
            <Input
              id="daily-supervisor-title"
              aria-invalid={Boolean(fieldErrors.supervisorTitle)}
              value={form.supervisorTitle}
              onChange={(e) => updateField("supervisorTitle", e.target.value)}
              placeholder="cth. IT Development Department Head"
            />
            {fieldErrors.supervisorTitle && (
              <p className="text-xs text-destructive">{fieldErrors.supervisorTitle}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Membuat..." : "Export"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
