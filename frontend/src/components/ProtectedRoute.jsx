import FullscreenLoader from "@/components/FullscreenLoader";
import { useAuth } from "@/context/AuthContext";
import { getDefaultPath } from "@/lib/nav";
import { hasPermission } from "@/lib/permissions";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullscreenLoader />;
  // Jangan hardcode "/dashboard" — user yang udah login tapi role-nya gak
  // punya akses menu.dashboard bakal mental balik ke sini kalau dipaksa ke
  // situ. getDefaultPath ngasih halaman pertama yang beneran boleh dia buka.
  if (user) return <Navigate to={getDefaultPath(user)} replace />;

  return children;
}

// Dipasang di dalam ProtectedRoute — jadi cuma perlu cek permission, auth sudah pasti ada.
// Redirect ke "/" (bukan langsung ke halaman tertentu) karena halaman itu
// sendiri bisa aja gak boleh diakses user ini — "/" yang nentuin halaman
// default yang beneran boleh dia buka (lihat getDefaultPath di lib/nav.js).
export function RequirePermission({ permission, children }) {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) return <Navigate to="/" replace />;

  return children;
}
