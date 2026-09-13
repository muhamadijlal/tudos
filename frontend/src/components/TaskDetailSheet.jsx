import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AttachmentsField } from "@/components/AttachmentsField";
import { CodeBadge } from "@/components/CodeBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import {
  describeStatusTransition,
  formatDate,
  formatDateTime,
  PRIORITY_STYLES,
  priorityLabel,
  statusLabel,
  STATUS_STYLES,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { ArrowsLeftRight, CheckCircle, PlayCircle, Trash, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-heading text-sm font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

// Kelompokin komentar UTAMA (bukan balasan) bareng perubahan status yang
// paling deket sebelum komentar itu terjadi, lalu diratakan jadi 1 list
// "blok" berurutan (status-line & comment-thread jadi sibling sejajar) —
// masing-masing blok dikasih pembatas border-bottom tipis di render-nya.
// Balasan gak ikut proses ini — dia selalu nempel ke komentar utamanya lewat
// repliesByParent, gak peduli kapan balasannya sendiri terjadi, biar 1 thread
// percakapan gak kepecah ke blok yang beda.
function buildActivityBlocks(comments, history) {
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map();
  for (const c of comments) {
    if (!c.parentId) continue;
    if (!repliesByParent.has(c.parentId)) repliesByParent.set(c.parentId, []);
    repliesByParent.get(c.parentId).push(c);
  }
  for (const replies of repliesByParent.values()) {
    replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  const items = [
    ...rootComments.map((c) => ({ type: "comment", at: c.createdAt, data: c })),
    ...history.map((h) => ({ type: "status", at: h.createdAt, data: h })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));

  const blocks = items.map((item, i) => ({
    key: item.type === "status" ? `s${item.data.id}` : `c${item.data.id}`,
    type: item.type,
    data: item.data,
    isLast: i === items.length - 1,
  }));

  return { blocks, repliesByParent };
}

// Gaya (tone) per jenis transisi — cuma nge-warnain TEKS/ikonnya, bukan
// background/border item-nya (item komentar/status sengaja polos, gak ada
// kotak pembungkus). "amber" = transisi yang wajib catatan (dikembalikan/
// diajukan review/dibuka lagi), "green" = disetujui jadi Done, "blue" = mulai
// dikerjakan (Todo -> In Progress), "default" = transisi bebas lainnya.
function getTransitionTone(entry) {
  if (!entry) return "default";
  if (entry.note) return "amber";
  if (entry.fromStatus === "in_review" && entry.toStatus === "done") return "green";
  if (entry.fromStatus === "todo" && entry.toStatus === "in_progress") return "blue";
  return "default";
}

const TONE_TEXT = {
  amber: "text-amber-700 dark:text-amber-300",
  blue: "text-blue-600 dark:text-blue-300",
  green: "text-emerald-600 dark:text-emerald-300",
  default: null,
};

const TONE_ICON = {
  amber: WarningCircle,
  blue: PlayCircle,
  green: CheckCircle,
  default: null,
};

// Ukuran avatar di feed Aktivitas disamain (xs) buat komentar (utama & balasan)
// maupun baris perubahan status, biar keliatan seragam sebagai 1 feed.
const ACTIVITY_AVATAR_SIZE = "xs";

// Template 2 kolom yang dipakai bareng StatusChangeLine & CommentBubble:
// kolom 1 avatar (lebar tetap), kolom 2 { nama+tanggal di atas, isi di bawah }.
// `id`+`className` diteruskan biar CommentBubble bisa di-highlight & di-scroll
// -in-view (dari notifikasi komentar/balasan) tanpa perlu di-refactor ulang.
function ActivityRow({ id, avatarId, avatarName, header, children, className }) {
  return (
    <div
      id={id}
      className={cn(
        "-mx-1.5 flex items-start gap-2 px-1.5 py-1 transition-colors duration-1000 ease-out",
        className,
      )}
    >
      <AssigneeAvatar id={avatarId} name={avatarName} size={ACTIVITY_AVATAR_SIZE} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {header}
        {children}
      </div>
    </div>
  );
}

function StatusChangeLine({ entry }) {
  const tone = getTransitionTone(entry);
  const toneText = TONE_TEXT[tone];
  // Fallback ke ikon panah generik kalau tone-nya "default" (transisi bebas,
  // gak ada warna khusus) — biar SEMUA baris perubahan status tetep kepakai
  // ikon, bukan cuma yang ber-tone, jadi konsisten kebaca sebagai "ini bukan
  // komentar" di sekilas pandang.
  const ToneIcon = TONE_ICON[tone] ?? ArrowsLeftRight;
  return (
    <ActivityRow
      avatarId={entry.user?.id}
      avatarName={entry.user?.name}
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">{entry.user?.name ?? "-"}</span>
          <span className="shrink-0 text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
        </div>
      }
    >
      <p className={cn("flex items-center gap-1 italic", toneText ?? "text-muted-foreground")}>
        <ToneIcon className="size-3.5 shrink-0" />
        {describeStatusTransition(entry.fromStatus, entry.toStatus)} {statusLabel(entry.fromStatus)}{" "}
        → {statusLabel(entry.toStatus)}
      </p>
      {entry.note && (
        <p
          className={cn(
            "break-words whitespace-pre-wrap p-2 text-foreground",
            tone === "amber" && "border-l-2 border-amber-500/50 bg-amber-500/10",
          )}
        >
          "{entry.note}"
        </p>
      )}
    </ActivityRow>
  );
}

// 1 baris komentar doang (avatar, nama, tanggal, isi, tombol hapus) — dipakai
// buat komentar utama maupun balasan. Gak ada aksi "Balas"/"Suka" di sini,
// itu cuma ada di level thread (CommentThread), bukan per-bubble, biar
// balasan gak bisa dibales lagi (maksimal 2 level).
function CommentBubble({ comment, currentUser, onDelete, highlighted }) {
  return (
    <ActivityRow
      id={`comment-${comment.id}`}
      className={highlighted ? "bg-blue-500/20" : "bg-transparent"}
      avatarId={comment.user?.id}
      avatarName={comment.user?.name}
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">{comment.user?.name ?? "-"}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
            {comment.user?.id === currentUser?.id && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Hapus komentar"
              >
                <Trash className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      }
    >
      <p className="whitespace-pre-wrap break-words">{comment.content}</p>
    </ActivityRow>
  );
}

// 1 komentar utama + balasan-balasannya (maksimal 2 level, ala thread
// komentar blog — cuma "Balas" doang, gak ada "Suka"). Balasan ditoggle
// tampil/sembunyi, form balas baru muncul begitu "Balas" diklik. Balasannya
// sendiri menjorok ke dalam (garis + indent) biar kebaca sebagai child.
function CommentThread({ comment, replies, currentUser, onDelete, onReply, locked, highlightedCommentId }) {
  const [showReplies, setShowReplies] = useState(true);
  // { id, name } dari komentar/balasan yang lagi "diklik Balas"-nya — bisa
  // komentar utama ATAU salah satu balasan (biar bisa "balas ke balasan").
  // Hasilnya tetep disimpen sejajar (sibling) di bawah komentar utama yang
  // sama, gak jadi child baru — backend yang ngeratain, di sini cukup kirim
  // id target-nya aja apa adanya.
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  function toggleReplyTo(target) {
    setReplyTarget((prev) => (prev?.id === target.id ? null : { id: target.id, name: target.user?.name }));
  }

  async function handleSubmitReply(e) {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || !replyTarget) return;

    setIsSubmittingReply(true);
    try {
      await onReply(replyTarget.id, trimmed);
      setReplyText("");
      setReplyTarget(null);
      setShowReplies(true);
    } catch {
      // Form tetap kebuka biar user bisa coba lagi — error udah ditampilin
      // lewat activityError di komponen induk.
    } finally {
      setIsSubmittingReply(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <CommentBubble
        comment={comment}
        currentUser={currentUser}
        onDelete={onDelete}
        highlighted={comment.id === highlightedCommentId}
      />

      <div className="flex items-center gap-3 pl-7 text-muted-foreground">
        {replies.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReplies((prev) => !prev)}
            className="hover:text-foreground"
          >
            {showReplies ? "Sembunyikan Balasan" : `${replies.length} Balasan`}
          </button>
        )}
        {!locked && (
          <button
            type="button"
            onClick={() => toggleReplyTo(comment)}
            className="font-medium hover:text-foreground"
          >
            Balas
          </button>
        )}
      </div>

      {showReplies && replies.length > 0 && (
        <div className="flex flex-col gap-3 border-l-2 border-border pl-6">
          {replies.map((reply) => (
            <div key={reply.id} className="flex flex-col gap-1">
              <CommentBubble
                comment={reply}
                currentUser={currentUser}
                onDelete={onDelete}
                highlighted={reply.id === highlightedCommentId}
              />
              {!locked && (
                <button
                  type="button"
                  onClick={() => toggleReplyTo(reply)}
                  className="self-start pl-7 font-medium text-muted-foreground hover:text-foreground"
                >
                  Balas
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {replyTarget && (
        <form onSubmit={handleSubmitReply} className="flex flex-col gap-2 pl-7">
          {replyTarget.id !== comment.id && (
            <p className="text-muted-foreground">
              Membalas <span className="font-medium text-foreground">{replyTarget.name}</span>
            </p>
          )}
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tulis balasan..."
            rows={2}
            autoFocus
          />
          <div className="flex items-center gap-2 self-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setReplyTarget(null)}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmittingReply || !replyText.trim()}>
              {isSubmittingReply && <Spinner />}
              {isSubmittingReply ? "Mengirim..." : "Kirim"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Detail 1 task — read-only buat data intinya (deskripsi/assignee/dll),
// tapi komentar bisa diliat & ditambah dari sini (edit status sendiri tetap
// lewat Combobox di tabel/board, bukan dari sheet ini).
export function TaskDetailSheet({ open, onOpenChange, task, highlightCommentId }) {
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);

  useEffect(() => {
    if (!open || !task?.id) return;
    let cancelled = false;
    setIsLoadingActivity(true);
    setActivityError("");
    setCommentText("");
    setIsAddingComment(false);
    Promise.all([api.get(`/tasks/${task.id}/comments`), api.get(`/tasks/${task.id}/history`)])
      .then(([commentsRes, historyRes]) => {
        if (cancelled) return;
        setComments(commentsRes.data);
        setHistory(historyRes.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setActivityError(err instanceof ApiError ? err.message : "Gagal memuat aktivitas task.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingActivity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, task?.id]);

  // Highlight sementara buat komentar/balasan yang dituju dari notifikasi —
  // ilang sendiri (transition-colors di ActivityRow yang ngurus animasinya)
  // setelah beberapa detik, biar user "diberi petunjuk" tanpa nempel selamanya.
  useEffect(() => {
    if (!open || !highlightCommentId) return;
    setHighlightedCommentId(highlightCommentId);
    const timeout = setTimeout(() => setHighlightedCommentId(null), 2500);
    return () => clearTimeout(timeout);
  }, [open, highlightCommentId]);

  // Scroll ke komentar yang lagi di-highlight begitu datanya kelar dimuat &
  // ke-render — pakai id DOM plain (bukan ref) biar gak perlu nerusin ref
  // manual ngelewatin CommentThread/CommentBubble.
  useEffect(() => {
    if (!highlightedCommentId || isLoadingActivity) return;
    document
      .getElementById(`comment-${highlightedCommentId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedCommentId, isLoadingActivity]);

  async function handleAddComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setIsSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { content: trimmed });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
      setIsAddingComment(false);
    } catch (err) {
      setActivityError(err instanceof ApiError ? err.message : "Gagal mengirim komentar.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleAddReply(parentId, content) {
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { content, parentId });
      setComments((prev) => [...prev, res.data]);
    } catch (err) {
      setActivityError(err instanceof ApiError ? err.message : "Gagal mengirim balasan.");
      throw err;
    }
  }

  async function handleDeleteComment(commentId) {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    try {
      await api.delete(`/task-comments/${commentId}`);
    } catch (err) {
      setComments(previous);
      setActivityError(err instanceof ApiError ? err.message : "Gagal menghapus komentar.");
    }
  }

  const { blocks: activityBlocks, repliesByParent } = buildActivityBlocks(comments, history);
  // Task yang udah Done dikunci — gak bisa nambah komentar/balasan baru lagi,
  // tapi histori & komentar lama tetap kebaca.
  const isCommentLocked = task?.status === "done";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CodeBadge>{task?.code}</CodeBadge>
            {task?.name}
          </SheetTitle>
          <SheetDescription>{task?.project?.name ?? "Tanpa project"}</SheetDescription>
        </SheetHeader>

        {task && (
          <div className="flex flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border-transparent", STATUS_STYLES[task.status])}>
                {statusLabel(task.status)}
              </Badge>
              <Badge className={PRIORITY_STYLES[task.priority]}>{priorityLabel(task.priority)}</Badge>
              <Badge variant="outline">{task.category?.name ?? "-"}</Badge>
            </div>

            <Field label="Deskripsi">
              <p className="whitespace-pre-wrap">{task.description || "Tidak ada deskripsi."}</p>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Assignee">
                {task.assignees?.length ? (
                  <div className="flex flex-col gap-1.5">
                    {task.assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center gap-2">
                        <AssigneeAvatar id={assignee.id} name={assignee.name} />
                        <span>{assignee.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>-</p>
                )}
              </Field>

              <Field label="Project">
                <p>{task.project?.name ?? "-"}</p>
              </Field>

              <Field label="Tanggal Mulai">
                <p>{formatDate(task.startDate)}</p>
              </Field>

              <Field label="Due Date">
                <p>{formatDate(task.dueDate)}</p>
              </Field>
            </div>

            <Field label="File atau Gambar Pendukung">
              <AttachmentsField existing={task.attachments ?? []} readOnly />
            </Field>

            {activityError && <p className="text-xs text-destructive">{activityError}</p>}

            <Field label="Aktivitas">
              {isLoadingActivity ? (
                <p className="text-muted-foreground">Memuat aktivitas...</p>
              ) : activityBlocks.length === 0 ? (
                <p className="text-muted-foreground">Belum ada aktivitas.</p>
              ) : (
                <div className="flex max-h-96 flex-col gap-5 overflow-x-hidden overflow-y-auto pr-1">
                  {activityBlocks.map((block) => (
                    <div
                      key={block.key}
                      className={cn(!block.isLast && "border-b border-border pb-5")}
                    >
                      {block.type === "status" ? (
                        <StatusChangeLine entry={block.data} />
                      ) : (
                        <CommentThread
                          comment={block.data}
                          replies={repliesByParent.get(block.data.id) ?? []}
                          currentUser={currentUser}
                          onDelete={handleDeleteComment}
                          onReply={handleAddReply}
                          locked={isCommentLocked}
                          highlightedCommentId={highlightedCommentId}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isCommentLocked ? (
                <p className="text-muted-foreground">
                  Task ini udah Done — komentar dikunci, gak bisa nambah lagi.
                </p>
              ) : isAddingComment ? (
                <form onSubmit={handleAddComment} className="flex flex-col gap-2 pt-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Tulis komentar..."
                    rows={2}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 self-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingComment(false);
                        setCommentText("");
                      }}
                    >
                      Batal
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmittingComment || !commentText.trim()}>
                      {isSubmittingComment && <Spinner />}
                      {isSubmittingComment ? "Mengirim..." : "Kirim Komentar"}
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingComment(true)}
                  className="mt-2 w-full cursor-pointer py-1.5 text-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  Tulis Komentar
                </button>
              )}
            </Field>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
