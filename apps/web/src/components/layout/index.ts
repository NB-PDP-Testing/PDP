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

export {
  AdminMobileNav,
  AdminSidebar,
  getAdminNavGroups,
} from "./admin-sidebar";
export {
  AppShell,
  AppShellNavGroup,
  type AppShellNavGroupProps,
  AppShellNavItem,
  type AppShellNavItemProps,
  type AppShellProps,
  AppShellSidebar,
  type AppShellSidebarProps,
} from "./app-shell";
export { BottomNav, type BottomNavItem, BottomNavSpacer } from "./bottom-nav";
export {
  CoachMobileNav,
  CoachSidebar,
  getCoachNavGroups,
} from "./coach-sidebar";
export {
  type BreadcrumbItem,
  PageContainer,
  PageSection,
} from "./page-container";
export {
  getParentNavGroups,
  ParentMobileNav,
  ParentSidebar,
} from "./parent-sidebar";
