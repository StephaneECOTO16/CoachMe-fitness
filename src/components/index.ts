// UI Components
export { default as Button } from './ui/Button';
export { default as Input } from './ui/Input';
export { default as Modal } from './ui/Modal';
export { default as StatusBadge } from './ui/StatusBadge';
export { default as TabNavigation } from './ui/TabNavigation';
export { default as EmptyState } from './ui/EmptyState';
export { Switch } from './ui/switch';
export { AnimatedName } from './ui/animated-name';
export { default as LanguageToggle } from './ui/LanguageToggle';
export { default as QuickActionsSection } from './quick-actions/QuickActionsSection';
export { default as LoadingIndicator } from './loading/LoadingIndicator';
export { default as Pagination } from './ui/Pagination/Pagination';
export { default as DataTable } from './ui/DataTable/DataTable';
export { default as Dropdown } from './ui/Dropdown/Dropdown';
export { default as UserAvatar } from './ui/UserAvatar/UserAvatar';

// Card Components
export { default as CoachCard } from './coach/CoachCard/CoachCard';
export { default as ChatCard } from './cards/ChatCard';

// Section Components
export { default as HeroSection } from './sections/HeroSection';
export { default as StatsGrid } from './sections/StatsGrid';
export { default as DashboardSection } from './sections/DashboardSection';
export { default as FilterPanel } from './sections/FilterPanel';
export { default as MediaGallery } from './sections/MediaGallery';

// Chat Components
export { default as ChatBubble } from './chat/ChatBubble';
export { default as ConversationList } from './chat/ConversationList/ConversationList';
export type { Chat } from './chat/types';

// Layout Components
export { default as Header } from './layout/Header';
export { default as Footer } from './layout/Footer';
export { default as LayoutWrapper } from './layout/LayoutWrapper';

// Auth Components
export { default as ProtectedRoute } from './auth/ProtectedRoute';
export { default as PublicRoute } from './auth/PublicRoute';

// Profile Components
// Profile Components
export { default as MediaUploadTab } from './profile/MediaUploadTab';

// Admin Components
export { default as PendingApprovalsList } from './admin/PendingApprovalsList/PendingApprovalsList';
export { default as DisciplinesList } from './admin/DisciplinesList/DisciplinesList';
export { default as CoachDetailsModal } from './admin/CoachDetailsModal/CoachDetailsModal';

// Type exports
export type { CoachData, CoachCardProps } from './coach/CoachCard/CoachCard';
export type { ChatCardData, ChatCardProps, ChatParticipant } from './cards/ChatCard';
export type { HeroSectionProps, HeroButton } from './sections/HeroSection';
export type { StatsGridProps, StatItem } from './sections/StatsGrid';
export type { DashboardSectionProps, DashboardSectionAction } from './sections/DashboardSection';
export type { FilterPanelProps, Filter, FilterOption } from './sections/FilterPanel';
export type { MediaGalleryProps, MediaItem } from './sections/MediaGallery';
export type { ChatBubbleProps, ChatMessage } from './chat/ChatBubble';
export type { StatusBadgeProps, StatusType } from './ui/StatusBadge';
export type { TabNavigationProps, Tab } from './ui/TabNavigation';
export type { EmptyStateProps, EmptyStateAction } from './ui/EmptyState';
export type { QuickActionItem } from './quick-actions/QuickActionsSection';
export type { LoadingIndicatorProps, LoadingIndicatorVariant } from './loading/LoadingIndicator';
export type { PaginationProps } from './ui/Pagination/Pagination';
export type { DataTableProps, ColumnConfig } from './ui/DataTable/DataTable';
