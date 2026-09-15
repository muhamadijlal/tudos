import { FeedbackDialog } from "@/components/FeedbackDialog";
import { PasswordInput } from "@/components/PasswordInput";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { ApiError, normalizeFieldErrors } from "@/lib/api";
import { getDefaultPath } from "@/lib/nav";
import { collectErrors, validateEmail, validateRequired } from "@/lib/validation";
import { APP_VERSION } from "@/lib/version";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const EMPTY_DIALOG = { open: false, variant: "success", title: "", description: "", action: null };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState(EMPTY_DIALOG);

  function validate() {
    return collectErrors({
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      setDialog({
        open: true,
        variant: "success",
        title: "Login berhasil",
        description: "Kamu akan diarahkan ke halaman utama.",
        action: getDefaultPath(loggedInUser),
      });
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(normalizeFieldErrors(err.errors));
      }
      setDialog({
        open: true,
        variant: "error",
        title: "Gagal login",
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
    if (action) navigate(action, { replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk ke Tudos</CardTitle>
          <CardDescription>Masukkan email dan password akunmu</CardDescription>
          <FormRequiredNote />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Belum punya akun?{" "}
              <Link to="/register" className="text-primary underline underline-offset-4">
                Daftar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

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
