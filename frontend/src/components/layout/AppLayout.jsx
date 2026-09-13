import { Breadcrumb } from "@/components/Breadcrumb";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import {
  BreadcrumbProvider,
  useBreadcrumbItems,
} from "@/context/BreadcrumbContext";
import { API_URL } from "@/lib/api";
import { Key, SignOut, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

function HeaderBreadcrumb() {
  const items = useBreadcrumbItems();
  if (items.length === 0) return null;
  return <Breadcrumb items={items} />;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <BreadcrumbProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-8" />
              <HeaderBreadcrumb />
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-none px-1.5 py-1 hover:bg-muted"
                    />
                  }
                >
                  <Avatar size="sm">
                    {user?.profilePictureUrl && (
                      <AvatarImage src={`${API_URL}${user.profilePictureUrl}`} alt={user.name} />
                    )}
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {user?.name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserCircle />
                    Profil Saya
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                    <Key />
                    Ganti Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setLogoutOpen(true)}
                  >
                    <SignOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </div>
        </SidebarInset>

        <ConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          title="Logout dari Tudos?"
          description="Kamu perlu login lagi untuk mengakses dashboard."
          confirmLabel="Logout"
          destructive
          onConfirm={handleLogout}
        />

        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      </BreadcrumbProvider>
    </SidebarProvider>
  );
}
