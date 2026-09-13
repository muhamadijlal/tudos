import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { CodeBadge } from "@/components/CodeBadge";
import { TablePagination } from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/use-pagination";
import { api, ApiError } from "@/lib/api";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// "Milik Saya": aku ownernya. "Ditugaskan ke Saya": aku bukan owner tapi jadi
// assignee di salah satu task-nya (dicek dari project.tasks[].assignees yang
// udah kebawa di payload /projects, gak perlu fetch tambahan).
const OWNERSHIP_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "mine", label: "Milik Saya" },
  { value: "assigned", label: "Ditugaskan ke Saya" },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("all");

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query) && !p.code?.toLowerCase().includes(query)) {
        return false;
      }
      if (ownershipFilter === "mine" && p.user?.id !== currentUser?.id) return false;
      if (
        ownershipFilter === "assigned" &&
        !p.tasks.some((t) => (t.assignees ?? []).some((a) => a.id === currentUser?.id))
      ) {
        return false;
      }
      return true;
    });
  }, [projects, search, ownershipFilter, currentUser]);

  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(filteredProjects);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await api.get("/projects");
        setProjects(res.data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Gagal memuat project");
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (projects.length === 0) {
    return <p className="text-xs text-muted-foreground">Belum ada project.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-sm">
          <InputGroupAddon>
            <MagnifyingGlass />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Cari project (nama/kode)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        <div className="flex items-center gap-1">
          {OWNERSHIP_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              variant={ownershipFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setOwnershipFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Gak ada project yang cocok dengan pencarian/filter ini.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((project) => (
              <Card
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/projects/${project.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/projects/${project.id}`)}
                className="cursor-pointer transition-colors hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CodeBadge>{project.code}</CodeBadge>
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "Tanpa deskripsi"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    Pemilik:
                    <AssigneeAvatar id={project.user?.id} name={project.user?.name} size="xs" />
                    {project.user?.name ?? "-"}
                  </span>
                  <span>{project.tasks.length} task</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredProjects.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="project"
          />
        </>
      )}
    </div>
  );
}
