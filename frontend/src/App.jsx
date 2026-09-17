import { ProtectedRoute, PublicOnlyRoute, RequirePermission } from "@/components/ProtectedRoute";
import FullscreenLoader from "@/components/FullscreenLoader";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { ALL_NAV_ITEMS, getDefaultPath } from "@/lib/nav";
import CategoryManagementPage from "@/pages/CategoryManagementPage";
import DashboardPage from "@/pages/DashboardPage";
import DeadlinesPage from "@/pages/DeadlinesPage";
import EpicDetailPage from "@/pages/EpicDetailPage";
import EpicManagementPage from "@/pages/EpicManagementPage";
import HolidayManagementPage from "@/pages/HolidayManagementPage";
import KanbanPage from "@/pages/KanbanPage";
import LoginPage from "@/pages/LoginPage";
import NoAccessPage from "@/pages/NoAccessPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ProjectManagementPage from "@/pages/ProjectManagementPage";
import ProjectNoteDetailPage from "@/pages/ProjectNoteDetailPage";
import ProjectNotesListPage from "@/pages/ProjectNotesListPage";
import ProjectsPage from "@/pages/ProjectsPage";
import RegisterPage from "@/pages/RegisterPage";
import ReviewPendingPage from "@/pages/ReviewPendingPage";
import RolePermissionPage from "@/pages/RolePermissionPage";
import TimelinePage from "@/pages/TimelinePage";
import TudosPage from "@/pages/TudosPage";
import UserManagementPage from "@/pages/UserManagementPage";
import { Navigate, Route, Routes } from "react-router-dom";

// Tiap menu di nav.js dipetakan ke komponen halamannya di sini — satu-satunya
// tempat yang perlu diubah kalau nambah menu baru (route-nya di-generate,
// bukan ditulis manual, biar gak ada kemungkinan lupa nge-gate satu halaman).
const PAGE_COMPONENTS = {
  "/dashboard": DashboardPage,
  "/tudos": TudosPage,
  "/kanban": KanbanPage,
  "/timeline": TimelinePage,
  "/projects": ProjectsPage,
  "/projects/manage": ProjectManagementPage,
  "/epics/manage": EpicManagementPage,
  "/users": UserManagementPage,
  "/roles": RolePermissionPage,
  "/categories": CategoryManagementPage,
  "/holidays": HolidayManagementPage,
};

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  // Tunggu /auth/me selesai dulu — kalau langsung dievaluasi pas isLoading
  // masih true, `user` masih null (state awal), jadi getDefaultPath(null)
  // selalu jatuh ke "/no-access" walau usernya beneran punya akses, begitu
  // halaman "/" diakses langsung (refresh/buka tab baru), bukan navigasi
  // dari dalam app yang `user`-nya udah kemuat.
  if (isLoading) return <FullscreenLoader />;
  return <Navigate to={getDefaultPath(user)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedLayout />}>
        <Route path="/no-access" element={<NoAccessPage />} />
        {/* Bukan menu utama (gak ada di nav.js) — halaman detail/catatan per
            project, dibuka dari ProjectsPage/TimelinePage, cukup butuh login
            kayak halaman lain. */}
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/notes" element={<ProjectNotesListPage />} />
        <Route path="/projects/:id/notes/:noteId" element={<ProjectNoteDetailPage />} />
        <Route path="/projects/:id/epics/:epicId" element={<EpicDetailPage />} />
        {/* Dibuka dari widget "Deadline Mendekat" di Dashboard. */}
        <Route path="/deadlines" element={<DeadlinesPage />} />
        {/* Dibuka dari widget "Perlu Direview" di Dashboard. */}
        <Route path="/tasks/review-pending" element={<ReviewPendingPage />} />
        {/* Dibuka dari NotificationBell ("Lihat Semua Notifikasi"). */}
        <Route path="/notifications" element={<NotificationsPage />} />
        {/* Dibuka dari dropdown user di header ("Profil Saya") — self-service,
            siapa aja yang login boleh akses, gak digembok permission. */}
        <Route path="/profile" element={<ProfilePage />} />
        {ALL_NAV_ITEMS.map(({ to, permission }) => {
          const Component = PAGE_COMPONENTS[to];
          return (
            <Route
              key={to}
              path={to}
              element={
                <RequirePermission permission={permission}>
                  <Component />
                </RequirePermission>
              }
            />
          );
        })}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
