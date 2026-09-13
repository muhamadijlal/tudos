import { CodeBadge } from "@/components/CodeBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { formatDate } from "@/lib/task";
import { collectErrors, validateRequired } from "@/lib/validation";
import { ArrowLeft, NotePencil, Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Daftar semua "halaman" catatan milik 1 project (ala Notion — 1 project
// bisa punya banyak catatan). Klik judul buka halaman edit catatan itu
// (ProjectNoteDetailPage) di /projects/:id/notes/:noteId.
export default function ProjectNotesListPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  const isOwner = project?.user?.id === currentUser?.id;

  useBreadcrumb([
    { label: "Project", to: "/projects" },
    { label: isLoading ? "..." : (project?.name ?? "Project"), to: `/projects/${projectId}` },
    { label: "Catatan" },
  ]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [projectRes, notesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/notes`),
      ]);
      setProject(projectRes.data);
      setNotes(notesRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat catatan.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setTitle("");
    setFieldErrors({});
    setFormOpen(true);
  }

  function validate() {
    return collectErrors({ title: validateRequired(title, "Judul catatan") });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/notes`, { title });
      setFormOpen(false);
      navigate(`/projects/${projectId}/notes/${res.data.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal membuat catatan",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/project-notes/${deleteTarget.id}`);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus catatan",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        <ArrowLeft /> Kembali
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {project?.code && <CodeBadge>{project.code}</CodeBadge>}
              {project?.name ?? "Catatan Project"}
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Catatan bebas buat project ini — bisa dipakai buat apa aja, gak cuma daftar task."
                : "Cuma pemilik project yang bisa nambah/ubah/hapus catatan — kamu bisa baca aja."}
            </CardDescription>
          </div>
          {isOwner && (
            <Button size="sm" onClick={openCreateForm}>
              <Plus /> Catatan Baru
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
          {!isLoading && notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada catatan buat project ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead className="hidden sm:table-cell">Terakhir Diubah</TableHead>
                  {isOwner && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows columns={isOwner ? 3 : 2} />
                ) : (
                  notes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="flex items-center gap-2 hover:underline"
                          onClick={() => navigate(`/projects/${projectId}/notes/${note.id}`)}
                        >
                          <NotePencil className="shrink-0 text-muted-foreground" />
                          {note.title}
                        </button>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDate(note.updatedAt)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right">
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(note)}>
                            Hapus
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catatan Baru</DialogTitle>
            <DialogDescription>Isi judul catatan, isinya bisa ditulis setelah dibuat.</DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-title">
                Judul
                <RequiredMark />
              </Label>
              <Input
                id="note-title"
                aria-invalid={Boolean(fieldErrors.title)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Membuat..." : "Buat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus catatan "${deleteTarget?.title}"?`}
        description="Aksi ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
      />

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
