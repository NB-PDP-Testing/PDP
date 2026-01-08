/**
 * Data Display Components
 *
 * Phase 2 UX improvements: Responsive data display components that
 * automatically switch between mobile-optimized and desktop-optimized views.
 */

// DataCardList - Mobile-optimized card list with swipe, pull-to-refresh, infinite scroll
export {
  type CardAction,
  DataCardList,
  SimpleCard,
  type SimpleCardData,
  type SwipeAction,
} from "./data-card-list";
// DataTableEnhanced - Desktop-optimized table with power features
export {
  type BulkAction,
  DataTableEnhanced,
  type EnhancedColumn,
  type RowAction,
} from "./data-table-enhanced";
// ResponsiveDataView - Automatically switches between cards (mobile) and table (desktop)
export {
  type DataAction,
  type DataColumn,
  ResponsiveDataView,
  type ResponsiveDataViewProps,
  type SwipeActionDef,
} from "./responsive-data-view";
// SmartDataView - Automatically selects between ResponsiveDataView and DataTableEnhanced
// based on device type and ux_enhanced_tables feature flag
export {
  SmartDataView,
  type SmartDataViewProps,
} from "./smart-data-view";
// SwipeableCard - Mobile card with swipe-to-reveal actions
export { SwipeableCard } from "./swipeable-card";
