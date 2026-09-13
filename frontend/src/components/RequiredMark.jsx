// Tanda (*) merah buat label field yang wajib diisi — dipasang bareng
// <FormRequiredNote /> (keterangan di bawah title form) di semua form yang
// punya field wajib.
export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

// Keterangan standar, ditaruh di bawah title/description form yang punya
// minimal 1 field bertanda RequiredMark.
export function FormRequiredNote() {
  return <p className="text-xs text-muted-foreground">Field bertanda (*) wajib diisi.</p>;
}
