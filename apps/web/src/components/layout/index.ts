/**
 * Layout Components
 * 
 * Phase 1 & 9 UX improvements for navigation and page structure
 * 
 * Components:
 * - AppShell: Responsive layout wrapper (mobile bottom nav / desktop sidebar)
 * - BottomNav: Mobile bottom navigation (72% user preference over hamburger menus)
 * - PageContainer: Consistent page headers with breadcrumbs
 * - AdminSidebar: Grouped sidebar navigation for admin panel
 * - CoachSidebar: Grouped sidebar navigation for coach dashboard (Phase 9)
 * - ParentSidebar: Grouped sidebar navigation for parent portal (Phase 9)
 */

export { BottomNav, BottomNavSpacer, type BottomNavItem } from "./bottom-nav";
export { PageContainer, PageSection, type BreadcrumbItem } from "./page-container";
export { AdminSidebar, AdminMobileNav, getAdminNavGroups } from "./admin-sidebar";
export { CoachSidebar, CoachMobileNav, getCoachNavGroups } from "./coach-sidebar";
export { ParentSidebar, ParentMobileNav, getParentNavGroups } from "./parent-sidebar";
export {
  AppShell,
  AppShellSidebar,
  AppShellNavGroup,
  AppShellNavItem,
  type AppShellProps,
  type AppShellSidebarProps,
  type AppShellNavGroupProps,
  type AppShellNavItemProps,
} from "./app-shell";
