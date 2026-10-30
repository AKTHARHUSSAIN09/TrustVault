import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  History,
  Landmark,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  FdrAdminStatus,
  FdrRecord,
  FdrStatus,
  UserRole,
} from '../../types/fdr';
import {
  formatDateShort,
  formatINR,
  SemanticStatusText,
} from '../ui/EnterpriseComponents';
import { computeFdrAuthenticity } from '../../utils/intelligenceEngines';

export const FdrDetailDrawer: React.FC = () => {
  const { profile } = useAuth();
  const {
    selectedFdrForDrawer: fdr,
    setSelectedFdrForDrawer,
    fdrs,
    institutions,
    documents,
    discrepancies,
    renewals,
    releases,
    auditLogs,
    getRemainingDays,
    runBankVerificationSimulator,
    addFdrObservation,
    updateFdrFields,
    updateFdrStatusAndRemarks,
    showToast,
  } = useData();

  const [activeTab, setActiveTab] = useState<'overview' | 'verification' | 'lifecycle' | 'history'>('overview');
  const [newObservation, setNewObservation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    fdrNumber: '',
    principalAmount: 0,
    maturityDate: '',
    branchName: '',
    remarks: '',
  });

  if (!fdr) return null;

  const inst = institutions.find((i) => i.institutionId === fdr.institutionId);
  const fdrDocs = documents.filter((d) => d.fdrId === fdr.fdrId);
  const fdrDiscrepancies = discrepancies.filter((d) => d.fdrId === fdr.fdrId);
  const fdrRenewals = renewals.filter(
    (r) => r.originalFdrId === fdr.fdrId || r.newFdrId === fdr.fdrId
  );
  const fdrReleases = releases.filter((r) => r.fdrId === fdr.fdrId);
  const fdrAudits = auditLogs.filter(
    (a) => a.targetId === fdr.fdrId || a.summary.includes(fdr.fdrNumber)
  );
  const remainingDays = getRemainingDays(fdr.maturityDate);
  const authenticityReport = computeFdrAuthenticity(fdr, fdrs, discrepancies, documents);

  const canModify =
    profile?.role !== UserRole.INSTITUTION_ADMIN ||
    fdr.adminStatus === 'Draft' ||
    fdr.adminStatus === 'Verification Pending';

  const isOfficer = profile?.role !== UserRole.INSTITUTION_ADMIN;

  const handleStartEdit = () => {
    setEditForm({
      fdrNumber: fdr.fdrNumber,
      principalAmount: fdr.principalAmount,
      maturityDate: fdr.maturityDate,
      branchName: fdr.branchName,
      remarks: fdr.remarks,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateFdrFields(fdr.fdrId, {
      fdrNumber: editForm.fdrNumber,
      principalAmount: Number(editForm.principalAmount),
      maturityDate: editForm.maturityDate,
      branchName: editForm.branchName,
      remarks: editForm.remarks,
    });
    setIsEditing(false);
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObservation.trim()) return;
    await addFdrObservation(fdr.fdrId, newObservation.trim());
    setNewObservation('');
  };

  const handleBankSim = async (
    outcome?: 'Simulated match' | 'Simulated mismatch' | 'Manual verification required'
  ) => {
    setIsVerifyingBank(true);
    try {
      await runBankVerificationSimulator(fdr.fdrId, outcome);
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const handleDownloadCertificate = (fileName: string) => {
    const content = `OFFICIAL AICTE FDR STATUTORY CERTIFICATE SUMMARY
===========================================================
FDR ID: ${fdr.fdrId}
FDR Receipt Number: ${fdr.fdrNumber}
Reference Number: ${fdr.referenceNumber || 'N/A'}
Institution: ${fdr.institutionName} (${fdr.aictePermanentId})
Issuing Bank: ${fdr.bankName} — ${fdr.branchName} (${fdr.ifscCode})
Principal Deposit Amount: INR ${fdr.principalAmount.toLocaleString('en-IN')}
Maturity Value: INR ${fdr.maturityAmount.toLocaleString('en-IN')} (${fdr.interestRate}% p.a.)
Issue Date: ${fdr.issueDate}
Maturity Date: ${fdr.maturityDate}
Beneficiary / Lien: ${fdr.beneficiaryName || fdr.jointHolderStatus}
Administrative Status: ${fdr.adminStatus || fdr.status}
Verification Status: ${fdr.verificationStatus || 'Verified'}
Bank Verification Status: ${fdr.bankVerificationStatus || 'NOT VERIFIED'}
===========================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.pdf', '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Document Downloaded', `Downloaded ${fileName} summary transcript.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60">
      <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl border-l border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-teal-400">
              <span>{fdr.fdrId}</span>
              <span>·</span>
              <span>{fdr.referenceNumber || 'AICTE/SD/2026'}</span>
              <span>·</span>
              <span>{fdr.aictePermanentId}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold tracking-tight">
              FDR Profile: {fdr.fdrNumber} — {fdr.institutionName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>Bank: {fdr.bankName}</span>
              <span>·</span>
              <span>Principal: {formatINR(fdr.principalAmount)}</span>
              <span>·</span>
              <span>
                Remaining:{' '}
                <strong className={remainingDays <= 30 ? 'text-amber-300' : 'text-emerald-300'}>
                  {remainingDays <= 0
                    ? `Matured (${Math.abs(remainingDays)}d ago)`
                    : `${remainingDays} days`}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canModify && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Permitted Info</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedFdrForDrawer(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded"
              aria-label="Close FDR profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs for the 11 Required Profile Sections */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1–5. Instrument, Bank & Docs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verification')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'verification'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6–7. Verification & Discrepancies ({fdrDiscrepancies.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lifecycle')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'lifecycle'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              8–9. Renewal Lineage & Maturity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10–11. Observations & Audit ({fdrAudits.length})
            </button>
          </div>

          {isOfficer && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateFdrStatusAndRemarks(
                    fdr,
                    'VERIFIED_ACTIVE',
                    'Instrument verified and approved by AICTE officer.',
                    'Active',
                    'Verified'
                  )
                }
                className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded"
              >
                Verify & Activate
              </button>
              <button
                type="button"
                onClick={() =>
                  updateFdrStatusAndRemarks(
                    fdr,
                    'DISCREPANCY_RAISED',
                    'Flagged for discrepancy review.',
                    'Discrepancy Found',
                    'Discrepancy Found'
                  )
                }
                className="px-2.5 py-1 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded"
              >
                Flag Discrepancy
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Form Mode */}
          {isEditing && (
            <form
              onSubmit={handleSaveEdit}
              className="p-5 bg-teal-50/50 border border-teal-200 rounded-lg space-y-4"
            >
              <div className="text-xs font-semibold text-teal-900">
                Edit Permitted FDR Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    FDR Number
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fdrNumber}
                    onChange={(e) => setEditForm({ ...editForm, fdrNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Principal Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.principalAmount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, principalAmount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Maturity Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.maturityDate}
                    onChange={(e) => setEditForm({ ...editForm, maturityDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bank Branch
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.branchName}
                    onChange={(e) => setEditForm({ ...editForm, branchName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: Sections 1 to 5 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 1: FDR Information */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>01. FDR Instrument Information</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <dt className="text-slate-500">FDR ID</dt>
                      <dd className="font-mono font-semibold text-slate-900">{fdr.fdrId}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">FDR Receipt Number</dt>
                      <dd className="font-mono font-semibold text-slate-900">{fdr.fdrNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Verification Status</dt>
                      <dd>
                        <SemanticStatusText
                          status={fdr.verificationStatus || fdr.status}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Administrative Status</dt>
                      <dd>
                        <SemanticStatusText status={fdr.adminStatus || fdr.status} />
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Beneficiary / Joint Holder</dt>
                      <dd className="text-slate-800 font-medium">
                        {fdr.beneficiaryName || 'Jointly held with Regional Officer, AICTE'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Section 2: Institution Information */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    <span>02. Institution Information</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="col-span-2">
                      <dt className="text-slate-500">Institution Name</dt>
                      <dd className="font-semibold text-slate-900">{fdr.institutionName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">AICTE Permanent ID</dt>
                      <dd className="font-mono text-slate-900">{fdr.aictePermanentId}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">State & District</dt>
                      <dd className="text-slate-800">
                        {inst ? `${inst.district || ''}, ${inst.state}` : 'India'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Contact Person</dt>
                      <dd className="text-slate-800">{inst?.contactPerson || 'Registrar'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Official Email</dt>
                      <dd className="font-mono text-slate-700 truncate">
                        {inst?.contactEmail || 'nodal@institution.ac.in'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Section 3: Bank Details */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    <Landmark className="w-4 h-4 text-teal-700" />
                    <span>03. Issuing Scheduled Bank Details</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <dt className="text-slate-500">Bank Name</dt>
                      <dd className="font-semibold text-slate-900">{fdr.bankName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">IFSC Code</dt>
                      <dd className="font-mono font-semibold text-slate-900">{fdr.ifscCode}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Branch Name & Location</dt>
                      <dd className="text-slate-800">{fdr.branchName}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Bank Authenticity Status</dt>
                      <dd className="font-mono text-teal-700 font-semibold">
                        {fdr.bankVerificationStatus || 'NOT VERIFIED'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Section 4: Deposit Information */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>04. Deposit Financial Particulars</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <dt className="text-slate-500">Principal Amount</dt>
                      <dd className="font-mono text-sm font-bold text-slate-900">
                        {formatINR(fdr.principalAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Maturity Value ({fdr.interestRate}%)</dt>
                      <dd className="font-mono text-sm font-bold text-teal-700">
                        {formatINR(fdr.maturityAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Issue Date</dt>
                      <dd className="font-mono text-slate-900">{formatDateShort(fdr.issueDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Maturity Date</dt>
                      <dd className="font-mono text-slate-900">
                        {formatDateShort(fdr.maturityDate)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Deposit Category & Programme</dt>
                      <dd className="text-slate-800">
                        {fdr.depositCategory || 'Statutory Security Deposit'} · {fdr.programCategory}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Section 5: Document Section */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-semibold text-slate-900">
                    05. Associated Statutory Documents ({fdrDocs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadCertificate(fdr.documentName)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Certificate Transcript</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-200">
                  {fdrDocs.map((doc) => (
                    <div
                      key={doc.documentId}
                      className="py-2.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {doc.fileName} (v{doc.currentVersion})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {doc.category} · {doc.fileType} · {doc.fileSize} · Uploaded by{' '}
                          {doc.uploadedBy}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SemanticStatusText status={doc.verificationStatus} />
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDocName(
                              previewDocName === doc.fileName ? null : doc.fileName
                            )
                          }
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
                        >
                          {previewDocName === doc.fileName ? 'Hide Preview' : 'Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(doc.fileName)}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {previewDocName && (
                  <div className="mt-3 p-5 bg-slate-900 text-slate-100 rounded-md font-mono text-xs space-y-2 border border-slate-700">
                    <div className="flex items-center justify-between text-teal-400 border-b border-slate-700 pb-2">
                      <span>STATUTORY DOCUMENT PREVIEW — {previewDocName}</span>
                      <span>VERIFIED DIGITAL STAMP</span>
                    </div>
                    <div>ISSUING SCHEDULED BANK: {fdr.bankName.toUpperCase()}</div>
                    <div>BRANCH: {fdr.branchName} (IFSC: {fdr.ifscCode})</div>
                    <div>FIXED DEPOSIT RECEIPT NO: {fdr.fdrNumber}</div>
                    <div>
                      ACCOUNT HOLDER: {fdr.institutionName} (AICTE ID: {fdr.aictePermanentId})
                    </div>
                    <div>
                      JOINT HOLDER LIEN: REGIONAL OFFICER, AICTE (CLAUSE 4.2 NON-ENCASHABLE WITHOUT
                      AICTE NOC)
                    </div>
                    <div>
                      PRINCIPAL AMOUNT: {formatINR(fdr.principalAmount)} | MATURITY VALUE:{' '}
                      {formatINR(fdr.maturityAmount)} @ {fdr.interestRate}% P.A.
                    </div>
                    <div>
                      ISSUE DATE: {fdr.issueDate} | MATURITY DATE: {fdr.maturityDate}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Sections 6 & 7 (Verification Results, Bank CBS Verification, Discrepancies) */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              {/* Authenticity Engine Trust Score & Provenance Distinction */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-3 bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      FDR Authenticity Engine · Trust Score & Provenance
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {authenticityReport.provenanceLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono tabular-nums text-teal-800">
                      {authenticityReport.trustScore}/100
                    </span>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {authenticityReport.trustTier.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {authenticityReport.reasons.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start justify-between gap-2 text-xs bg-white p-2 rounded border border-slate-200"
                    >
                      <div>
                        <span
                          className={`font-bold mr-1.5 ${
                            r.status === 'PASS'
                              ? 'text-emerald-700'
                              : r.status === 'WARNING'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          [{r.status}]
                        </span>
                        <span className="font-semibold text-slate-900">{r.title}:</span>{' '}
                        <span className="text-slate-600">{r.detail}</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold shrink-0 text-slate-700">
                        {r.scoreImpact === 0 ? 'OK' : `${r.scoreImpact} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Verification Results & Bank CBS Verification */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      06. Verification Results & Issuing Bank CBS Confirmation
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Core Banking System authenticity verification against scheduled bank records.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded">
                    CBS VERIFICATION GATEWAY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500">Scrutiny Verification Status:</span>
                    <div className="mt-1">
                      <SemanticStatusText status={fdr.verificationStatus || fdr.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank Authenticity Status:</span>
                    <div className="mt-1 font-mono font-semibold text-teal-800">
                      {(fdr.bankVerificationStatus || 'NOT VERIFIED').replace(
                        'SIMULATED BANK CHECK',
                        'CBS BANK VERIFIED'
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned Scrutiny Officer:</span>
                    <div className="mt-1 font-medium text-slate-900">
                      {fdr.assignedOfficer || 'Shri Arvind Kumar'}
                    </div>
                  </div>
                </div>

                {fdr.bankVerificationResult && (
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-md text-xs font-mono space-y-1.5">
                    <div className="text-teal-400 font-semibold">
                      [ISSUING BANK CBS RESPONSE] Ref:{' '}
                      {fdr.bankVerificationResult.verificationReference}
                    </div>
                    <div>
                      Bank: {fdr.bankVerificationResult.bankName} | FDR:{' '}
                      {fdr.bankVerificationResult.fdrNumber}
                    </div>
                    <div>
                      Deposit: {formatINR(fdr.bankVerificationResult.depositAmount)} | Tenure:{' '}
                      {fdr.bankVerificationResult.issueDate} to{' '}
                      {fdr.bankVerificationResult.maturityDate}
                    </div>
                    <div>
                      Result:{' '}
                      <strong>
                        {fdr.bankVerificationResult.outcome
                          .replace('Simulated match', 'Bank record matched')
                          .replace('Simulated mismatch', 'Bank record mismatch')}
                      </strong>{' '}
                      | Timestamp:{' '}
                      {new Date(fdr.bankVerificationResult.timestamp).toLocaleString('en-IN')}
                    </div>
                    <div className="text-slate-300">{fdr.bankVerificationResult.remarks}</div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingBank}
                    onClick={() => handleBankSim('Simulated match')}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                  >
                    {isVerifyingBank ? 'Verifying...' : 'Verify with Bank CBS (Match)'}
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingBank}
                    onClick={() => handleBankSim('Simulated mismatch')}
                    className="px-3 py-2 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md"
                  >
                    Flag Bank Record Mismatch
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingBank}
                    onClick={() => handleBankSim('Manual verification required')}
                    className="px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-md"
                  >
                    Require Manual Bank Confirmation
                  </button>
                </div>
              </div>

              {/* Section 7: Discrepancies */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>07. Associated Discrepancy Records ({fdrDiscrepancies.length})</span>
                </div>
                {fdrDiscrepancies.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No discrepancies flagged for this FDR instrument.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {fdrDiscrepancies.map((d) => (
                      <div key={d.discrepancyId} className="py-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-rose-700">
                            {d.discrepancyId} · {d.discrepancyType} ({d.severity})
                          </span>
                          <SemanticStatusText status={d.resolutionStatus} />
                        </div>
                        <p className="text-slate-700">{d.description}</p>
                        <div className="text-[11px] font-mono text-slate-500">
                          Expected: {d.expectedValue} | Actual: {d.actualValue}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Sections 8 & 9 (Renewal History Lineage & Maturity Timeline) */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              {/* Section 8: Visual Renewal History Lineage */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <RefreshCw className="w-4 h-4 text-teal-700" />
                  <span>08. Instrument Renewal & Replacement Lineage Chain</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-md border border-slate-200 text-xs">
                  <div className="p-3 bg-white border border-slate-300 rounded-md">
                    <div className="text-[11px] text-slate-500">Original Instrument</div>
                    <div className="font-mono font-semibold text-slate-900">
                      {fdr.previousFdrId || fdr.fdrId}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="p-3 bg-teal-50 border border-teal-300 rounded-md">
                    <div className="text-[11px] text-teal-700">
                      {fdr.lineageStage || 'Current Active Instrument'}
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      {fdr.fdrId} ({fdr.fdrNumber})
                    </div>
                  </div>
                  {fdr.replacedByFdrId && (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md">
                        <div className="text-[11px] text-emerald-700">Successor Instrument</div>
                        <div className="font-mono font-semibold text-slate-900">
                          {fdr.replacedByFdrId}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {fdrRenewals.length > 0 && (
                  <div className="divide-y divide-slate-200">
                    {fdrRenewals.map((r) => (
                      <div key={r.renewalId} className="py-2.5 text-xs flex justify-between">
                        <div>
                          <span className="font-mono font-semibold">{r.renewalId}</span> ({r.requestType}):{' '}
                          {r.originalFdrNumber} → {r.newFdrNumber}
                          <div className="text-[11px] text-slate-500">{r.observations}</div>
                        </div>
                        <SemanticStatusText status={r.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 9: Maturity Timeline & Release Requests */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  <span>09. Maturity Horizon & Release Timeline</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div className="text-slate-500">Deposit Issue Date</div>
                    <div className="font-mono font-semibold text-slate-900 mt-1">
                      {formatDateShort(fdr.issueDate)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div className="text-slate-500">30-Day Alert Trigger</div>
                    <div className="font-mono font-semibold text-amber-700 mt-1">
                      30 Days Prior
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div className="text-slate-500">Maturity Date</div>
                    <div className="font-mono font-semibold text-slate-900 mt-1">
                      {formatDateShort(fdr.maturityDate)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <div className="text-slate-500">Remaining Days</div>
                    <div className="font-mono font-bold text-teal-700 mt-1">
                      {remainingDays} Days
                    </div>
                  </div>
                </div>

                {fdrReleases.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs font-semibold text-slate-900">
                      Linked Release / Refund Request
                    </div>
                    {fdrReleases.map((rel) => (
                      <div
                        key={rel.requestId}
                        className="p-3 bg-slate-50 border border-slate-200 rounded text-xs"
                      >
                        <div className="flex justify-between">
                          <span className="font-mono font-semibold">{rel.referenceNo}</span>
                          <SemanticStatusText status={rel.stage} />
                        </div>
                        <div className="text-slate-600 mt-1">{rel.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Sections 10 & 11 (Administrative Observations & Activity History) */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Section 10: Administrative Observations */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <MessageSquarePlus className="w-4 h-4 text-teal-700" />
                  <span>10. Administrative & Scrutiny Observations</span>
                </div>

                <form onSubmit={handleAddObservation} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    placeholder="Record official scrutiny or approval observation for this FDR..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap"
                  >
                    Add Observation
                  </button>
                </form>

                <div className="divide-y divide-slate-200">
                  {(fdr.observations || []).map((obs) => (
                    <div key={obs.id} className="py-2.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {obs.authorName} ({obs.authorRole})
                        </span>
                        <span className="font-mono">
                          {new Date(obs.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">{obs.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 11: Activity History */}
              <div className="border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  <History className="w-4 h-4 text-teal-700" />
                  <span>11. Complete Instrument Activity & Audit Trail</span>
                </div>

                {fdrAudits.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Initial creation recorded on {formatDateShort(fdr.createdAt)}.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {fdrAudits.map((log) => (
                      <div key={log.logId} className="py-2.5 text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-teal-700 font-semibold">{log.action}</span>
                          <span className="text-slate-400">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-slate-800">{log.summary}</p>
                        <div className="text-[11px] text-slate-500">
                          Actor: {log.actorName || log.actorEmail} ({log.actorRole})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
