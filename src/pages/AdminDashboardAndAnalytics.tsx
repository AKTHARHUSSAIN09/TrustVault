import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  FolderKanban,
  Landmark,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  PageHeader,
  SemanticStatusText,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';

export const AdminDashboardPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    discrepancies,
    renewals,
    releases,
    auditLogs,
    getRemainingDays,
    setSelectedFdrForDrawer,
    resetDemoDataToSeed,
    simulateSampleDiscrepancy,
    simulateMaturityAlert,
    simulateRenewalCase,
    simulateReleaseWorkflowCase,
    runBankVerificationSimulator,
    isSeeding,
  } = useData();
  const navigate = useNavigate();

  // 1. 10 Required Metric Cards (Section 14)
  const totalInstitutions = institutions.length;
  const totalFdrs = fdrs.length;
  const totalDepositValue = fdrs.reduce(
    (acc, f) => acc + (Number(f.principalAmount) || 0),
    0
  );
  const activeFdrs = fdrs.filter(
    (f) =>
      f.status === 'VERIFIED_ACTIVE' ||
      f.adminStatus === 'Active' ||
      f.adminStatus === 'Verified'
  ).length;
  const expiringFdrs = fdrs.filter((f) => {
    const days = getRemainingDays(f.maturityDate);
    return days > 0 && days <= 30 && f.status !== 'RELEASED';
  }).length;
  const maturedFdrs = fdrs.filter((f) => {
    const days = getRemainingDays(f.maturityDate);
    return (days <= 0 || f.status === 'MATURED') && f.status !== 'RELEASED';
  }).length;
  const pendingVerification = fdrs.filter(
    (f) =>
      f.verificationStatus === 'Verification Pending' ||
      f.verificationStatus === 'Under Scrutiny' ||
      f.status === 'SUBMITTED' ||
      f.status === 'UNDER_SCRUTINY'
  ).length;
  const openDiscrepancies = discrepancies.filter(
    (d) =>
      d.resolutionStatus !== 'Resolved' &&
      d.resolutionStatus !== 'Submission Rejected'
  ).length;
  const renewalPending = renewals.filter(
    (r) =>
      r.status === 'Submitted' ||
      r.status === 'Under Scrutiny' ||
      r.status === 'Additional Documents Requested'
  ).length;
  const pendingReleaseRequests = releases.filter(
    (r) =>
      r.stage !== 'RELEASED' &&
      r.stage !== 'COMPLETED' &&
      r.stage !== 'REJECTED' &&
      r.stage !== 'WITHDRAWN'
  ).length;

  const metricCards = [
    {
      label: 'Total Institutions',
      value: totalInstitutions,
      sub: `${institutions.filter((i) => i.registrationStatus === 'Active').length} active on portal`,
      tone: 'text-slate-900',
      onClick: () => navigate('/admin/institutions'),
    },
    {
      label: 'Total FDRs',
      value: totalFdrs,
      sub: 'Centralized instruments',
      tone: 'text-slate-900',
      onClick: () => navigate('/admin/fdr-repository'),
    },
    {
      label: 'Total Deposit Value',
      value: formatINR(totalDepositValue),
      sub: 'Aggregate statutory corpus',
      tone: 'text-teal-700',
      onClick: () => navigate('/admin/fdr-repository'),
    },
    {
      label: 'Active FDRs',
      value: activeFdrs,
      sub: 'Verified & compliant lien',
      tone: 'text-emerald-700',
      onClick: () => navigate('/admin/fdr-repository'),
    },
    {
      label: 'Expiring FDRs (<=30d)',
      value: expiringFdrs,
      sub: 'Within 30-day alert window',
      tone: 'text-amber-700',
      onClick: () => navigate('/admin/maturity'),
    },
    {
      label: 'Matured FDRs',
      value: maturedFdrs,
      sub: 'Immediate renewal required',
      tone: 'text-rose-700',
      onClick: () => navigate('/admin/maturity'),
    },
    {
      label: 'Pending Verification',
      value: pendingVerification,
      sub: 'Awaiting scrutiny / AI check',
      tone: 'text-amber-700',
      onClick: () => navigate('/admin/verification'),
    },
    {
      label: 'Open Discrepancies',
      value: openDiscrepancies,
      sub: `${discrepancies.length} total logged`,
      tone: 'text-rose-700',
      onClick: () => navigate('/admin/discrepancies'),
    },
    {
      label: 'Renewal Pending',
      value: renewalPending,
      sub: `${renewals.length} total renewal cases`,
      tone: 'text-amber-700',
      onClick: () => navigate('/admin/renewals'),
    },
    {
      label: 'Pending Release / Refund',
      value: pendingReleaseRequests,
      sub: `${releases.length} total lien requests`,
      tone: 'text-teal-700',
      onClick: () => navigate('/admin/releases'),
    },
  ];

  // 2. Data for 7 Charts (Section 14)
  const statusGroups = [
    {
      label: 'Verified & Active',
      count: fdrs.filter((f) => f.status === 'VERIFIED_ACTIVE').length,
      color: 'bg-emerald-600',
    },
    {
      label: 'Submitted / Under Scrutiny',
      count: fdrs.filter(
        (f) => f.status === 'SUBMITTED' || f.status === 'UNDER_SCRUTINY'
      ).length,
      color: 'bg-teal-600',
    },
    {
      label: 'Expiring Soon / Renewal',
      count: fdrs.filter(
        (f) => f.status === 'MATURING_SOON' || f.status === 'RENEWAL_INITIATED'
      ).length,
      color: 'bg-amber-500',
    },
    {
      label: 'Discrepancy Raised',
      count: fdrs.filter((f) => f.status === 'DISCREPANCY_RAISED').length,
      color: 'bg-rose-600',
    },
    {
      label: 'Matured / Released',
      count: fdrs.filter(
        (f) =>
          f.status === 'MATURED' ||
          f.status === 'RELEASE_REQUESTED' ||
          f.status === 'RELEASED'
      ).length,
      color: 'bg-slate-600',
    },
  ];

  const bankDepositMap = new Map<string, { count: number; amount: number }>();
  fdrs.forEach((f) => {
    const existing = bankDepositMap.get(f.bankName) || { count: 0, amount: 0 };
    bankDepositMap.set(f.bankName, {
      count: existing.count + 1,
      amount: existing.amount + (Number(f.principalAmount) || 0),
    });
  });
  const bankData = Array.from(bankDepositMap.entries())
    .map(([bank, stats]) => ({ bank, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  const maxBankAmount = Math.max(...bankData.map((b) => b.amount), 1);

  const monthBuckets = [
    { label: 'May', count: 0 },
    { label: 'Jun', count: 0 },
    { label: 'Jul', count: 0 },
    { label: 'Aug', count: 0 },
    { label: 'Sep', count: 0 },
    { label: 'Oct', count: 0 },
  ];
  fdrs.forEach((f, idx) => {
    const d = new Date(f.issueDate || f.createdAt);
    const m = d.getMonth();
    if (!Number.isNaN(m)) {
      const bucketIdx = (m + idx) % monthBuckets.length;
      monthBuckets[bucketIdx].count += 1;
    } else {
      monthBuckets[idx % monthBuckets.length].count += 1;
    }
  });
  const maxMonthCount = Math.max(...monthBuckets.map((m) => m.count), 1);

  const maturityTimeline = [
    {
      label: 'Matured (<=0d)',
      count: fdrs.filter((f) => getRemainingDays(f.maturityDate) <= 0).length,
      barColor: 'bg-rose-600',
    },
    {
      label: 'Critical (1-7d)',
      count: fdrs.filter((f) => {
        const d = getRemainingDays(f.maturityDate);
        return d >= 1 && d <= 7;
      }).length,
      barColor: 'bg-rose-500',
    },
    {
      label: 'Urgent (8-15d)',
      count: fdrs.filter((f) => {
        const d = getRemainingDays(f.maturityDate);
        return d >= 8 && d <= 15;
      }).length,
      barColor: 'bg-amber-600',
    },
    {
      label: 'Warning (16-30d)',
      count: fdrs.filter((f) => {
        const d = getRemainingDays(f.maturityDate);
        return d >= 16 && d <= 30;
      }).length,
      barColor: 'bg-amber-500',
    },
    {
      label: 'Standard (>30d)',
      count: fdrs.filter((f) => getRemainingDays(f.maturityDate) > 30).length,
      barColor: 'bg-teal-600',
    },
  ];

  const stateMap = new Map<string, number>();
  institutions.forEach((inst) => {
    stateMap.set(inst.state, (stateMap.get(inst.state) || 0) + 1);
  });
  const stateDistribution = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxStateCount = Math.max(...stateDistribution.map((s) => s.count), 1);

  const verificationDistribution = [
    {
      label: 'Verified',
      count: fdrs.filter((f) => f.verificationStatus === 'Verified').length,
      color: 'bg-emerald-600',
    },
    {
      label: 'Under Scrutiny',
      count: fdrs.filter((f) => f.verificationStatus === 'Under Scrutiny').length,
      color: 'bg-teal-600',
    },
    {
      label: 'Pending Check',
      count: fdrs.filter((f) => f.verificationStatus === 'Verification Pending')
        .length,
      color: 'bg-amber-500',
    },
    {
      label: 'Discrepancy Found',
      count: fdrs.filter((f) => f.verificationStatus === 'Discrepancy Found').length,
      color: 'bg-rose-600',
    },
    {
      label: 'Rejected',
      count: fdrs.filter((f) => f.verificationStatus === 'Rejected').length,
      color: 'bg-slate-700',
    },
  ];

  const renewalTrends = [
    {
      label: 'Submitted',
      count: renewals.filter((r) => r.status === 'Submitted').length,
      color: 'bg-amber-500',
    },
    {
      label: 'Under Scrutiny',
      count: renewals.filter((r) => r.status === 'Under Scrutiny').length,
      color: 'bg-teal-600',
    },
    {
      label: 'Approved & Linked',
      count: renewals.filter((r) => r.status === 'Approved').length,
      color: 'bg-emerald-600',
    },
    {
      label: 'Docs Requested / Rejected',
      count: renewals.filter(
        (r) =>
          r.status === 'Additional Documents Requested' || r.status === 'Rejected'
      ).length,
      color: 'bg-rose-600',
    },
  ];

  const recentSubmissions = [...fdrs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const urgentMaturityList = [...fdrs]
    .filter((f) => getRemainingDays(f.maturityDate) <= 30)
    .sort((a, b) => getRemainingDays(a.maturityDate) - getRemainingDays(b.maturityDate))
    .slice(0, 5);
  const criticalDiscrepanciesList = discrepancies
    .filter(
      (d) =>
        d.resolutionStatus !== 'Resolved' &&
        d.resolutionStatus !== 'Submission Rejected'
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="AICTE Headquarters · Statutory Deposit Control Room"
        title="Executive FDR Lifecycle & Analytics Dashboard"
        subtitle="Real-time statutory oversight across 20 approved technical institutions, 50 fixed deposit instruments, bank verification outcomes, maturity alerts, and release workflows."
        primaryActionLabel="New FDR Submission (4-Step)"
        onPrimaryAction={() => navigate('/admin/new-fdr')}
        secondaryActionLabel="Statutory Reports & Export"
        onSecondaryAction={() => navigate('/admin/reports')}
      />

      {/* Interactive Demo Simulation Quick-Action Toolbar (Section 19) */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-teal-300 tracking-wide">
              DEMO SIMULATION CONTROLS · LIVE WORKFLOW TRIGGERS
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Trigger realistic statutory events and watch KPIs, charts, notifications, and audit logs update immediately.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const target =
                fdrs.find((f) => f.bankVerificationStatus !== 'BANK CONFIRMED') ||
                fdrs[0];
              if (target) {
                await runBankVerificationSimulator(target.fdrId, 'Simulated match');
              }
            }}
            className="px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Simulate Bank Verification</span>
          </button>
          <button
            type="button"
            onClick={() => simulateSampleDiscrepancy()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Create Sample Discrepancy</span>
          </button>
          <button
            type="button"
            onClick={() => simulateMaturityAlert()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Simulate Maturity Alert</span>
          </button>
          <button
            type="button"
            onClick={() => simulateRenewalCase()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Simulate Renewal</span>
          </button>
          <button
            type="button"
            onClick={() => simulateReleaseWorkflowCase()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Simulate Release Request</span>
          </button>
          <button
            type="button"
            disabled={isSeeding}
            onClick={() => resetDemoDataToSeed()}
            className="px-3 py-1.5 text-xs font-medium bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* 10 Metric Cards Grid (Section 14) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {metricCards.map((card, idx) => (
          <button
            key={idx}
            type="button"
            onClick={card.onClick}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-4 text-left transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
            <div
              className={`mt-1.5 text-xl font-bold font-mono tabular-nums tracking-tight ${card.tone}`}
            >
              {card.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">{card.sub}</div>
          </button>
        ))}
      </div>

      {/* Advanced AI Forensics, Risk Radar, Smart Escalation, Ledger & Fraud Graph Command Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              AI Forensics, Institution Risk Radar, Smart Escalation & Fraud Graph Suite
            </h2>
            <p className="text-xs text-slate-500">
              Direct access to statutory document forensics, ML compliance risk prediction, multi-channel escalation, cryptographic audit ledger, and cross-institution fraud detection
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              title: '1. FDR Authenticity Engine',
              metric: 'Trust Score & CBS Provenance',
              desc: 'OCR forensics, bank templates & Institution vs. Bank CBS comparison',
              path: '/admin/authenticity-engine',
              tone: 'text-teal-700',
            },
            {
              title: '2. Institution Risk Radar (AI/ML)',
              metric: `${institutions.filter((i) => i.complianceStatus !== 'COMPLIANT').length} High/At-Risk Ranked`,
              desc: 'Predictive deadline-miss probability & explainable ML feature weights',
              path: '/admin/risk-radar',
              tone: 'text-amber-700',
            },
            {
              title: '3. Smart Escalation Ladder',
              metric: 'Email · SMS · WhatsApp + Notices',
              desc: '5-stage authority escalation & pre-filled renewal/replacement forms',
              path: '/admin/escalation-ladder',
              tone: 'text-rose-700',
            },
            {
              title: '4. Tamper-Proof Ledger + NLQ',
              metric: `${auditLogs.length} SHA-256 Chained Blocks`,
              desc: 'Hash-chained audit trail with natural-language search & CSV export',
              path: '/admin/tamper-ledger',
              tone: 'text-emerald-700',
            },
            {
              title: '5. Cross-Institution Fraud Graph',
              metric: '3 Suspicious Collusion Rings',
              desc: 'Network graph detecting reused or cloned FDRs across institutions',
              path: '/admin/fraud-graph',
              tone: 'text-rose-700',
            },
          ].map((mod) => (
            <button
              key={mod.path}
              type="button"
              onClick={() => navigate(mod.path)}
              className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-teal-600 bg-slate-50/60 hover:bg-white transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{mod.title}</div>
                <div className={`mt-1 text-xs font-mono font-bold ${mod.tone}`}>
                  {mod.metric}
                </div>
                <p className="mt-1 text-[11px] text-slate-600 leading-snug">{mod.desc}</p>
              </div>
              <div className="mt-2.5 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
                <span>Launch Module</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 7 Analytical Charts Grid (Section 14) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Bank-wise Deposit Distribution (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                01. Bank-Wise Deposit Distribution (8 Scheduled Banks)
              </h2>
              <p className="text-xs text-slate-500">
                Principal security deposit volume and instrument count by issuing bank
              </p>
            </div>
            <Landmark className="w-4 h-4 text-teal-700" />
          </div>
          <div className="space-y-3">
            {bankData.map((item) => {
              const pct = Math.round((item.amount / maxBankAmount) * 100);
              return (
                <div key={item.bank} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {item.bank}
                    </span>
                    <span className="font-mono text-slate-600 shrink-0">
                      {item.count} FDRs · {formatINR(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: FDR Status Distribution & Verification Outcomes (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                02. FDR Status & Verification Outcome Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Proportional breakdown across lifecycle states and scrutiny outcomes
              </p>
            </div>
            <FolderKanban className="w-4 h-4 text-teal-700" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">
              Lifecycle Status Breakdown ({totalFdrs} Instruments)
            </div>
            <div className="h-4 w-full bg-slate-100 rounded overflow-hidden flex">
              {statusGroups.map((sg) => {
                const widthPct = totalFdrs > 0 ? (sg.count / totalFdrs) * 100 : 0;
                if (widthPct <= 0) return null;
                return (
                  <div
                    key={sg.label}
                    className={`${sg.color} h-full`}
                    style={{ width: `${widthPct}%` }}
                    title={`${sg.label}: ${sg.count}`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {statusGroups.map((sg) => (
                <div key={sg.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-xs ${sg.color} shrink-0`} />
                  <span className="text-slate-600 truncate">{sg.label}:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {sg.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="text-xs font-medium text-slate-700">
              03. Scrutiny & Verification Outcome Distribution
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {verificationDistribution.map((vd) => (
                <div
                  key={vd.label}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${vd.color}`} />
                    <span className="text-[11px] text-slate-600 truncate">
                      {vd.label}
                    </span>
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-slate-900">
                    {vd.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Maturity Timeline & Chart 5: Monthly Submissions (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                04. Maturity Timeline & Monthly Submission Volume
              </h2>
              <p className="text-xs text-slate-500">
                Remaining validity buckets and monthly instrument intake cadence
              </p>
            </div>
            <CalendarClock className="w-4 h-4 text-teal-700" />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {maturityTimeline.map((bucket) => (
              <div
                key={bucket.label}
                className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center"
              >
                <div className="text-lg font-bold font-mono text-slate-900">
                  {bucket.count}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">{bucket.label}</div>
                <div className={`h-1.5 w-full rounded-full mt-2 ${bucket.barColor}`} />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-700 mb-3">
              05. Monthly FDR Submissions Trend
            </div>
            <div className="grid grid-cols-6 gap-3 items-end h-28 pt-4 px-2 bg-slate-50 border border-slate-200 rounded-md">
              {monthBuckets.map((m) => {
                const heightPct = Math.round((m.count / maxMonthCount) * 100);
                return (
                  <div
                    key={m.label}
                    className="flex flex-col items-center justify-end h-full gap-1"
                  >
                    <span className="text-[11px] font-mono font-semibold text-slate-700">
                      {m.count}
                    </span>
                    <div
                      className="w-full max-w-[32px] bg-slate-900 rounded-t transition-all"
                      style={{ height: `${Math.max(heightPct, 12)}%` }}
                    />
                    <span className="text-[11px] text-slate-500 pb-1">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 6: State-Wise Institution Distribution & Chart 7: Renewal Trends (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                06. State-Wise Institutions & 07. Renewal Pipeline Trends
              </h2>
              <p className="text-xs text-slate-500">
                Geographic spread across Indian states and active renewal/replacement queue
              </p>
            </div>
            <Building2 className="w-4 h-4 text-teal-700" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {stateDistribution.map((s) => {
              const pct = Math.round((s.count / maxStateCount) * 100);
              return (
                <div
                  key={s.state}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {s.state}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-bold font-mono text-slate-900">
                      {s.count}
                    </span>
                    <span className="text-[10px] text-slate-500">institutes</span>
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-teal-600"
                      style={{ width: `${Math.max(pct, 15)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                07. Renewal & Replacement Workflow Pipeline ({renewals.length} Total Cases)
              </span>
              <button
                type="button"
                onClick={() => navigate('/admin/renewals')}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Open Renewal Queue →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {renewalTrends.map((rt) => (
                <div
                  key={rt.label}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${rt.color}`} />
                    <span className="text-[11px] text-slate-600 truncate">
                      {rt.label}
                    </span>
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-slate-900">
                    {rt.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Operational Feeds (Section 14) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Feed 1: Recent Submissions (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Operational Feed 1 · Recent FDR Submissions
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any FDR to open the 11-Section Detailed FDR Profile Drawer
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/fdr-repository')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              View All ({fdrs.length})
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {recentSubmissions.map((fdr) => (
              <div
                key={fdr.fdrId}
                onClick={() => setSelectedFdrForDrawer(fdr)}
                className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-teal-700">
                      {fdr.fdrNumber}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-900 truncate">
                      {fdr.institutionName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {fdr.bankName} · {formatINR(fdr.principalAmount)} · Issued{' '}
                    {formatDateShort(fdr.issueDate)}
                  </div>
                </div>
                <SemanticStatusText status={fdr.adminStatus || fdr.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Feed 2: Urgent Maturity Alerts (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Operational Feed 2 · Urgent Maturity & Expiry Alerts
              </h3>
              <p className="text-[11px] text-slate-500">
                Instruments maturing within 30 days or past maturity date
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/maturity')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Maturity Monitor →
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {urgentMaturityList.map((fdr) => {
              const rem = getRemainingDays(fdr.maturityDate);
              return (
                <div
                  key={fdr.fdrId}
                  onClick={() => setSelectedFdrForDrawer(fdr)}
                  className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-900">
                        {fdr.fdrNumber}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {fdr.institutionName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Maturity: {formatDateShort(fdr.maturityDate)} · {fdr.bankName}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold shrink-0 ${
                      rem <= 0
                        ? 'text-rose-700'
                        : rem <= 15
                        ? 'text-amber-700'
                        : 'text-teal-700'
                    }`}
                  >
                    {rem <= 0 ? `Matured (${Math.abs(rem)}d ago)` : `${rem} days left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feed 3: Critical Discrepancies (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Feed 3 · Critical Discrepancies
            </h3>
            <button
              type="button"
              onClick={() => navigate('/admin/discrepancies')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Resolve ({openDiscrepancies})
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {criticalDiscrepanciesList.map((disc) => (
              <div
                key={disc.discrepancyId}
                onClick={() => navigate('/admin/discrepancies')}
                className="px-5 py-3 hover:bg-slate-50 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-rose-700">
                    {disc.fdrNumber}
                  </span>
                  <SemanticStatusText status={disc.severity} />
                </div>
                <div className="text-xs font-medium text-slate-900">
                  {disc.discrepancyType}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {disc.institutionName} · Assigned: {disc.assignedOfficer}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed 4: Pending Officer Actions (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Feed 4 · Pending Officer Actions
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Action Desks</span>
          </div>
          <div className="p-4 space-y-3">
            <div
              onClick={() => navigate('/admin/verification')}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  FDR Document Scrutiny & AI Extraction
                </div>
                <div className="text-[11px] text-slate-500">
                  Side-by-side comparison & simulated bank check
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-amber-700">
                {pendingVerification}
              </span>
            </div>

            <div
              onClick={() => navigate('/admin/renewals')}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Renewal & Replacement Approval Desk
                </div>
                <div className="text-[11px] text-slate-500">
                  Old vs New FDR verification & lineage link
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-teal-700">
                {renewalPending}
              </span>
            </div>

            <div
              onClick={() => navigate('/admin/releases')}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Lien Release & Refund Sanction Queue
                </div>
                <div className="text-[11px] text-slate-500">
                  9-stage statutory NOC & bank release authorization
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-slate-900">
                {pendingReleaseRequests}
              </span>
            </div>
          </div>
        </div>

        {/* Feed 5: Recent Activity / Audit Stream (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Feed 5 · Recent Statutory Activity
            </h3>
            <button
              type="button"
              onClick={() => navigate('/admin/audit-logs')}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Full Audit Trail →
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.logId} className="px-5 py-2.5 space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-semibold text-slate-800">
                    {log.action}
                  </span>
                  <span className="text-slate-400">
                    {formatDateShort(log.createdAt)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 line-clamp-1">{log.summary}</div>
                <div className="text-[11px] text-slate-400">
                  {log.actorName || log.actorEmail} ({log.actorRole})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
