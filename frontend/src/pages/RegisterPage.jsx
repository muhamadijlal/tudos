import { FeedbackDialog } from "@/components/FeedbackDialog";
import { PasswordInput } from "@/components/PasswordInput";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { ApiError, normalizeFieldErrors } from "@/lib/api";
import {
  collectErrors,
  validateEmail,
  validateNik,
  validatePassword,
  validateRequired,
} from "@/lib/validation";
import { APP_VERSION } from "@/lib/version";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const EMPTY_DIALOG = { open: false, variant: "success", title: "", description: "", action: null };

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    fullName: "",
    nik: "",
    department: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState(EMPTY_DIALOG);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function validate() {
    return collectErrors({
      name: validateRequired(form.name, "Username"),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      passwordConfirmation:
        form.password !== form.passwordConfirmation
          ? "Konfirmasi password tidak cocok"
          : validateRequired(form.passwordConfirmation, "Konfirmasi password"),
      fullName: validateRequired(form.fullName, "Nama lengkap"),
      nik: validateNik(form.nik),
      department: validateRequired(form.department, "Department"),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register(form);
      setDialog({
        open: true,
        variant: "success",
        title: "Registrasi berhasil",
        description: "Silakan login dengan akun barumu.",
        action: "login",
      });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(normalizeFieldErrors(err.errors));
      }
      setDialog({
        open: true,
        variant: "error",
        title: "Gagal mendaftar",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
        action: null,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeDialog() {
    const { action } = dialog;
    setDialog(EMPTY_DIALOG);
    if (action === "login") navigate("/login", { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-xl flex-col items-center gap-4">
        <img src="/icon.png" alt="Tudos" className="h-16 w-16" />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Buat akun Tudos</CardTitle>
          <CardDescription>Isi data di bawah untuk mendaftar</CardDescription>
          <FormRequiredNote />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">
                  Username
                  <RequiredMark />
                </Label>
                <Input
                  id="name"
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.name)}
                  value={form.name}
                  onChange={updateField("name")}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">
                  Email
                  <RequiredMark />
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  value={form.email}
                  onChange={updateField("email")}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">
                  Password
                  <RequiredMark />
                </Label>
                <PasswordInput
                  id="password"
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
                <Label htmlFor="passwordConfirmation">
                  Konfirmasi Password
                  <RequiredMark />
                </Label>
                <PasswordInput
                  id="passwordConfirmation"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                  value={form.passwordConfirmation}
                  onChange={updateField("passwordConfirmation")}
                />
                {fieldErrors.passwordConfirmation && (
                  <p className="text-xs text-destructive">{fieldErrors.passwordConfirmation}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">
                  Nama Lengkap
                  <RequiredMark />
                </Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  value={form.fullName}
                  onChange={updateField("fullName")}
                  placeholder="Sesuai identitas resmi (buat laporan Daily Activity)"
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nik">
                  NIK
                  <RequiredMark />
                </Label>
                <Input
                  id="nik"
                  inputMode="numeric"
                  maxLength={8}
                  aria-invalid={Boolean(fieldErrors.nik)}
                  value={form.nik}
                  onChange={(e) =>
                    updateField("nik")({ target: { value: e.target.value.replace(/\D/g, "") } })
                  }
                />
                {fieldErrors.nik ? (
                  <p className="text-xs text-destructive">{fieldErrors.nik}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Angka doang, 5-8 digit.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="department">
                  Department
                  <RequiredMark />
                </Label>
                <Input
                  id="department"
                  aria-invalid={Boolean(fieldErrors.department)}
                  value={form.department}
                  onChange={updateField("department")}
                  placeholder="cth. IT Development"
                />
                {fieldErrors.department && (
                  <p className="text-xs text-destructive">{fieldErrors.department}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Memproses..." : "Daftar"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Sudah punya akun?{" "}
              <Link to="/login" className="text-primary underline underline-offset-4">
                Masuk
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>

      <FeedbackDialog
        open={dialog.open}
        onClose={closeDialog}
        variant={dialog.variant}
        title={dialog.title}
        description={dialog.description}
      />

      <p className="fixed bottom-3 left-1/2 -translate-x-1/2 text-center text-[10px] text-muted-foreground">
        v{APP_VERSION}
      </p>
    </div>
  );
}
