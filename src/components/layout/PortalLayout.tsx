import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  Archive,
  Award,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Cpu,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FolderUp,
  History,
  Info,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Repeat,
  Settings,
  ShieldCheck,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ROLE_LABELS, UserRole } from '../../types/fdr';
import { FdrDetailDrawer } from '../modals/FdrDetailDrawer';
import { formatDateShort } from '../ui/EnterpriseComponents';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  allowedRoles: UserRole[];
}

export const INSTITUTION_NAV_ITEMS: NavItem[] = [
  {
    label: 'Institution Dashboard',
    path: '/institution/dashboard',
    icon: LayoutDashboard,
    section: 'Overview & Profile',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Institution Profile',
    path: '/institution/profile',
    icon: Building2,
    section: 'Overview & Profile',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'New FDR Submission (4-Step)',
    path: '/institution/fdr-submissions',
    icon: FilePlus2,
    section: 'FDR Deposit Operations',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Document Management Vault',
    path: '/institution/documents',
    icon: FolderUp,
    section: 'FDR Deposit Operations',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'FDR Status & Verification',
    path: '/institution/status-tracking',
    icon: CheckSquare,
    section: 'FDR Deposit Operations',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Renewal Submissions',
    path: '/institution/renewals',
    icon: RefreshCw,
    section: 'Lifecycle Requests',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Replacement FDRs',
    path: '/institution/replacements',
    icon: Repeat,
    section: 'Lifecycle Requests',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Release / Refund Requests',
    path: '/institution/releases',
    icon: Undo2,
    section: 'Lifecycle Requests',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Notification Centre',
    path: '/institution/notifications',
    icon: Bell,
    section: 'Compliance & Logs',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    label: 'Submission & Audit History',
    path: '/institution/history',
    icon: History,
    section: 'Compliance & Logs',
    allowedRoles: [UserRole.INSTITUTION_ADMIN, UserRole.SUPER_ADMIN],
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard & Analytics',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    section: 'Command & Registry',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Institution Management',
    path: '/admin/institutions',
    icon: Building2,
    section: 'Command & Registry',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'FDR Master Repository',
    path: '/admin/fdr-repository',
    icon: Archive,
    section: 'Command & Registry',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'New FDR Submission Wizard',
    path: '/admin/new-fdr',
    icon: FilePlus2,
    section: 'Command & Registry',
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.AICTE_ADMIN],
  },
  {
    label: 'Document Management',
    path: '/admin/documents',
    icon: FolderUp,
    section: 'Command & Registry',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'FDR Authenticity Engine',
    path: '/admin/authenticity-engine',
    icon: ShieldCheck,
    section: 'AI Forensics, Risk & Ledger',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Institution Risk Radar (AI/ML)',
    path: '/admin/risk-radar',
    icon: BarChart3,
    section: 'AI Forensics, Risk & Ledger',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Smart Escalation Ladder',
    path: '/admin/escalation-ladder',
    icon: Bell,
    section: 'AI Forensics, Risk & Ledger',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Tamper-Proof Ledger & NLQ',
    path: '/admin/tamper-ledger',
    icon: FileCheck2,
    section: 'AI Forensics, Risk & Ledger',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Cross-Institution Fraud Graph',
    path: '/admin/fraud-graph',
    icon: Repeat,
    section: 'AI Forensics, Risk & Ledger',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'AI Document Intelligence & Bank Sim',
    path: '/admin/verification',
    icon: Cpu,
    section: 'Scrutiny & Approvals',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Discrepancy Management',
    path: '/admin/discrepancies',
    icon: AlertOctagon,
    section: 'Scrutiny & Approvals',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Maturity & Validity Monitor',
    path: '/admin/maturity',
    icon: CalendarClock,
    section: 'Lifecycle Monitoring',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Renewal & Replacement',
    path: '/admin/renewals',
    icon: RefreshCw,
    section: 'Lifecycle Monitoring',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Release & Refund Processing',
    path: '/admin/releases',
    icon: Award,
    section: 'Lifecycle Monitoring',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Notification Centre',
    path: '/admin/alerts',
    icon: Bell,
    section: 'Governance & Audit',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.AICTE_SCRUTINY_OFFICER,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Reports & Exports',
    path: '/admin/reports',
    icon: BarChart3,
    section: 'Governance & Audit',
    allowedRoles: [
      UserRole.SUPER_ADMIN,
      UserRole.AICTE_ADMIN,
      UserRole.SENIOR_APPROVING_OFFICER,
    ],
  },
  {
    label: 'Audit Logs & Activity',
    path: '/admin/audit-logs',
    icon: FileSpreadsheet,
    section: 'Governance & Audit',
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.AICTE_ADMIN],
  },
  {
    label: 'User & Role Management',
    path: '/admin/users',
    icon: Users,
    section: 'System Administration',
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.AICTE_ADMIN],
  },
  {
    label: 'System Settings & Demo Data',
    path: '/admin/settings',
    icon: Settings,
    section: 'System Administration',
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.AICTE_ADMIN],
  },
];

export const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout, switchActiveRole, switchDemoInstitution } = useAuth();
  const {
    institutions,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    systemConfig,
    toasts,
    dismissToast,
    fdrs,
    setSelectedFdrForDrawer,
  } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const currentRole = profile?.role || UserRole.SUPER_ADMIN;
  const isInstitutionView = location.pathname.startsWith('/institution');

  const activeNavList = isInstitutionView
    ? INSTITUTION_NAV_ITEMS
    : ADMIN_NAV_ITEMS.filter((item) => item.allowedRoles.includes(currentRole));

  const sections = Array.from(new Set(activeNavList.map((i) => i.section)));

  const visibleNotifications =
    currentRole === UserRole.INSTITUTION_ADMIN
      ? notifications.filter(
          (n) => !n.institutionId || n.institutionId === profile?.institutionId
        )
      : notifications;

  const unreadCount = visibleNotifications.filter((n) => !n.readStatus).length;

  const handleRoleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as UserRole;
    await switchActiveRole(selectedRole);
    if (selectedRole === UserRole.INSTITUTION_ADMIN) {
      navigate('/institution/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleInstitutionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    const found = institutions.find((i) => i.institutionId === instId);
    if (found) {
      switchDemoInstitution(found.institutionId, found.name);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const currentItem = [...ADMIN_NAV_ITEMS, ...INSTITUTION_NAV_ITEMS].find(
    (item) => item.path === location.pathname
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Sidebar Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight truncate">
              AICTE FDR System
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {isInstitutionView ? 'Institution Nodal Portal' : 'AICTE Statutory Bureau'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role & Institution Switcher */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 space-y-2">
        <select
          id="demo-role-switcher"
          value={currentRole}
          onChange={handleRoleSelect}
          className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-teal-500"
        >
          <option value={UserRole.SUPER_ADMIN}>1. SUPER ADMIN</option>
          <option value={UserRole.AICTE_ADMIN}>2. AICTE ADMIN</option>
          <option value={UserRole.AICTE_SCRUTINY_OFFICER}>3. SCRUTINY OFFICER</option>
          <option value={UserRole.SENIOR_APPROVING_OFFICER}>4. SENIOR APPROVING OFFICER</option>
          <option value={UserRole.INSTITUTION_ADMIN}>5. INSTITUTION ADMIN</option>
        </select>

        {(currentRole === UserRole.INSTITUTION_ADMIN || isInstitutionView) && (
          <div>
            <label
              htmlFor="demo-inst-switcher"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Active Institution (Demo)
            </label>
            <select
              id="demo-inst-switcher"
              value={profile?.institutionId || 'INST-1001'}
              onChange={handleInstitutionSelect}
              className="w-full px-2 py-1 text-[11px] bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {institutions.map((inst) => (
                <option key={inst.institutionId} value={inst.institutionId}>
                  {inst.institutionId}: {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Portal View Switcher for Super Admin */}
        {currentRole === UserRole.SUPER_ADMIN && (
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                !isInstitutionView
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AICTE Portal
            </button>
            <button
              type="button"
              onClick={() => navigate('/institution/dashboard')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                isInstitutionView
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Institution View
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((sectionTitle) => {
          const items = activeNavList.filter((i) => i.section === sectionTitle);
          return (
            <div key={sectionTitle}>
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400">
                {sectionTitle}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {(item.path.includes('notifications') || item.path.includes('alerts')) &&
                        unreadCount > 0 && (
                          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300">
                            {unreadCount}
                          </span>
                        )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Authenticated Officer Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {profile?.displayName || 'Authorized Officer'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {profile?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (264px fixed width) */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand / Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded border border-slate-200"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              {isInstitutionView ? 'Institution Portal' : 'AICTE Admin Portal'} /{' '}
              <span className="text-teal-700">
                {currentItem?.label || 'Dashboard'}
              </span>
            </span>
          </div>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-600">
            {isInstitutionView ? (
              <>
                <Link
                  to="/institution/dashboard"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Dashboard
                </Link>
                <Link
                  to="/institution/fdr-submissions"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Submit FDR
                </Link>
                <Link
                  to="/institution/documents"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Document Vault
                </Link>
                <Link
                  to="/institution/renewals"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Renewals
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/admin/dashboard"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Analytics
                </Link>
                <Link
                  to="/admin/fdr-repository"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  FDR Repository
                </Link>
                <Link
                  to="/admin/verification"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  AI & Bank Scrutiny
                </Link>
                <Link
                  to="/admin/maturity"
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Maturity Monitor
                </Link>
              </>
            )}
          </nav>

          {/* Zone 3: Notification Bell Dropdown + Role & Sign Out */}
          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              type="button"
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-600 text-white rounded">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 top-11 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Notification Centre ({unreadCount} Unread)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markAllNotificationsRead()}
                      className="text-[11px] text-teal-300 hover:text-white"
                    >
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
                  {visibleNotifications.slice(0, 6).map((n) => (
                    <div
                      key={n.notificationId}
                      className={`p-3 text-xs space-y-1 ${
                        n.readStatus ? 'bg-white' : 'bg-teal-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-900 truncate">{n.title}</span>
                        <span className="font-mono text-slate-400 shrink-0">
                          {formatDateShort(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between pt-1">
                        {n.relatedRecordId && (
                          <button
                            type="button"
                            onClick={() => {
                              const found = fdrs.find((f) => f.fdrId === n.relatedRecordId);
                              if (found) {
                                setSelectedFdrForDrawer(found);
                              }
                              markNotificationRead(n);
                              setNotifDropdownOpen(false);
                            }}
                            className="text-[11px] font-medium text-teal-700 hover:underline"
                          >
                            Inspect {n.relatedRecordId}
                          </button>
                        )}
                        {!n.readStatus && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n)}
                            className="text-[11px] text-slate-500 hover:text-slate-900"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      navigate(isInstitutionView ? '/institution/notifications' : '/admin/alerts');
                    }}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Open Full Notification Centre
                  </button>
                </div>
              </div>
            )}

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>{ROLE_LABELS[currentRole]}</span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Statutory System Banner */}
        {systemConfig.portalMaintenanceBanner && (
          <div className="bg-slate-900 text-slate-200 px-6 py-2 text-xs border-b border-slate-800 flex items-center justify-between gap-4">
            <span className="truncate">{systemConfig.portalMaintenanceBanner}</span>
            <span className="font-mono text-[11px] text-teal-400 whitespace-nowrap shrink-0">
              Lock-in: {systemConfig.defaultLockInYears}Y · Reminders:{' '}
              {systemConfig.maturityAlertWindowDays}d / {systemConfig.reminderInterval15Days || 15}d /{' '}
              {systemConfig.reminderInterval7Days || 7}d
            </span>
          </div>
        )}

        {/* Global Toast Feedback Stack */}
        {toasts.length > 0 && (
          <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-md w-full pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto bg-slate-900 text-white border border-slate-700 rounded-lg p-3.5 shadow-xl flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  {t.tone === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-semibold">{t.title}</div>
                    <div className="text-xs text-slate-300 mt-0.5">{t.message}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Global 11-Section FDR Detail Drawer */}
        <FdrDetailDrawer />

        {/* Main Viewport Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
