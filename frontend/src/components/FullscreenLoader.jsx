import { Spinner } from "@/components/ui/spinner";

export default function FullscreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-5" />
      Memuat...
    </div>
  );
}
