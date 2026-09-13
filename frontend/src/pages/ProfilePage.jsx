import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { API_URL, api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { collectErrors, validateEmail, validateNik, validateRequired } from "@/lib/validation";
import { Camera, Key, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

const ALLOWED_PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PICTURE_SIZE = 1 * 1024 * 1024; // 1MB

function fieldsFromUser(user) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    fullName: user?.fullName ?? "",
    nik: user?.nik ?? "",
    department: user?.department ?? "",
    supervisorName: user?.supervisorName ?? "",
    supervisorNik: user?.supervisorNik ?? "",
    supervisorTitle: user?.supervisorTitle ?? "",
  };
}

// Halaman self-service — user login (siapa aja, gak digembok permission
// apa pun) bisa update data pribadinya sendiri di sini, termasuk foto
// profil. Bukan menu utama (gak ada di nav.js), diakses lewat dropdown user
// di header (lihat AppLayout.jsx).
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(() => fieldsFromUser(user));
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [removePictureOpen, setRemovePictureOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  useEffect(() => {
    setForm(fieldsFromUser(user));
  }, [user]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    return collectErrors({
      name: validateRequired(form.name, "Username"),
      email: validateEmail(form.email),
      fullName: validateRequired(form.fullName, "Nama lengkap"),
      nik: validateNik(form.nik),
      department: validateRequired(form.department, "Department"),
      supervisorNik: form.supervisorNik ? validateNik(form.supervisorNik) : null,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.put(`/users/${user.id}`, form);
      updateUser(res.data);
      setFeedback({
        open: true,
        variant: "success",
        title: "Profil berhasil disimpan",
        description: "Data pribadi kamu udah ke-update.",
      });
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menyimpan profil",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function validatePictureFile(file) {
    if (!ALLOWED_PICTURE_TYPES.includes(file.type)) {
      return "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP.";
    }
    if (file.size > MAX_PICTURE_SIZE) {
      return "Ukuran file maksimal 1MB.";
    }
    return null;
  }

  async function handlePictureSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validatePictureFile(file);
    if (error) {
      setFeedback({ open: true, variant: "error", title: "Gagal upload foto", description: error });
      return;
    }

    const formData = new FormData();
    formData.append("profilePicture", file);

    setIsUploadingPicture(true);
    try {
      const res = await api.post(`/users/${user.id}/profile-picture`, formData);
      updateUser(res.data);
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal upload foto",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsUploadingPicture(false);
    }
  }

  async function handleRemovePicture() {
    try {
      const res = await api.delete(`/users/${user.id}/profile-picture`);
      updateUser(res.data);
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus foto",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Foto Profil</CardTitle>
          <CardDescription>
            JPG, PNG, atau WEBP, maksimal 1MB — otomatis di-crop & di-resize ke 300x300.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16">
            {user?.profilePictureUrl && (
              <AvatarImage src={`${API_URL}${user.profilePictureUrl}`} alt={user.name} />
            )}
            <AvatarFallback className="text-lg">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_PICTURE_TYPES.join(",")}
              className="hidden"
              onChange={handlePictureSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingPicture}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingPicture ? <Spinner /> : <Camera />}
              {isUploadingPicture ? "Mengunggah..." : "Upload Foto"}
            </Button>
            {user?.profilePictureUrl && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setRemovePictureOpen(true)}
              >
                <Trash /> Hapus Foto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Pribadi</CardTitle>
          <CardDescription>Data identitas kamu, dipakai juga di laporan Daily Activity.</CardDescription>
          <FormRequiredNote />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-name">
                  Username
                  <RequiredMark />
                </Label>
                <Input
                  id="profile-name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-email">
                  Email
                  <RequiredMark />
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-fullName">
                  Nama Lengkap
                  <RequiredMark />
                </Label>
                <Input
                  id="profile-fullName"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Sesuai identitas resmi (buat laporan Daily Activity)"
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-nik">
                  NIK
                  <RequiredMark />
                </Label>
                <Input
                  id="profile-nik"
                  inputMode="numeric"
                  maxLength={8}
                  aria-invalid={Boolean(fieldErrors.nik)}
                  value={form.nik}
                  onChange={(e) => updateField("nik", e.target.value.replace(/\D/g, ""))}
                />
                {fieldErrors.nik ? (
                  <p className="text-xs text-destructive">{fieldErrors.nik}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Angka doang, 5-8 digit.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="profile-department">
                  Department
                  <RequiredMark />
                </Label>
                <Input
                  id="profile-department"
                  aria-invalid={Boolean(fieldErrors.department)}
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="cth. IT Development"
                />
                {fieldErrors.department && (
                  <p className="text-xs text-destructive">{fieldErrors.department}</p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">Penanggung Jawab Laporan</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-supervisorName">Nama Penanggung Jawab</Label>
                  <Input
                    id="profile-supervisorName"
                    aria-invalid={Boolean(fieldErrors.supervisorName)}
                    value={form.supervisorName}
                    onChange={(e) => updateField("supervisorName", e.target.value)}
                    placeholder="cth. Department Head kamu"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profile-supervisorNik">NIK Penanggung Jawab</Label>
                  <Input
                    id="profile-supervisorNik"
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

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="profile-supervisorTitle">Jabatan Penanggung Jawab</Label>
                  <Input
                    id="profile-supervisorTitle"
                    value={form.supervisorTitle}
                    onChange={(e) => updateField("supervisorTitle", e.target.value)}
                    placeholder="cth. IT Development Department Head"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePasswordOpen(true)}
              >
                <Key /> Ganti Password
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removePictureOpen}
        onOpenChange={setRemovePictureOpen}
        title="Hapus foto profil?"
        description="Foto profil kamu bakal diganti balik ke inisial nama."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleRemovePicture}
      />

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />

      <FeedbackDialog
        open={feedback.open}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        variant={feedback.variant}
        title={feedback.title}
        description={feedback.description}
      />
    </div>
  );
}
