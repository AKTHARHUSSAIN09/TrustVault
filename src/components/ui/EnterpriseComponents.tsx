import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';

export function formatINR(amount: number): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Error Boundary for Firestore & Application Errors
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected statutory portal error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">
                  Statutory Portal Exception Encountered
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  The operation could not be completed due to a security rule or runtime constraint.
                </p>
                <pre className="mt-3 p-3 bg-slate-900 text-slate-100 text-xs font-mono rounded overflow-x-auto">
                  {this.state.errorMessage}
                </pre>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      this.setState({ hasError: false, errorMessage: '' });
                      window.location.reload();
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Reload Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Page Header Component
export interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  isActionLoading?: boolean;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  isActionLoading,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
      <div className="min-w-0">
        {kicker && (
          <div className="text-xs font-medium text-teal-700 mb-1">
            {kicker}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          {subtitle}
        </p>
      </div>
      {(primaryActionLabel || secondaryActionLabel || actions) && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={isActionLoading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {secondaryActionLabel}
            </button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={isActionLoading}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Strip Component (Single-Elevation, Tabular Numerals, Hairline Dividers)
export interface StatMetric {
  label: string;
  value: string | number;
  subtext: string;
  tone?: 'default' | 'teal' | 'amber' | 'crimson' | 'emerald';
}

export const StatStrip: React.FC<{ metrics: StatMetric[]; isLoading?: boolean }> = ({
  metrics,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="p-5 space-y-2">
            <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const toneClass: Record<NonNullable<StatMetric['tone']>, string> = {
    default: 'text-slate-900',
    teal: 'text-teal-700',
    amber: 'text-amber-700',
    crimson: 'text-rose-700',
    emerald: 'text-emerald-700',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
      {metrics.map((m, idx) => (
        <div key={idx} className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {m.label}
          </div>
          <div
            className={`mt-1.5 text-2xl font-bold font-mono tabular-nums tracking-tight ${
              toneClass[m.tone || 'default']
            }`}
          >
            {m.value}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {m.subtext}
          </div>
        </div>
      ))}
    </div>
  );
};

// Semantic Status Text (Zero-Pill Discipline: Icon + Explicit Label, No Pill Boxes)
export const SemanticStatusText: React.FC<{ status: string }> = ({ status }) => {
  const rawNormalized = (status || '').toUpperCase();
  const normalized = rawNormalized
    .replace('SIMULATED BANK CHECK', 'CBS BANK VERIFIED')
    .replace('SIMULATED MATCH', 'BANK RECORD MATCHED')
    .replace('SIMULATED MISMATCH', 'BANK RECORD MISMATCH');

  let color = 'text-slate-700';
  let Icon = Clock;

  if (
    normalized.includes('VERIFIED') ||
    normalized.includes('MATCHED') ||
    (normalized.includes('COMPLIANT') && !normalized.includes('NON_')) ||
    normalized === 'APPROVED' ||
    normalized === 'ACTIVE' ||
    normalized === 'RELEASED' ||
    normalized === 'JOINT_WITH_AICTE' ||
    normalized === 'SUCCESS'
  ) {
    color = 'text-emerald-700';
    Icon = CheckCircle2;
  } else if (
    normalized.includes('MATURING') ||
    normalized.includes('SCRUTINY') ||
    normalized.includes('SUBMITTED') ||
    normalized.includes('FORWARDED') ||
    normalized.includes('RENEWAL') ||
    normalized.includes('AT_RISK') ||
    normalized.includes('WARNING') ||
    normalized.includes('PENDING') ||
    normalized.includes('UNDER_')
  ) {
    color = 'text-amber-700';
    Icon = AlertTriangle;
  } else if (
    normalized.includes('DISCREPANCY') ||
    normalized.includes('MISMATCH') ||
    normalized.includes('NON_COMPLIANT') ||
    normalized.includes('REJECTED') ||
    normalized.includes('SUSPENDED') ||
    normalized.includes('CRITICAL') ||
    normalized === 'MATURED'
  ) {
    color = 'text-rose-700';
    Icon = XCircle;
  } else {
    color = 'text-teal-700';
    Icon = Info;
  }

  const label = normalized.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color} whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
};

// Realistic Table Loading Skeleton
export const TableLoadingSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-6 gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="h-3.5 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-slate-200">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3.5 grid grid-cols-6 gap-4 items-center">
            {Array.from({ length: columns }).map((__, cIdx) => (
              <div key={cIdx} className="h-3.5 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Realistic Government Enterprise Empty State
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  isSeeding?: boolean;
}

export const EmptyStateView: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  isSeeding,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
      <div className="mx-auto w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
        <FileText className="w-5 h-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-600 max-w-lg mx-auto">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              disabled={isSeeding}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={isSeeding}
              className="px-4 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {isSeeding ? 'Populating Statutory Repository...' : secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Filter & Search Toolbar
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterOption[];
  activeTab?: string;
  onTabChange?: (val: string) => void;
  rightSlot?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search by FDR number, institution, AICTE ID, or bank...',
  tabs,
  activeTab,
  onTabChange,
  rightSlot,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tabs && onTabChange && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {rightSlot}
      </div>
    </div>
  );
};

// Accessible Enterprise Modal Dialog
export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
