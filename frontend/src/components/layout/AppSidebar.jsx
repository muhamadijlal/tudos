import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { ADMIN_NAV_ITEMS, NAV_ITEMS } from "@/lib/nav";
import { APP_VERSION } from "@/lib/version";
import { Link, useLocation } from "react-router-dom";

function NavGroup({ label, items, pathname }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ to, label: itemLabel, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={pathname === to}
                tooltip={itemLabel}
                render={<Link to={to} />}
              >
                <Icon />
                <span>{itemLabel}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(user, item.permission));
  const visibleAdminItems = ADMIN_NAV_ITEMS.filter((item) => hasPermission(user, item.permission));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Tudos
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visibleNavItems.length > 0 && (
          <NavGroup label="Menu" items={visibleNavItems} pathname={pathname} />
        )}
        {visibleAdminItems.length > 0 && (
          <NavGroup label="Administrasi" items={visibleAdminItems} pathname={pathname} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <span className="px-2 text-center text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          v{APP_VERSION}
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
