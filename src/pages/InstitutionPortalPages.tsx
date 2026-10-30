import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  PageHeader,
  SemanticStatusText,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';
import {
  DocumentManagementPage,
  NewFdrSubmissionWizardPage,
} from './AdminCoreModules';
import { AdminAlertsEscalationPage } from './AdminGovernanceModules';

function useActiveInstitutionRecords() {
  const { profile } = useAuth();
  const data = useData();
  const activeInstId = profile?.institutionId || 'INST-1001';
  const institution =
    data.institutions.find((i) => i.institutionId === activeInstId) ||
    data.institutions[0];

  const instFdrs = useMemo(
    () => data.fdrs.filter((f) => f.institutionId === institution?.institutionId),
    [data.fdrs, institution]
  );
  const instDiscrepancies = useMemo(
    () =>
      data.discrepancies.filter(
        (d) => d.institutionId === institution?.institutionId
      ),
    [data.discrepancies, institution]
  );
  const instRenewals = useMemo(
    () =>
      data.renewals.filter((r) => r.institutionId === institution?.institutionId),
    [data.renewals, institution]
  );
  const instReleases = useMemo(
    () =>
      data.releases.filter((r) => r.institutionId === institution?.institutionId),
    [data.releases, institution]
  );
  const instNotifications = useMemo(
    () =>
      data.notifications.filter(
        (n) => !n.institutionId || n.institutionId === institution?.institutionId
      ),
    [data.notifications, institution]
  );

  return {
    ...data,
    institution,
    instFdrs,
    instDiscrepancies,
    instRenewals,
    instReleases,
    instNotifications,
  };
}

// 1. INSTITUTION DASHBOARD (Section 14 — 7 Institutional Metric Cards)
export const InstitutionDashboardPage: React.FC = () => {
  const {
    institution,
    instFdrs,
    instDiscrepancies,
    instRenewals,
    instReleases,
    instNotifications,
    getRemainingDays,
    setSelectedFdrForDrawer,
  } = useActiveInstitutionRecords();
  const navigate = useNavigate();

  const submittedFdrsCount = instFdrs.length;
  const activeFdrsCount = instFdrs.filter(
    (f) =>
      f.status === 'VERIFIED_ACTIVE' ||
      f.adminStatus === 'Active' ||
      f.adminStatus === 'Verified'
  ).length;
  const expiringFdrsCount = instFdrs.filter(
    (f) => getRemainingDays(f.maturityDate) <= 30
  ).length;
  const openDiscCount = instDiscrepancies.filter(
    (d) => d.resolutionStatus !== 'Resolved'
  ).length;
  const pendingRenewalsCount = instRenewals.filter(
    (r) => r.status !== 'Approved' && r.status !== 'Rejected'
  ).length;
  const releaseRequestsCount = instReleases.length;
  const unreadNotifCount = instNotifications.filter((n) => !n.readStatus).length;

  const metricCards = [
    {
      label: '01. Submitted FDRs',
      value: submittedFdrsCount,
      sub: formatINR(
        instFdrs.reduce((s, f) => s + (Number(f.principalAmount) || 0), 0)
      ),
      path: '/institution/status-tracking',
    },
    {
      label: '02. Active FDRs',
      value: activeFdrsCount,
      sub: 'Verified joint-lien instruments',
      path: '/institution/status-tracking',
    },
    {
      label: '03. Expiring / Matured FDRs',
      value: expiringFdrsCount,
      sub: 'Within 30-day alert window',
      path: '/institution/renewals',
    },
    {
      label: '04. Discrepancies / Clarifications',
      value: openDiscCount,
      sub: 'Requires nodal response',
      path: '/institution/status-tracking',
    },
    {
      label: '05. Pending Renewals',
      value: pendingRenewalsCount,
      sub: `${instRenewals.length} total renewal submissions`,
      path: '/institution/renewals',
    },
    {
      label: '06. Release Requests',
      value: releaseRequestsCount,
      sub: 'Statutory NOC & refund queue',
      path: '/institution/releases',
    },
    {
      label: '07. Unread Notifications',
      value: unreadNotifCount,
      sub: `${instNotifications.length} total alerts`,
      path: '/institution/notifications',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Institutional Nodal Workspace · ${institution?.aictePermanentId}`}
        title={institution?.name || 'Institution Dashboard'}
        subtitle="Manage your institution's Fixed Deposit Receipts, upload bank certificates, respond to scrutiny clarifications, and submit renewal or lien release requests."
        primaryActionLabel="Submit New FDR (4-Step Wizard)"
        onPrimaryAction={() => navigate('/institution/fdr-submissions')}
        secondaryActionLabel="Document Vault"
        onSecondaryAction={() => navigate('/institution/documents')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => navigate(c.path)}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-4 text-left transition-colors"
          >
            <div className="text-xs font-medium text-slate-500">{c.label}</div>
            <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900">
              {c.value}
            </div>
            <div className="mt-1 text-[11px] text-teal-700 font-medium">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-900">
              Institutional FDR Portfolio ({instFdrs.length} Instruments)
            </h2>
            <p className="text-[11px] text-slate-500">
              Click any instrument to inspect the 11-Section Detailed FDR Profile
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Issuing Bank</th>
                <th className="py-3 px-4 text-right">Deposit Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4 text-right">Remaining Days</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {instFdrs.map((fdr) => {
                const rem = getRemainingDays(fdr.maturityDate);
                return (
                  <tr
                    key={fdr.fdrId}
                    onClick={() => setSelectedFdrForDrawer(fdr)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                      {fdr.fdrNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-800">{fdr.bankName}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatINR(fdr.principalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {formatDateShort(fdr.maturityDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {rem} days
                    </td>
                    <td className="py-3 px-4">
                      <SemanticStatusText status={fdr.adminStatus || fdr.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-teal-700 font-medium">View Profile →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. INSTITUTION PROFILE PAGE
export const InstitutionProfilePage: React.FC = () => {
  const { institution, updateInstitutionDetails, instFdrs } =
    useActiveInstitutionRecords();
  const [contactPerson, setContactPerson] = useState(
    institution?.contactPerson || 'Dr. Rajeshwar Deshmukh'
  );
  const [contactEmail, setContactEmail] = useState(institution?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(institution?.contactPhone || '');
  const [address, setAddress] = useState(institution?.address || '');

  if (!institution) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateInstitutionDetails(institution.institutionId, {
      contactPerson,
      contactEmail,
      contactPhone,
      address,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Institutional Identity & Statutory Profile"
        title={`${institution.name} (${institution.aictePermanentId})`}
        subtitle="Maintain official nodal officer contact details and view AICTE compliance standing."
      />

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="text-slate-500">AICTE Permanent ID</div>
            <div className="font-mono font-bold text-teal-700 mt-1">
              {institution.aictePermanentId}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="text-slate-500">State, District & Region</div>
            <div className="font-semibold text-slate-900 mt-1">
              {institution.district || institution.state}, {institution.state} (
              {institution.region})
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <div className="text-slate-500">Linked FDR Instruments</div>
            <div className="font-mono font-bold text-slate-900 mt-1">
              {instFdrs.length} FDRs ·{' '}
              {formatINR(
                instFdrs.reduce((s, f) => s + (Number(f.principalAmount) || 0), 0)
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Nodal Contact Person (Principal / Registrar)
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Official Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Official Phone
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block font-medium text-slate-700 mb-1">
              Campus Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
          >
            Update Institutional Profile
          </button>
        </div>
      </form>
    </div>
  );
};

// 3. INSTITUTION FDR SUBMISSIONS (4-Step Wizard)
export const InstitutionFdrSubmissionsPage: React.FC = () => {
  return <NewFdrSubmissionWizardPage />;
};

// 4. INSTITUTION DOCUMENT UPLOADS
export const InstitutionDocumentUploadsPage: React.FC = () => {
  const { institution } = useActiveInstitutionRecords();
  return <DocumentManagementPage institutionOnlyId={institution?.institutionId} />;
};

// 5. INSTITUTION STATUS TRACKING
export const InstitutionStatusTrackingPage: React.FC = () => {
  const {
    institution,
    instFdrs,
    getRemainingDays,
    setSelectedFdrForDrawer,
    runBankVerificationSimulator,
  } = useActiveInstitutionRecords();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`FDR Status Tracking · ${institution?.name}`}
        title="Institutional FDR Status & Scrutiny Tracker"
        subtitle="Track verification states, bank confirmation outcomes, and remaining validity days. Click any row to open the 11-Section Detailed FDR Profile."
      />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">FDR ID & Number</th>
                <th className="py-3 px-4">Bank & Branch</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4 text-right">Remaining Days</th>
                <th className="py-3 px-4">AICTE Status</th>
                <th className="py-3 px-4">Bank Verification (Demo)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {instFdrs.map((fdr) => (
                <tr
                  key={fdr.fdrId}
                  onClick={() => setSelectedFdrForDrawer(fdr)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono">
                    <div className="font-semibold text-teal-700">{fdr.fdrNumber}</div>
                    <div className="text-[11px] text-slate-500">{fdr.fdrId}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{fdr.bankName}</div>
                    <div className="text-[11px] text-slate-500">
                      {fdr.branchName} ({fdr.ifscCode})
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    {formatINR(fdr.principalAmount)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {formatDateShort(fdr.maturityDate)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    {getRemainingDays(fdr.maturityDate)}d
                  </td>
                  <td className="py-3 px-4">
                    <SemanticStatusText status={fdr.adminStatus || fdr.status} />
                  </td>
                  <td className="py-3 px-4">
                    <SemanticStatusText
                      status={fdr.bankVerificationStatus || 'NOT VERIFIED'}
                    />
                  </td>
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedFdrForDrawer(fdr)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px]"
                      >
                        11-Sec Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => runBankVerificationSimulator(fdr.fdrId)}
                        className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[11px]"
                      >
                        Verify Bank
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 6. INSTITUTION RENEWAL SUBMISSIONS
export const InstitutionRenewalSubmissionsPage: React.FC = () => {
  const { instFdrs, instRenewals, submitRenewalOrReplacement } =
    useActiveInstitutionRecords();
  const [fdrId, setFdrId] = useState(instFdrs[0]?.fdrId || '');
  const [newFdrNum, setNewFdrNum] = useState('SBI-REN-2026-88412');
  const [newAmt, setNewAmt] = useState(4000000);
  const [newMaturity, setNewMaturity] = useState('2034-10-30');
  const [obs] = useState('Renewed for 8-year tenure with joint AICTE lien.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = instFdrs.find((f) => f.fdrId === fdrId) || instFdrs[0];
    if (!orig) return;
    await submitRenewalOrReplacement({
      originalFdrId: orig.fdrId,
      newFdrNumber: newFdrNum,
      bankName: orig.bankName,
      branchName: orig.branchName,
      ifscCode: orig.ifscCode,
      newAmount: Number(newAmt),
      newMaturityDate: newMaturity,
      requestType: 'Renewal',
      observations: obs,
      documentName: `${newFdrNum}_Renewal_Certificate.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Institutional Renewal Desk"
        title="Submit FDR Renewal & Track Lineage"
        subtitle="Submit renewed FDR details against maturing or matured instruments while preserving full historical lineage."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
      >
        <h3 className="text-sm font-bold text-slate-900">
          Submit Renewed FDR Instrument
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Original FDR to Renew
            </label>
            <select
              value={fdrId}
              onChange={(e) => setFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {instFdrs.map((f) => (
                <option key={f.fdrId} value={f.fdrId}>
                  {f.fdrNumber} ({formatINR(f.principalAmount)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              New Renewed FDR Number
            </label>
            <input
              type="text"
              required
              value={newFdrNum}
              onChange={(e) => setNewFdrNum(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Renewed Deposit Amount (INR)
            </label>
            <input
              type="number"
              required
              value={newAmt}
              onChange={(e) => setNewAmt(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              New Maturity Date
            </label>
            <input
              type="date"
              required
              value={newMaturity}
              onChange={(e) => setNewMaturity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
          >
            Submit Renewal Request to AICTE
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <th className="py-3 px-4">Renewal ID</th>
              <th className="py-3 px-4">Old FDR → New FDR</th>
              <th className="py-3 px-4 text-right">Renewed Amount</th>
              <th className="py-3 px-4">New Maturity</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {instRenewals.map((r) => (
              <tr key={r.renewalId}>
                <td className="py-3 px-4 font-mono">{r.renewalId}</td>
                <td className="py-3 px-4 font-mono">
                  {r.originalFdrNumber} →{' '}
                  <strong className="text-teal-700">{r.newFdrNumber}</strong>
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatINR(r.newAmount)}
                </td>
                <td className="py-3 px-4 font-mono">
                  {formatDateShort(r.newMaturityDate)}
                </td>
                <td className="py-3 px-4">
                  <SemanticStatusText status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 7. INSTITUTION REPLACEMENT FDRS
export const InstitutionReplacementFdrsPage: React.FC = () => {
  const { instFdrs, submitRenewalOrReplacement } = useActiveInstitutionRecords();
  const [fdrId, setFdrId] = useState(instFdrs[0]?.fdrId || '');
  const [newFdrNum, setNewFdrNum] = useState('BOB-REP-2026-55210');
  const [bankName, setBankName] = useState('Bank of Baroda');
  const [newAmt, setNewAmt] = useState(3500000);

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = instFdrs.find((f) => f.fdrId === fdrId) || instFdrs[0];
    if (!orig) return;
    await submitRenewalOrReplacement({
      originalFdrId: orig.fdrId,
      newFdrNumber: newFdrNum,
      bankName,
      branchName: 'Corporate Institutional Branch',
      ifscCode: 'BARB0CORP01',
      newAmount: Number(newAmt),
      newMaturityDate: '2034-11-15',
      requestType: 'Replacement',
      observations: 'Replacement FDR due to bank merger / instrument substitution.',
      documentName: `${newFdrNum}_Replacement_FDR.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Instrument Substitution"
        title="Replacement FDR Submissions"
        subtitle="Substitute an existing security deposit instrument with a new bank FDR while maintaining statutory lineage."
      />

      <form
        onSubmit={handleReplace}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Original FDR to Replace
            </label>
            <select
              value={fdrId}
              onChange={(e) => setFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {instFdrs.map((f) => (
                <option key={f.fdrId} value={f.fdrId}>
                  {f.fdrNumber} ({f.bankName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Replacement FDR Number
            </label>
            <input
              type="text"
              required
              value={newFdrNum}
              onChange={(e) => setNewFdrNum(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              New Issuing Bank
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Replacement Deposit Amount
            </label>
            <input
              type="number"
              required
              value={newAmt}
              onChange={(e) => setNewAmt(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
          >
            Submit Replacement FDR
          </button>
        </div>
      </form>
    </div>
  );
};

// 8. INSTITUTION RELEASE / REFUND REQUESTS
export const InstitutionReleaseRequestsPage: React.FC = () => {
  const { instFdrs, instReleases, submitReleaseRequest } =
    useActiveInstitutionRecords();
  const [fdrId, setFdrId] = useState(instFdrs[0]?.fdrId || '');
  const [reason, setReason] = useState(
    'Completion of 8-year statutory lock-in period with zero compliance dues.'
  );

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = instFdrs.find((f) => f.fdrId === fdrId) || instFdrs[0];
    if (!target) return;
    await submitReleaseRequest({
      fdrId: target.fdrId,
      reason,
      supportingDocument: `${target.fdrNumber}_Release_Request_Resolution.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 12 · Lien Discharge Request"
        title="FDR Release & Refund Requests"
        subtitle="Request AICTE No-Objection Certificate (NOC) and joint-lien discharge upon completion of lock-in tenure."
      />

      <form
        onSubmit={handleReleaseSubmit}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Select Eligible FDR
            </label>
            <select
              value={fdrId}
              onChange={(e) => setFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {instFdrs.map((f) => (
                <option key={f.fdrId} value={f.fdrId}>
                  {f.fdrNumber} — {formatINR(f.principalAmount)} ({f.status})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">
              Statutory Release Justification
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 text-white rounded-md font-medium"
          >
            Submit Release / Refund Application
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <th className="py-3 px-4">Request ID</th>
              <th className="py-3 px-4">FDR Number</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4">Current Workflow Stage</th>
              <th className="py-3 px-4">Justification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {instReleases.map((r) => (
              <tr key={r.requestId}>
                <td className="py-3 px-4 font-mono">{r.requestId}</td>
                <td className="py-3 px-4 font-mono font-semibold text-teal-700">
                  {r.fdrNumber}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatINR(r.depositAmount)}
                </td>
                <td className="py-3 px-4">
                  <SemanticStatusText status={r.stage} />
                </td>
                <td className="py-3 px-4 text-slate-600">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 9. INSTITUTION NOTIFICATIONS
export const InstitutionNotificationsPage: React.FC = () => {
  const { institution } = useActiveInstitutionRecords();
  return <AdminAlertsEscalationPage institutionOnlyId={institution?.institutionId} />;
};

// 10. INSTITUTION SUBMISSION HISTORY
export const InstitutionSubmissionHistoryPage: React.FC = () => {
  const { institution, auditLogs } = useActiveInstitutionRecords();
  const instLogs = auditLogs.filter(
    (l) =>
      l.targetId === institution?.institutionId ||
      l.summary.includes(institution?.name || '') ||
      l.actorRole === 'INSTITUTION_ADMIN'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Institutional Audit & Submission Ledger"
        title="Submission & Activity History"
        subtitle="Chronological log of all FDR submissions, document uploads, renewals, and AICTE officer actions."
      />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">State Transition</th>
              <th className="py-3 px-4">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {instLogs.map((l) => (
              <tr key={l.logId}>
                <td className="py-3 px-4 font-mono text-slate-500">
                  {formatDateShort(l.createdAt)}
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                  {l.action}
                </td>
                <td className="py-3 px-4">
                  {l.actorName || l.actorEmail} ({l.actorRole})
                </td>
                <td className="py-3 px-4 font-mono">
                  {l.previousValue || '—'} →{' '}
                  <strong className="text-emerald-700">
                    {l.newValue || 'UPDATED'}
                  </strong>
                </td>
                <td className="py-3 px-4 text-slate-700">{l.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
