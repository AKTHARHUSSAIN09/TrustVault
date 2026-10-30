import React, { useMemo, useState } from 'react';
import {
  Printer,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  NotificationType,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  UserRole,
} from '../types/fdr';
import {
  FilterBar,
  ModalDialog,
  PageHeader,
  SemanticStatusText,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'New FDR submitted',
  'FDR verification completed',
  'Discrepancy found',
  'Additional documents requested',
  'Maturity approaching',
  'FDR matured',
  'Renewal required',
  'Renewal submitted',
  'Refund request submitted',
  'Refund request approved',
  'Refund request rejected',
  'Pending officer action',
  'Overdue case',
];

const ALL_REPORT_CATEGORIES = [
  'Institution-wise FDR Summary',
  'Active FDR Register',
  'Pending Verification Report',
  'Discrepancy Report',
  'Expiring FDR Report',
  'Matured FDR Report',
  'Renewal Status Report',
  'Release / Refund Report',
  'Bank-wise Deposit Concentration Report',
  'State-wise Compliance Report',
] as const;

type ReportCategory = (typeof ALL_REPORT_CATEGORIES)[number];

// ============================================================================
// 1. SECTION 13 — NOTIFICATION CENTRE & ALERTS PAGE
// ============================================================================
export const AdminAlertsEscalationPage: React.FC<{ institutionOnlyId?: string }> = ({
  institutionOnlyId,
}) => {
  const {
    notifications,
    fdrs,
    markNotificationRead,
    markAllNotificationsRead,
    createAlertNotification,
    setSelectedFdrForDrawer,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<NotificationType>('Maturity approaching');
  const [newSeverity, setNewSeverity] = useState<
    'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
  >('WARNING');

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications.filter((n) => {
      if (institutionOnlyId && n.institutionId && n.institutionId !== institutionOnlyId)
        return false;
      if (typeFilter !== 'ALL' && n.notificationType !== typeFilter) return false;
      if (readFilter === 'UNREAD' && n.readStatus) return false;
      if (readFilter === 'READ' && !n.readStatus) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.notificationType || '').toLowerCase().includes(q) ||
        (n.relatedRecordId || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, searchQuery, typeFilter, readFilter, institutionOnlyId]);

  const handleDispatchNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAlertNotification({
      title: newTitle || `${newType} Statutory Notice`,
      message: newMessage,
      notificationType: newType,
      severity: newSeverity,
      category: 'MATURITY_ALERT',
      targetRole: 'ALL',
      institutionId: institutionOnlyId || 'INST-1001',
    });
    setDispatchModalOpen(false);
    setNewTitle('');
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 13 · Statutory Notification & Escalation Centre"
        title="Notifications, Reminders & SLA Alerts"
        subtitle="Manage all 13 statutory notification categories with read/unread state tracking, type filtering, and one-click navigation to linked records."
        primaryActionLabel="Mark All as Read"
        onPrimaryAction={() => markAllNotificationsRead()}
        secondaryActionLabel="Dispatch Statutory Notice"
        onSecondaryAction={() => setDispatchModalOpen(true)}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search notifications by title, message, or related FDR ID..."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All 13 Notification Types</option>
              {ALL_NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All (Read & Unread)</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read Only</option>
            </select>
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {filteredNotifications.map((notif) => {
          const linkedFdr = fdrs.find((f) => f.fdrId === notif.relatedRecordId);
          return (
            <div
              key={notif.notificationId}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                notif.readStatus ? 'bg-white' : 'bg-teal-50/40'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!notif.readStatus && (
                    <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-900">
                    {notif.title}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-700">
                    {notif.notificationType || notif.category}
                  </span>
                  <SemanticStatusText status={notif.severity} />
                </div>
                <p className="text-xs text-slate-600">{notif.message}</p>
                <div className="text-[11px] font-mono text-slate-400">
                  {formatDateShort(notif.createdAt)} · Target: {notif.targetRole}
                  {notif.relatedRecordId ? ` · Record: ${notif.relatedRecordId}` : ''}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {linkedFdr && (
                  <button
                    type="button"
                    onClick={() => setSelectedFdrForDrawer(linkedFdr)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded"
                  >
                    Open FDR
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => markNotificationRead(notif)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  {notif.readStatus ? 'Mark Unread' : 'Mark Read'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ModalDialog
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        title="Dispatch Statutory Notification"
        subtitle="Broadcast an official compliance or maturity reminder."
      >
        <form onSubmit={handleDispatchNotice} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Notification Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {ALL_NOTIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) =>
                  setNewSeverity(
                    e.target.value as 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="SUCCESS">SUCCESS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Notice Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Urgent 15-Day FDR Maturity Notice"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Detailed Message
            </label>
            <textarea
              rows={3}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDispatchModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
            >
              Dispatch Notification
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 2. SECTION 15 — REPORTS & EXPORTS MODULE (10 STATUTORY REPORTS)
// ============================================================================
export const AdminReportsPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    discrepancies,
    renewals,
    releases,
    getRemainingDays,
    showToast,
  } = useData();

  const [selectedReport, setSelectedReport] = useState<ReportCategory>(
    'Institution-wise FDR Summary'
  );
  const [stateFilter, setStateFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [printableModalOpen, setPrintableModalOpen] = useState(false);

  const uniqueStates = useMemo(
    () => Array.from(new Set(institutions.map((i) => i.state))).sort(),
    [institutions]
  );
  const uniqueBanks = useMemo(
    () => Array.from(new Set(fdrs.map((f) => f.bankName))).sort(),
    [fdrs]
  );

  const reportTable = useMemo(() => {
    const filteredFdrList = fdrs.filter((f) => {
      if (bankFilter !== 'ALL' && f.bankName !== bankFilter) return false;
      if (stateFilter !== 'ALL') {
        const inst = institutions.find((i) => i.institutionId === f.institutionId);
        if (inst && inst.state !== stateFilter) return false;
      }
      return true;
    });

    switch (selectedReport) {
      case 'Institution-wise FDR Summary': {
        const headers = [
          'AICTE ID',
          'Institution Name',
          'State',
          'Category',
          'Total FDRs',
          'Total Deposit (INR)',
          'Compliance Status',
        ];
        const rows = institutions
          .filter((i) => stateFilter === 'ALL' || i.state === stateFilter)
          .map((i) => {
            const iFdrs = fdrs.filter((f) => f.institutionId === i.institutionId);
            const sum = iFdrs.reduce(
              (acc, f) => acc + (Number(f.principalAmount) || 0),
              0
            );
            return [
              i.aictePermanentId,
              i.name,
              i.state,
              i.category,
              String(iFdrs.length),
              formatINR(sum),
              i.complianceStatus,
            ];
          });
        return { headers, rows };
      }
      case 'Active FDR Register': {
        const headers = [
          'FDR ID',
          'FDR Number',
          'Institution',
          'Bank',
          'Principal',
          'Issue Date',
          'Maturity Date',
          'Status',
        ];
        const rows = filteredFdrList
          .filter(
            (f) =>
              f.status === 'VERIFIED_ACTIVE' ||
              f.adminStatus === 'Active' ||
              f.adminStatus === 'Verified'
          )
          .map((f) => [
            f.fdrId,
            f.fdrNumber,
            f.institutionName,
            f.bankName,
            formatINR(f.principalAmount),
            f.issueDate,
            f.maturityDate,
            f.status,
          ]);
        return { headers, rows };
      }
      case 'Pending Verification Report': {
        const headers = [
          'FDR ID',
          'FDR Number',
          'Institution',
          'Bank',
          'Amount',
          'Verification Status',
          'Bank Check Status',
        ];
        const rows = filteredFdrList
          .filter((f) => f.verificationStatus !== 'Verified')
          .map((f) => [
            f.fdrId,
            f.fdrNumber,
            f.institutionName,
            f.bankName,
            formatINR(f.principalAmount),
            f.verificationStatus || 'Verification Pending',
            f.bankVerificationStatus || 'NOT VERIFIED',
          ]);
        return { headers, rows };
      }
      case 'Discrepancy Report': {
        const headers = [
          'Discrepancy ID',
          'FDR Number',
          'Institution',
          'Discrepancy Type',
          'Severity',
          'Assigned Officer',
          'Resolution Status',
        ];
        const rows = discrepancies.map((d) => [
          d.discrepancyId,
          d.fdrNumber,
          d.institutionName,
          d.discrepancyType,
          d.severity,
          d.assignedOfficer,
          d.resolutionStatus,
        ]);
        return { headers, rows };
      }
      case 'Expiring FDR Report': {
        const headers = [
          'FDR Number',
          'Institution',
          'Bank',
          'Principal',
          'Maturity Date',
          'Remaining Days',
          'Status',
        ];
        const rows = filteredFdrList
          .filter((f) => {
            const rem = getRemainingDays(f.maturityDate);
            return rem > 0 && rem <= 30;
          })
          .map((f) => [
            f.fdrNumber,
            f.institutionName,
            f.bankName,
            formatINR(f.principalAmount),
            f.maturityDate,
            `${getRemainingDays(f.maturityDate)} days`,
            f.status,
          ]);
        return { headers, rows };
      }
      case 'Matured FDR Report': {
        const headers = [
          'FDR Number',
          'Institution',
          'Bank',
          'Principal',
          'Maturity Date',
          'Days Past Maturity',
          'Status',
        ];
        const rows = filteredFdrList
          .filter(
            (f) => getRemainingDays(f.maturityDate) <= 0 || f.status === 'MATURED'
          )
          .map((f) => [
            f.fdrNumber,
            f.institutionName,
            f.bankName,
            formatINR(f.principalAmount),
            f.maturityDate,
            `${Math.abs(getRemainingDays(f.maturityDate))} days overdue`,
            f.status,
          ]);
        return { headers, rows };
      }
      case 'Renewal Status Report': {
        const headers = [
          'Renewal ID',
          'Type',
          'Institution',
          'Original FDR',
          'New FDR',
          'New Amount',
          'New Maturity',
          'Status',
        ];
        const rows = renewals.map((r) => [
          r.renewalId,
          r.requestType,
          r.institutionName,
          r.originalFdrNumber,
          r.newFdrNumber,
          formatINR(r.newAmount),
          r.newMaturityDate,
          r.status,
        ]);
        return { headers, rows };
      }
      case 'Release / Refund Report': {
        const headers = [
          'Request ID',
          'FDR Number',
          'Institution',
          'Amount',
          'Workflow Stage',
          'Submitted At',
          'Reason',
        ];
        const rows = releases.map((r) => [
          r.requestId,
          r.fdrNumber,
          r.institutionName,
          formatINR(r.depositAmount),
          r.stage,
          formatDateShort(r.submittedAt),
          r.reason,
        ]);
        return { headers, rows };
      }
      case 'Bank-wise Deposit Concentration Report': {
        const headers = [
          'Issuing Bank Name',
          'Total FDR Instruments',
          'Aggregate Principal Deposit',
          'Verified Instruments',
        ];
        const map = new Map<
          string,
          { count: number; amount: number; verified: number }
        >();
        filteredFdrList.forEach((f) => {
          const cur = map.get(f.bankName) || { count: 0, amount: 0, verified: 0 };
          map.set(f.bankName, {
            count: cur.count + 1,
            amount: cur.amount + (Number(f.principalAmount) || 0),
            verified: cur.verified + (f.status === 'VERIFIED_ACTIVE' ? 1 : 0),
          });
        });
        const rows = Array.from(map.entries()).map(([bank, st]) => [
          bank,
          String(st.count),
          formatINR(st.amount),
          String(st.verified),
        ]);
        return { headers, rows };
      }
      case 'State-wise Compliance Report': {
        const headers = [
          'State',
          'Total Institutions',
          'Compliant',
          'At Risk / Non-Compliant',
          'Aggregate Deposit Value',
        ];
        const map = new Map<
          string,
          { insts: number; compliant: number; nonCompliant: number; deposit: number }
        >();
        institutions.forEach((i) => {
          const cur = map.get(i.state) || {
            insts: 0,
            compliant: 0,
            nonCompliant: 0,
            deposit: 0,
          };
          const instDeposit = fdrs
            .filter((f) => f.institutionId === i.institutionId)
            .reduce((s, f) => s + (Number(f.principalAmount) || 0), 0);
          map.set(i.state, {
            insts: cur.insts + 1,
            compliant: cur.compliant + (i.complianceStatus === 'COMPLIANT' ? 1 : 0),
            nonCompliant:
              cur.nonCompliant + (i.complianceStatus !== 'COMPLIANT' ? 1 : 0),
            deposit: cur.deposit + instDeposit,
          });
        });
        const rows = Array.from(map.entries()).map(([st, v]) => [
          st,
          String(v.insts),
          String(v.compliant),
          String(v.nonCompliant),
          formatINR(v.deposit),
        ]);
        return { headers, rows };
      }
    }
  }, [
    selectedReport,
    fdrs,
    institutions,
    discrepancies,
    renewals,
    releases,
    stateFilter,
    bankFilter,
    getRemainingDays,
  ]);

  const handleExportCsv = () => {
    const csvLines = [
      reportTable.headers.join(','),
      ...reportTable.rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AICTE_${selectedReport.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      'CSV Export Generated',
      `Exported ${reportTable.rows.length} rows for "${selectedReport}".`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 15 · Statutory Intelligence & Export Suite"
        title="Statutory Reports & Printable Registers (10 Categories)"
        subtitle="Generate, filter, export to CSV, or open formatted Printable / PDF Statutory Registers across all 10 mandated categories."
        primaryActionLabel="Export Current Report (CSV)"
        onPrimaryAction={handleExportCsv}
        secondaryActionLabel="Printable / PDF Report View"
        onSecondaryAction={() => setPrintableModalOpen(true)}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-800">
          Select Statutory Report Category (10 Reports Available):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {ALL_REPORT_CATEGORIES.map((cat, idx) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedReport(cat)}
              className={`p-2.5 rounded border text-left text-xs font-medium transition-colors ${
                selectedReport === cat
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              0{idx + 1}. {cat}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-600">Report Filters:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
            >
              <option value="ALL">All States</option>
              {uniqueStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
            >
              <option value="ALL">All Banks</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="font-mono text-slate-500">
            Showing {reportTable.rows.length} rows in "{selectedReport}"
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                {reportTable.headers.map((h) => (
                  <th key={h} className="py-3 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-4 text-slate-800">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalDialog
        isOpen={printableModalOpen}
        onClose={() => setPrintableModalOpen(false)}
        title={`Printable / PDF Statutory Register — ${selectedReport}`}
        subtitle="Official AICTE Finance & Statutory Deposit Bureau Gazette Format"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 border-2 border-slate-900 rounded-md space-y-2">
            <div className="text-center border-b border-slate-300 pb-3">
              <div className="font-bold text-sm text-slate-900 uppercase">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
              </div>
              <div className="text-xs text-slate-600">
                Finance & Statutory Deposit Bureau · Centralized FDR Management System
              </div>
              <div className="mt-1 font-mono font-semibold text-teal-700">
                OFFICIAL REPORT: {selectedReport.toUpperCase()} ({reportTable.rows.length}{' '}
                RECORDS)
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 font-bold">
                    {reportTable.headers.map((h) => (
                      <th key={h} className="py-1.5 px-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportTable.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((c, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 border border-slate-300 rounded-md font-medium"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 3. SECTION 16 — IMMUTABLE AUDIT LOGS PAGE
// ============================================================================
export const AdminAuditLogsPage: React.FC = () => {
  const { auditLogs } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (entityFilter !== 'ALL' && log.module !== entityFilter) return false;
      if (!q) return true;
      return (
        (log.actorName || log.actorEmail).toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        log.targetId.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, searchQuery, entityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 16 · Immutable Statutory Ledger"
        title="System-Wide Append-Only Audit Logs"
        subtitle="Complete trace of every user action, role change, verification outcome, discrepancy resolution, and release sanction with previous/new state values."
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by User, Role, Action Type, Entity ID, or Description..."
        rightSlot={
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="ALL">All Modules ({auditLogs.length} Events)</option>
            <option value="FDR_REPOSITORY">FDR_REPOSITORY</option>
            <option value="INSTITUTION_MANAGEMENT">INSTITUTION_MANAGEMENT</option>
            <option value="DISCREPANCY_MANAGEMENT">DISCREPANCY_MANAGEMENT</option>
            <option value="RENEWAL_MONITORING">RENEWAL_MONITORING</option>
            <option value="RELEASE_PROCESSING">RELEASE_PROCESSING</option>
            <option value="DOCUMENT_MANAGEMENT">DOCUMENT_MANAGEMENT</option>
            <option value="USER_ROLE_MANAGEMENT">USER_ROLE_MANAGEMENT</option>
          </select>
        }
      />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">Date & Time</th>
                <th className="py-3 px-3.5">User & Role</th>
                <th className="py-3 px-3.5">Action</th>
                <th className="py-3 px-3.5">Related Entity</th>
                <th className="py-3 px-3.5">Previous → New Value</th>
                <th className="py-3 px-3.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDateShort(log.createdAt)}
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900">
                      {log.actorName || log.actorEmail}
                    </div>
                    <div className="text-[11px] font-mono text-teal-700">
                      {log.actorRole}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                    {log.module} / {log.targetId}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                    <span className="text-slate-500">{log.previousValue || '—'}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-semibold text-emerald-700">
                      {log.newValue || 'UPDATED'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 max-w-md">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. SECTION 17 — USER & ROLE MANAGEMENT PAGE
// ============================================================================
export const AdminUserRoleManagementPage: React.FC = () => {
  const { profile, switchActiveRole } = useAuth();
  const { users, institutions, createDemoUser, updateUserRoleAndStatus } = useData();

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.AICTE_SCRUTINY_OFFICER);
  const [newInstId, setNewInstId] = useState(
    institutions[0]?.institutionId || 'INST-1001'
  );
  const [newDept] = useState('Statutory FDR Verification Desk');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutions.find((i) => i.institutionId === newInstId);
    await createDemoUser({
      displayName: newName,
      email: newEmail,
      role: newRole,
      institutionId:
        newRole === UserRole.INSTITUTION_ADMIN ? newInstId : 'AICTE_HQ_DELHI',
      institutionName:
        newRole === UserRole.INSTITUTION_ADMIN
          ? inst?.name || 'Approved Institution'
          : 'AICTE Headquarters, New Delhi',
      department: newDept,
    });
    setCreateUserOpen(false);
    setNewName('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 17 · Identity & RBAC Governance"
        title="User & Role Management (5 Statutory Tiers)"
        subtitle="Create demo users, assign or change roles, associate institutions, activate/deactivate accounts, and switch active demo sessions."
        primaryActionLabel="Create Demo User"
        onPrimaryAction={() => setCreateUserOpen(true)}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase">
            Statutory Role Permissions Matrix & Instant Demo Role Switcher
          </h3>
          <span className="text-xs font-mono text-teal-700">
            Active Session: {profile?.role}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <div
              key={r}
              className={`p-3.5 rounded-lg border flex flex-col justify-between gap-3 ${
                profile?.role === r
                  ? 'border-teal-600 bg-teal-50/50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <div className="font-bold text-slate-900">{ROLE_LABELS[r]}</div>
                <div className="font-mono text-[10px] text-slate-500 mt-0.5">{r}</div>
                <p className="text-[11px] text-slate-600 mt-1.5">
                  {ROLE_DESCRIPTIONS[r]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchActiveRole(r)}
                className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
              >
                Switch Session to Role
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">User Name & Email</th>
                <th className="py-3 px-3.5">Assigned Role</th>
                <th className="py-3 px-3.5">Associated Institution / Office</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Last Activity</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900">{u.displayName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        updateUserRoleAndStatus(
                          u,
                          e.target.value as UserRole,
                          u.status
                        )
                      }
                      className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((rk) => (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700">
                    <div>{u.institutionName}</div>
                    <div className="text-[11px] text-slate-500">{u.department}</div>
                  </td>
                  <td className="py-3 px-3.5">
                    <SemanticStatusText status={u.status} />
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                    {formatDateShort(u.lastActivity || u.updatedAt)}
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        updateUserRoleAndStatus(
                          u,
                          u.role,
                          u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium"
                    >
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalDialog
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title="Create Statutory Portal Demo User"
        subtitle="Provision a new officer or institutional nodal user account."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {ROLE_LABELS[rk]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Associated Institution
              </label>
              <select
                value={newInstId}
                onChange={(e) => setNewInstId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {institutions.map((i) => (
                  <option key={i.institutionId} value={i.institutionId}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateUserOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
            >
              Create User
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 5. SECTIONS 18 & 19 — SYSTEM SETTINGS & DEMO SIMULATION CONSOLE
// ============================================================================
export const AdminSystemConfigPage: React.FC = () => {
  const {
    systemConfig,
    saveSystemConfiguration,
    resetDemoDataToSeed,
    simulateSampleDiscrepancy,
    simulateMaturityAlert,
    simulateRenewalCase,
    simulateReleaseWorkflowCase,
    runBankVerificationSimulator,
    fdrs,
  } = useData();

  const [lead30, setLead30] = useState(systemConfig.maturityAlertWindowDays || 30);
  const [lead15, setLead15] = useState(systemConfig.reminderInterval15Days || 15);
  const [lead7, setLead7] = useState(systemConfig.reminderInterval7Days || 7);
  const [escalationHours, setEscalationHours] = useState(
    systemConfig.escalationSlaHours || 48
  );
  const [minLockInYears, setMinLockInYears] = useState(
    systemConfig.defaultLockInYears || 8
  );
  const [banksInput, setBanksInput] = useState(
    systemConfig.allowedBankCategories ||
      'State Bank of India, Punjab National Bank, Bank of Baroda, Canara Bank, Union Bank of India, Indian Bank, Bank of India, Central Bank of India'
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSystemConfiguration({
      maturityAlertWindowDays: Number(lead30),
      reminderInterval15Days: Number(lead15),
      reminderInterval7Days: Number(lead7),
      escalationSlaHours: Number(escalationHours),
      defaultLockInYears: Number(minLockInYears),
      allowedBankCategories: banksInput,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sections 18 & 19 · Statutory Policy & Demo Simulation Engine"
        title="System Configuration & Demo Simulation Console"
        subtitle="Configure maturity reminder thresholds (30d / 15d / 7d), approved banks, document rules, release eligibility norms, and trigger live demo events."
      />

      <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-teal-400 uppercase">
              Section 19 · Interactive Demo Simulation Console
            </div>
            <h3 className="text-base font-bold mt-0.5">
              One-Click Statutory Lifecycle Event Generators
            </h3>
          </div>
          <Sparkles className="w-5 h-5 text-teal-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => {
              const target = fdrs[0];
              if (target) runBankVerificationSimulator(target.fdrId, 'Simulated match');
            }}
            className="p-3 bg-teal-600 hover:bg-teal-500 rounded font-medium text-left"
          >
            1. Simulate Bank Verification
          </button>
          <button
            type="button"
            onClick={() => simulateSampleDiscrepancy()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-medium text-left text-amber-300"
          >
            2. Create Sample Discrepancy
          </button>
          <button
            type="button"
            onClick={() => simulateMaturityAlert()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-medium text-left text-rose-300"
          >
            3. Simulate Maturity Alert
          </button>
          <button
            type="button"
            onClick={() => simulateRenewalCase()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-medium text-left"
          >
            4. Simulate Renewal Case
          </button>
          <button
            type="button"
            onClick={() => simulateReleaseWorkflowCase()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-medium text-left"
          >
            5. Simulate Release Workflow
          </button>
          <button
            type="button"
            onClick={() => resetDemoDataToSeed()}
            className="p-3 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded font-medium text-left"
          >
            6. Reset Demo Data (20 Inst / 50 FDRs)
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 text-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              01. Maturity Reminder Lead Window 1 (Days)
            </label>
            <input
              type="number"
              value={lead30}
              onChange={(e) => setLead30(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              02. Maturity Reminder Lead Window 2 (Days)
            </label>
            <input
              type="number"
              value={lead15}
              onChange={(e) => setLead15(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              03. Critical Maturity Alert Window 3 (Days)
            </label>
            <input
              type="number"
              value={lead7}
              onChange={(e) => setLead7(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              04. Discrepancy Escalation SLA (Hours)
            </label>
            <input
              type="number"
              value={escalationHours}
              onChange={(e) => setEscalationHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              05. Minimum Statutory Lock-In Period (Years)
            </label>
            <input
              type="number"
              value={minLockInYears}
              onChange={(e) => setMinLockInYears(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              06. Allowed Document Formats
            </label>
            <input
              type="text"
              disabled
              value="PDF, JPG, JPEG, PNG (Max 15 MB)"
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block font-semibold text-slate-800 mb-1">
              07. Approved Scheduled / Nationalized Banks
            </label>
            <textarea
              rows={2}
              value={banksInput}
              onChange={(e) => setBanksInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium"
          >
            Save System Configuration (Updates Maturity & Release Rules Dynamically)
          </button>
        </div>
      </form>
    </div>
  );
};
