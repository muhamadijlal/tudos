import { FeedbackDialog } from "@/components/FeedbackDialog";
import { MarkdownSyntaxHelp } from "@/components/MarkdownSyntaxHelp";
import { ProjectNotesEditor } from "@/components/ProjectNotesEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { api, ApiError } from "@/lib/api";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Halaman edit 1 catatan spesifik milik project — dibuka dari
// ProjectNotesListPage. Judul auto-save begitu blur dari inputnya, isi
// catatan disunting lewat ProjectNotesEditor (yang auto-save sendiri). Cuma
// owner project yang boleh ubah — selain itu read-only (backend juga nolak
// PATCH/DELETE dari non-owner, ini cuma nyembunyiin kontrolnya di UI).
export default function ProjectNoteDetailPage() {
  const { id: projectId, noteId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [note, setNote] = useState(null);
  const [project, setProject] = useState(null);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  const isOwner = project?.user?.id === currentUser?.id;

  useBreadcrumb([
    { label: "Project", to: "/projects" },
    { label: isLoading ? "..." : (project?.name ?? "Project"), to: `/projects/${projectId}` },
    { label: "Catatan", to: `/projects/${projectId}/notes` },
    { label: isLoading ? "..." : (note?.title ?? "Catatan") },
  ]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    Promise.all([api.get(`/project-notes/${noteId}`), api.get(`/projects/${projectId}`)])
      .then(([noteRes, projectRes]) => {
        if (cancelled) return;
        setNote(noteRes.data);
        setTitle(noteRes.data.title);
        setProject(projectRes.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat catatan.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noteId, projectId]);

  async function handleTitleBlur() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(note.title);
      return;
    }
    if (trimmed === note.title) return;

    try {
      const res = await api.patch(`/project-notes/${noteId}`, { title: trimmed });
      setNote((prev) => ({ ...prev, title: res.data.title }));
      setTitle(res.data.title);
    } catch (err) {
      setTitle(note.title);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal mengubah judul",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  async function handleSaveContent(content) {
    const res = await api.patch(`/project-notes/${noteId}`, { content });
    setNote((prev) => ({ ...prev, content: res.data.content }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/projects/${projectId}/notes`)}
      >
        <ArrowLeft /> Kembali ke daftar catatan
      </Button>

      <Card>
        <CardHeader>
          {isLoading ? (
            <Skeleton className="h-7 w-64" />
          ) : (
            note &&
            (isOwner ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="border-none px-0 font-heading text-sm font-medium shadow-none focus-visible:ring-0"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-heading text-sm font-medium">{note.title}</p>
                <Badge variant="outline">Read only</Badge>
              </div>
            ))
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            note && (
              <>
                {isOwner && <MarkdownSyntaxHelp />}
                <ProjectNotesEditor
                  noteId={note.id}
                  content={note.content}
                  onSave={handleSaveContent}
                  readOnly={!isOwner}
                />
              </>
            )
          )}
        </CardContent>
      </Card>

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
