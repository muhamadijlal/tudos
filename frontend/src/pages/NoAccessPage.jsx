import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NoAccessPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Belum ada akses</CardTitle>
        <CardDescription>
          Role kamu belum diberi akses ke menu manapun. Hubungi admin buat minta akses.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
