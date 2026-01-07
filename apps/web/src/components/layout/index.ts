/**
 * Layout Components
 * 
 * Phase 1 UX improvements for navigation and page structure
 * 
 * Components:
 * - BottomNav: Mobile bottom navigation (72% user preference over hamburger menus)
 * - PageContainer: Consistent page headers with breadcrumbs
 * - AdminSidebar: Grouped sidebar navigation for admin panel
 */

export { BottomNav, BottomNavSpacer, type BottomNavItem } from "./bottom-nav";
export { PageContainer, PageSection, type BreadcrumbItem } from "./page-container";
export { AdminSidebar, AdminMobileNav, getAdminNavGroups } from "./admin-sidebar";