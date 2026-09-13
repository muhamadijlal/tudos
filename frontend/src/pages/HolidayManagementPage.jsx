import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker, parseDateStr } from "@/components/DatePicker";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { TablePagination } from "@/components/TablePagination";
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
import { usePagination } from "@/hooks/use-pagination";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { collectErrors, validateRequired } from "@/lib/validation";
import { CloudArrowDown, Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const EMPTY_FORM = { date: "", name: "" };
const CURRENT_YEAR = new Date().getFullYear();

// Master kalender libur nasional — dipakai export Daily Activity (.xlsx) buat
// ngosongin + nge-merah-in baris tanggal itu (sama kayak weekend), dan geser
// task yang jatuh di tanggal itu ke hari kerja berikutnya.
export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const [syncYear, setSyncYear] = useState(String(CURRENT_YEAR));
  const [isSyncing, setIsSyncing] = useState(false);
  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(holidays);

  useEffect(() => {
    loadHolidays();
  }, []);

  async function loadHolidays() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/national-holidays");
      setHolidays(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat libur nasional");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingHoliday(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(holiday) {
    setEditingHoliday(holiday);
    setForm({ date: holiday.date, name: holiday.name });
    setFieldErrors({});
    setFormOpen(true);
  }

  function validate() {
    return collectErrors({
      date: validateRequired(form.date, "Tanggal"),
      name: validateRequired(form.name, "Nama libur"),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      if (editingHoliday) {
        await api.put(`/national-holidays/${editingHoliday.id}`, form);
      } else {
        await api.post("/national-holidays", form);
      }
      setFormOpen(false);
      await loadHolidays();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingHoliday ? "Gagal mengubah libur nasional" : "Gagal membuat libur nasional",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await api.post("/national-holidays/sync", { year: Number(syncYear) });
      await loadHolidays();
      setFeedback({
        open: true,
        variant: "success",
        title: "Sinkronisasi selesai",
        description: `${res.data.created} libur baru ditambahkan, ${res.data.skipped} sudah ada sebelumnya (dari total ${res.data.total} libur tahun ${syncYear}).`,
      });
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal sinkronisasi",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/national-holidays/${deleteTarget.id}`);
      await loadHolidays();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus libur nasional",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Libur Nasional</CardTitle>
          <CardDescription>
            Kelola kalender libur nasional (admin only) — dipakai export Daily Activity buat
            ngosongin & nge-merah-in tanggal itu, sama kayak weekend. Bisa diisi manual atau
            sinkron dari API publik (upset.dev/tanggalmerah).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={syncYear}
            onChange={(e) => setSyncYear(e.target.value)}
            className="w-24"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncing || !syncYear}
            onClick={handleSync}
          >
            {isSyncing ? <Spinner /> : <CloudArrowDown />}
            {isSyncing ? "Sinkronisasi..." : "Sync dari API"}
          </Button>
          <Button size="sm" onClick={openCreateForm}>
            <Plus /> Libur Baru
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
        {!isLoading && holidays.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada libur nasional yang dicatat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Libur</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={3} />
              ) : (
                pageItems.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">
                      {parseDateStr(holiday.date)?.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{holiday.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditForm(holiday)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(holiday)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!isLoading && holidays.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={holidays.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="libur"
          />
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHoliday ? "Edit Libur Nasional" : "Libur Nasional Baru"}</DialogTitle>
            <DialogDescription>
              {editingHoliday ? "Ubah detail libur ini." : "Isi tanggal dan nama libur yang mau dicatat."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>
                Tanggal
                <RequiredMark />
              </Label>
              <DatePicker
                value={form.date}
                onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
                placeholder="Pilih tanggal libur"
              />
              {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="holiday-name">
                Nama Libur
                <RequiredMark />
              </Label>
              <Input
                id="holiday-name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="cth. Tahun Baru Masehi"
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus libur "${deleteTarget?.name}"?`}
        description="Tanggal ini bakal dianggap hari kerja biasa lagi di export Daily Activity."
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
    </Card>
  );
}
