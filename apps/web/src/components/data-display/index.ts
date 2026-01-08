/**
 * Data Display Components
 * 
 * Phase 2 UX improvements: Responsive data display components that
 * automatically switch between mobile-optimized and desktop-optimized views.
 */

// ResponsiveDataView - Automatically switches between cards (mobile) and table (desktop)
export {
  ResponsiveDataView,
  type DataColumn,
  type DataAction,
  type SwipeActionDef,
  type ResponsiveDataViewProps,
} from "./responsive-data-view";

// SwipeableCard - Mobile card with swipe-to-reveal actions
export { SwipeableCard } from "./swipeable-card";

// DataTableEnhanced - Desktop-optimized table with power features
export {
  DataTableEnhanced,
  type EnhancedColumn,
  type BulkAction,
  type RowAction,
} from "./data-table-enhanced";

// DataCardList - Mobile-optimized card list with swipe, pull-to-refresh, infinite scroll
export {
  DataCardList,
  SimpleCard,
  type CardAction,
  type SwipeAction,
  type SimpleCardData,
} from "./data-card-list";

// SmartDataView - Automatically selects between ResponsiveDataView and DataTableEnhanced
// based on device type and ux_enhanced_tables feature flag
export {
  SmartDataView,
  type SmartDataViewProps,
} from "./smart-data-view";
