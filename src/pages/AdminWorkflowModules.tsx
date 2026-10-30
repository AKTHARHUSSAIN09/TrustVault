import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  DiscrepancyRecord,
  DiscrepancyResolutionStatus,
  DiscrepancySeverity,
  DiscrepancyType,
  ExtractedFdrAssist,
  ReleaseRefundRequest,
  ReleaseWorkflowStage,
  RenewalRecord,
} from '../types/fdr';
import {
  FilterBar,
  ModalDialog,
  PageHeader,
  SemanticStatusText,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';

const ALL_DISCREPANCY_TYPES: DiscrepancyType[] = [
  'Amount mismatch',
  'FDR number mismatch',
  'Bank mismatch',
  'Maturity date mismatch',
  'Missing information',
  'Duplicate instrument',
  'Document unreadable',
  'Potential document anomaly',
];

const ALL_DISCREPANCY_STATUSES: DiscrepancyResolutionStatus[] = [
  'Open',
  'Under Investigation',
  'Clarification Requested',
  'Resolved',
  'Submission Rejected',
];

// ============================================================================
// 1. SECTIONS 7 & 8 — DOCUMENT INTELLIGENCE & BANK VERIFICATION SIMULATOR
// ============================================================================
export const AdminVerificationPage: React.FC = () => {
  const {
    fdrs,
    updateFdrFields,
    updateFdrStatusAndRemarks,
    createDiscrepancyRecord,
    runBankVerificationSimulator,
    setSelectedFdrForDrawer,
    showToast,
  } = useData();

  const [selectedFdrId, setSelectedFdrId] = useState<string>(
    fdrs[0]?.fdrId || 'FDR-2001'
  );
  const [certificateText, setCertificateText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'GEMINI_API' | 'SIMULATED_DEMO'>(
    'GEMINI_API'
  );
  const [isSimulatingBank, setIsSimulatingBank] = useState(false);
  const [officerNotes, setOfficerNotes] = useState('');

  const activeFdr = useMemo(
    () => fdrs.find((f) => f.fdrId === selectedFdrId) || fdrs[0],
    [fdrs, selectedFdrId]
  );

  const loadSampleCertificateText = (introduceMismatch = false) => {
    if (!activeFdr) return;
    const sampleAmount = introduceMismatch
      ? activeFdr.principalAmount - 500000
      : activeFdr.principalAmount;
    const sampleBeneficiary = introduceMismatch
      ? `${activeFdr.institutionName} Only (Missing AICTE Joint Clause)`
      : activeFdr.beneficiaryName ||
        `Jointly held by ${activeFdr.institutionName} & Regional Officer, AICTE`;

    setCertificateText(
      [
        `ISSUING BANK: ${activeFdr.bankName}`,
        `BRANCH OFFICE: ${activeFdr.branchName} (IFSC: ${activeFdr.ifscCode})`,
        `FIXED DEPOSIT RECEIPT NO: ${activeFdr.fdrNumber}`,
        `INSTITUTION: ${activeFdr.institutionName} (${activeFdr.aictePermanentId})`,
        `PRINCIPAL DEPOSIT AMOUNT: INR ${sampleAmount}`,
        `RATE OF INTEREST: ${activeFdr.interestRate}% per annum`,
        `DATE OF ISSUE: ${activeFdr.issueDate}`,
        `DATE OF MATURITY: ${activeFdr.maturityDate}`,
        `BENEFICIARY / JOINT HOLDER CLAUSE: ${sampleBeneficiary}`,
      ].join('\n')
    );
  };

  const handleRunExtraction = async (forceSimulated = false) => {
    if (!activeFdr) return;
    setIsExtracting(true);
    const textToAnalyze =
      certificateText.trim() ||
      `BANK: ${activeFdr.bankName}\nBRANCH: ${activeFdr.branchName}\nIFSC: ${activeFdr.ifscCode}\nFDR NO: ${activeFdr.fdrNumber}\nAMOUNT: ${activeFdr.principalAmount}\nRATE: ${activeFdr.interestRate}%\nISSUE DATE: ${activeFdr.issueDate}\nMATURITY DATE: ${activeFdr.maturityDate}\nBENEFICIARY: ${
        activeFdr.beneficiaryName || 'Jointly held with Regional Officer, AICTE'
      }`;

    try {
      if (!forceSimulated) {
        const resp = await fetch('/api/gemini/extract-fdr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ certificateText: textToAnalyze }),
        });

        if (resp.ok) {
          const json = await resp.json();
          const data = json.extracted as Partial<ExtractedFdrAssist>;
          const mapped: ExtractedFdrAssist = {
            fdrNumber: data.fdrNumber || activeFdr.fdrNumber,
            bankName: data.bankName || activeFdr.bankName,
            branchName: data.branchName || activeFdr.branchName,
            ifscCode: data.ifscCode || activeFdr.ifscCode,
            principalAmount: Number(data.principalAmount) || activeFdr.principalAmount,
            maturityAmount: Number(data.maturityAmount) || activeFdr.maturityAmount,
            interestRate: Number(data.interestRate) || activeFdr.interestRate,
            issueDate: data.issueDate || activeFdr.issueDate,
            maturityDate: data.maturityDate || activeFdr.maturityDate,
            institutionName: data.institutionName || activeFdr.institutionName,
            aictePermanentId: data.aictePermanentId || activeFdr.aictePermanentId,
            beneficiaryName:
              data.beneficiaryName ||
              activeFdr.beneficiaryName ||
              'Jointly held with Regional Officer, AICTE',
            jointHolderStatus: data.jointHolderStatus || 'JOINT_WITH_AICTE',
            extractionSummary:
              data.extractionSummary || 'Extracted via Gemini 3.8 Flash API',
            source: 'GEMINI_API',
            confidence: data.confidence || 96,
          };
          setExtractionMode('GEMINI_API');
          await updateFdrFields(activeFdr.fdrId, { extractedData: mapped });
          showToast(
            'Gemini AI Extraction Complete',
            `Extracted 9 fields for ${activeFdr.fdrNumber} (${mapped.confidence}% confidence).`,
            'success'
          );
          setIsExtracting(false);
          return;
        }
      }

      // Clearly Labelled Simulated Extraction Fallback
      setExtractionMode('SIMULATED_DEMO');
      const hasMismatchInText = textToAnalyze.includes('Missing AICTE Joint Clause');
      const simulatedExtracted: ExtractedFdrAssist = {
        fdrNumber: activeFdr.fdrNumber,
        bankName: activeFdr.bankName,
        branchName: activeFdr.branchName,
        ifscCode: activeFdr.ifscCode,
        principalAmount: hasMismatchInText
          ? activeFdr.principalAmount - 500000
          : activeFdr.principalAmount,
        maturityAmount: activeFdr.maturityAmount,
        interestRate: activeFdr.interestRate,
        issueDate: activeFdr.issueDate,
        maturityDate: activeFdr.maturityDate,
        institutionName: activeFdr.institutionName,
        aictePermanentId: activeFdr.aictePermanentId,
        beneficiaryName: hasMismatchInText
          ? `${activeFdr.institutionName} Only (Single Holder)`
          : activeFdr.beneficiaryName ||
            `Jointly held by Principal & Regional Officer, AICTE`,
        jointHolderStatus: hasMismatchInText ? 'SOLE_INSTITUTION' : 'JOINT_WITH_AICTE',
        extractionSummary: hasMismatchInText
          ? 'Simulated OCR detected deposit amount & joint-holder mismatch.'
          : 'All 9 statutory fields match the submitted instrument.',
        source: 'SIMULATED_DEMO',
        confidence: hasMismatchInText ? 76 : 98,
      };
      await updateFdrFields(activeFdr.fdrId, { extractedData: simulatedExtracted });
      showToast(
        'Simulated Document Extraction Complete (DEMO)',
        `Populated side-by-side comparison for ${activeFdr.fdrNumber}.`,
        hasMismatchInText ? 'warning' : 'info'
      );
    } catch {
      // Fallback handled
    } finally {
      setIsExtracting(false);
    }
  };

  if (!activeFdr) return null;

  const extracted: ExtractedFdrAssist = activeFdr.extractedData || {
    fdrNumber: activeFdr.fdrNumber,
    bankName: activeFdr.bankName,
    branchName: activeFdr.branchName,
    ifscCode: activeFdr.ifscCode,
    principalAmount: activeFdr.principalAmount,
    maturityAmount: activeFdr.maturityAmount,
    interestRate: activeFdr.interestRate,
    issueDate: activeFdr.issueDate,
    maturityDate: activeFdr.maturityDate,
    institutionName: activeFdr.institutionName,
    aictePermanentId: activeFdr.aictePermanentId,
    beneficiaryName:
      activeFdr.beneficiaryName ||
      'Jointly held by Principal & Regional Officer, AICTE',
    jointHolderStatus: activeFdr.jointHolderStatus,
    extractionSummary: 'Extracted from uploaded FDR certificate.',
    source: 'SIMULATED_DEMO',
    confidence: 95,
  };

  const comparisonRows = [
    {
      label: '01. FDR Number',
      submitted: activeFdr.fdrNumber,
      extractedVal: extracted.fdrNumber,
      status:
        activeFdr.fdrNumber.trim().toLowerCase() ===
        (extracted.fdrNumber || '').trim().toLowerCase()
          ? 'MATCH'
          : 'MISMATCH',
    },
    {
      label: '02. Issuing Bank Name',
      submitted: activeFdr.bankName,
      extractedVal: extracted.bankName,
      status:
        activeFdr.bankName.trim().toLowerCase() ===
        (extracted.bankName || '').trim().toLowerCase()
          ? 'MATCH'
          : 'MISMATCH',
    },
    {
      label: '03. Branch Name',
      submitted: activeFdr.branchName,
      extractedVal: extracted.branchName || activeFdr.branchName,
      status:
        activeFdr.branchName.trim().toLowerCase() ===
        (extracted.branchName || activeFdr.branchName).trim().toLowerCase()
          ? 'MATCH'
          : 'UNCERTAIN',
    },
    {
      label: '04. IFSC Code',
      submitted: activeFdr.ifscCode,
      extractedVal: extracted.ifscCode || activeFdr.ifscCode,
      status:
        activeFdr.ifscCode.trim().toUpperCase() ===
        (extracted.ifscCode || activeFdr.ifscCode).trim().toUpperCase()
          ? 'MATCH'
          : 'MISMATCH',
    },
    {
      label: '05. Deposit Amount (INR)',
      submitted: formatINR(activeFdr.principalAmount),
      extractedVal: formatINR(extracted.principalAmount),
      status:
        Number(activeFdr.principalAmount) === Number(extracted.principalAmount)
          ? 'MATCH'
          : 'MISMATCH',
    },
    {
      label: '06. Issue Date',
      submitted: activeFdr.issueDate,
      extractedVal: extracted.issueDate,
      status: activeFdr.issueDate === extracted.issueDate ? 'MATCH' : 'MISMATCH',
    },
    {
      label: '07. Maturity Date',
      submitted: activeFdr.maturityDate,
      extractedVal: extracted.maturityDate,
      status: activeFdr.maturityDate === extracted.maturityDate ? 'MATCH' : 'MISMATCH',
    },
    {
      label: '08. Beneficiary / Joint Holder',
      submitted:
        activeFdr.beneficiaryName ||
        'Jointly held by Principal & Regional Officer, AICTE',
      extractedVal:
        extracted.beneficiaryName ||
        (extracted.jointHolderStatus === 'JOINT_WITH_AICTE'
          ? 'Jointly held by Principal & Regional Officer, AICTE'
          : 'Single Holder / Missing AICTE Lien'),
      status: extracted.jointHolderStatus === 'JOINT_WITH_AICTE' ? 'MATCH' : 'MISMATCH',
    },
    {
      label: '09. Interest Rate (% p.a.)',
      submitted: `${activeFdr.interestRate}%`,
      extractedVal: `${extracted.interestRate}%`,
      status:
        Number(activeFdr.interestRate) === Number(extracted.interestRate)
          ? 'MATCH'
          : 'UNCERTAIN',
    },
  ];

  const mismatchCount = comparisonRows.filter((r) => r.status === 'MISMATCH').length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sections 7 & 8 · AI Document Intelligence & Bank Verification Simulator"
        title="FDR Verification & Side-by-Side Scrutiny Desk"
        subtitle="Compare institution-submitted metadata against Gemini-extracted document fields with color-coded match indicators and simulated bank confirmation checks."
        primaryActionLabel="Open 11-Section FDR Drawer"
        onPrimaryAction={() => setSelectedFdrForDrawer(activeFdr)}
      />

      {/* Instrument Selector & Mode Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select FDR Instrument for Scrutiny ({fdrs.length} Total)
          </label>
          <select
            value={selectedFdrId}
            onChange={(e) => setSelectedFdrId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md font-medium text-slate-900"
          >
            {fdrs.map((f) => (
              <option key={f.fdrId} value={f.fdrId}>
                {f.fdrId} · {f.fdrNumber} — {f.institutionName} (
                {formatINR(f.principalAmount)} · {f.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-teal-50 text-teal-800 border border-teal-200 rounded">
            Mode:{' '}
            {extracted.source === 'GEMINI_API' || extractionMode === 'GEMINI_API'
              ? 'LIVE GEMINI AI API'
              : 'SIMULATED EXTRACTION (DEMO)'}
          </span>
          <button
            type="button"
            onClick={() => loadSampleCertificateText(false)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded"
          >
            Load Matching OCR Text
          </button>
          <button
            type="button"
            onClick={() => loadSampleCertificateText(true)}
            className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded"
          >
            Load Mismatched OCR Text (Demo)
          </button>
          <button
            type="button"
            disabled={isExtracting}
            onClick={() => handleRunExtraction(false)}
            className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{isExtracting ? 'Extracting Fields...' : 'Run Gemini AI Extraction'}</span>
          </button>
          <button
            type="button"
            disabled={isExtracting}
            onClick={() => handleRunExtraction(true)}
            className="px-3 py-1.5 text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white rounded"
          >
            Simulated Extract (Demo)
          </button>
        </div>
      </div>

      {certificateText && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Bank Certificate Text Payload for Gemini Extraction
            </span>
            <button
              type="button"
              onClick={() => setCertificateText('')}
              className="text-slate-500 hover:text-slate-800"
            >
              Hide Text Box
            </button>
          </div>
          <textarea
            rows={4}
            value={certificateText}
            onChange={(e) => setCertificateText(e.target.value)}
            className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md"
          />
        </div>
      )}

      {/* 2-Panel Side-by-Side Comparison View (Section 7) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">
              Side-by-Side Verification: Panel 1 (Institution-Submitted) vs Panel 2 (Document-Extracted)
            </h2>
            <p className="text-[11px] text-slate-300">
              Green = Exact Match · Red = Field Mismatch Detected · Amber = Uncertain / Needs Review
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-teal-300">
              AI Confidence: {extracted.confidence || 96}%
            </span>
            <span
              className={
                mismatchCount === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
              }
            >
              {mismatchCount === 0
                ? '9/9 Fields Matched'
                : `${mismatchCount} Mismatch(es) Flagged`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Statutory Field</th>
                <th className="py-3 px-4">Panel 1 · Institution-Submitted FDR Details</th>
                <th className="py-3 px-4">Panel 2 · Document-Extracted Details</th>
                <th className="py-3 px-4 text-right">Comparison Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {comparisonRows.map((row) => {
                const rowBg =
                  row.status === 'MATCH'
                    ? 'bg-emerald-50/40'
                    : row.status === 'MISMATCH'
                    ? 'bg-rose-50/70'
                    : 'bg-amber-50/60';
                return (
                  <tr key={row.label} className={rowBg}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.label}</td>
                    <td className="py-3 px-4 font-mono text-slate-900">{row.submitted}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {row.extractedVal}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {row.status === 'MATCH' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>MATCHED</span>
                        </span>
                      ) : row.status === 'MISMATCH' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>MISMATCH</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>UNCERTAIN</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 8: Bank Verification Simulator & Officer Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-[11px] font-mono font-semibold text-teal-700 uppercase">
                Section 8 · Clearly Labelled Demo Bank Simulator
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Verify with Bank (Demo CBS Confirmation)
              </h3>
            </div>
            <SemanticStatusText
              status={activeFdr.bankVerificationStatus || 'NOT VERIFIED'}
            />
          </div>

          <p className="text-xs text-slate-600">
            Bank Verification Status is tracked independently from AICTE Scrutiny Status. Click any outcome below to simulate a bank response for{' '}
            <span className="font-mono font-semibold text-slate-900">
              {activeFdr.fdrNumber}
            </span>
            :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <button
              type="button"
              disabled={isSimulatingBank}
              onClick={async () => {
                setIsSimulatingBank(true);
                await runBankVerificationSimulator(activeFdr.fdrId, 'Simulated match');
                setIsSimulatingBank(false);
              }}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-left flex items-center justify-between"
            >
              <span>1. Verify with Bank (Simulated Match)</span>
              <ShieldCheck className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              disabled={isSimulatingBank}
              onClick={async () => {
                setIsSimulatingBank(true);
                await runBankVerificationSimulator(
                  activeFdr.fdrId,
                  'Simulated mismatch'
                );
                setIsSimulatingBank(false);
              }}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded font-medium text-left"
            >
              2. Simulate Bank Mismatch
            </button>
            <button
              type="button"
              disabled={isSimulatingBank}
              onClick={async () => {
                setIsSimulatingBank(true);
                await runBankVerificationSimulator(activeFdr.fdrId, 'Unable to verify');
                setIsSimulatingBank(false);
              }}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-medium text-left"
            >
              3. Simulate Unable to Verify
            </button>
            <button
              type="button"
              disabled={isSimulatingBank}
              onClick={async () => {
                setIsSimulatingBank(true);
                await runBankVerificationSimulator(
                  activeFdr.fdrId,
                  'Manual verification required'
                );
                setIsSimulatingBank(false);
              }}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-medium text-left"
            >
              4. Manual Verification Required
            </button>
          </div>

          {activeFdr.bankVerificationResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                Latest Bank Verification Result (DEMO):
              </div>
              <div className="font-mono text-teal-700">
                Ref: {activeFdr.bankVerificationResult.verificationReference} ·{' '}
                {activeFdr.bankVerificationResult.outcome}
              </div>
              <div className="text-slate-600">
                {activeFdr.bankVerificationResult.remarks}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono font-semibold text-slate-500 uppercase">
                Section 7 · Scrutiny Officer Decision Controls
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Record Official Verification Outcome
              </h3>
            </div>
            <SemanticStatusText status={activeFdr.adminStatus || activeFdr.status} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Scrutiny Officer Remarks / Verification Notes
            </label>
            <textarea
              rows={2}
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              placeholder="Enter statutory verification notes or discrepancy observations..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                updateFdrStatusAndRemarks(
                  activeFdr,
                  'VERIFIED_ACTIVE',
                  officerNotes || 'Confirmed matching details across all 9 fields.',
                  'Active',
                  'Verified'
                )
              }
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
            >
              Confirm Matching Details
            </button>
            <button
              type="button"
              onClick={() =>
                updateFdrStatusAndRemarks(
                  activeFdr,
                  'UNDER_SCRUTINY',
                  officerNotes || 'Marked as reviewed by Scrutiny Officer.',
                  'Under Review',
                  'Under Scrutiny'
                )
              }
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium"
            >
              Mark as Reviewed
            </button>
            <button
              type="button"
              onClick={async () => {
                await createDiscrepancyRecord({
                  fdrId: activeFdr.fdrId,
                  fdrNumber: activeFdr.fdrNumber,
                  institutionId: activeFdr.institutionId,
                  institutionName: activeFdr.institutionName,
                  discrepancyType: 'Amount mismatch',
                  severity: 'High',
                  assignedOfficer: 'Shri Arvind Kumar (Scrutiny Officer)',
                  description:
                    officerNotes ||
                    'Discrepancy flagged during side-by-side document intelligence scrutiny.',
                });
              }}
              className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium"
            >
              Flag Discrepancy
            </button>
            <button
              type="button"
              onClick={() =>
                updateFdrStatusAndRemarks(
                  activeFdr,
                  'UNDER_SCRUTINY',
                  officerNotes || 'Clarification requested from institution nodal officer.',
                  'Verification Pending',
                  'Verification Pending'
                )
              }
              className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium"
            >
              Request Clarification
            </button>
            <button
              type="button"
              onClick={() =>
                updateFdrStatusAndRemarks(
                  activeFdr,
                  'UNDER_SCRUTINY',
                  officerNotes || 'Forwarded to Senior Approving Officer for further scrutiny.',
                  'Under Review',
                  'Forwarded to Senior Officer'
                )
              }
              className="p-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded font-medium"
            >
              Forward for Scrutiny
            </button>
            <button
              type="button"
              onClick={() =>
                updateFdrStatusAndRemarks(
                  activeFdr,
                  'VERIFIED_ACTIVE',
                  officerNotes || 'Manual physical FDR verification recorded.',
                  'Verified',
                  'Verified'
                )
              }
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded font-medium"
            >
              Record Manual Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SECTION 9 — DISCREPANCY MANAGEMENT CENTRE
// ============================================================================
export const AdminDiscrepanciesPage: React.FC = () => {
  const {
    discrepancies,
    fdrs,
    createDiscrepancyRecord,
    updateDiscrepancyStatus,
    simulateSampleDiscrepancy,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedDisc, setSelectedDisc] = useState<DiscrepancyRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [assignedOfficerInput, setAssignedOfficerInput] = useState(
    'Shri Arvind Kumar (Scrutiny Officer)'
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newDiscFdrId, setNewDiscFdrId] = useState(fdrs[0]?.fdrId || 'FDR-2001');
  const [newDiscType, setNewDiscType] = useState<DiscrepancyType>('Amount mismatch');
  const [newDiscSeverity, setNewDiscSeverity] = useState<DiscrepancySeverity>('High');
  const [newDiscDesc, setNewDiscDesc] = useState('');

  const filteredDiscrepancies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return discrepancies.filter((d) => {
      if (severityFilter !== 'ALL' && d.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && d.resolutionStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        d.discrepancyId.toLowerCase().includes(q) ||
        d.fdrNumber.toLowerCase().includes(q) ||
        d.institutionName.toLowerCase().includes(q) ||
        d.discrepancyType.toLowerCase().includes(q) ||
        d.assignedOfficer.toLowerCase().includes(q)
      );
    });
  }, [discrepancies, searchQuery, severityFilter, statusFilter]);

  const handleCreateDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFdr = fdrs.find((f) => f.fdrId === newDiscFdrId) || fdrs[0];
    if (!targetFdr) return;
    await createDiscrepancyRecord({
      fdrId: targetFdr.fdrId,
      fdrNumber: targetFdr.fdrNumber,
      institutionId: targetFdr.institutionId,
      institutionName: targetFdr.institutionName,
      discrepancyType: newDiscType,
      severity: newDiscSeverity,
      assignedOfficer: assignedOfficerInput,
      description:
        newDiscDesc ||
        `${newDiscType} identified during scrutiny of ${targetFdr.fdrNumber}.`,
    });
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 9 · Statutory Exception & Compliance Desk"
        title="Discrepancy Management Centre"
        subtitle="Track, investigate, and resolve all 8 statutory discrepancy types across severity levels with automated FDR status synchronization."
        primaryActionLabel="Log New Discrepancy"
        onPrimaryAction={() => setCreateModalOpen(true)}
        secondaryActionLabel="Simulate Sample Discrepancy"
        onSecondaryAction={() => simulateSampleDiscrepancy()}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by Discrepancy ID, FDR Number, Institution, Type, or Officer..."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="ALL">All Resolution States</option>
              {ALL_DISCREPANCY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">Discrepancy ID</th>
                <th className="py-3 px-3.5">FDR Number</th>
                <th className="py-3 px-3.5">Institution</th>
                <th className="py-3 px-3.5">Discrepancy Type</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Assigned Officer</th>
                <th className="py-3 px-3.5">Resolution Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDiscrepancies.map((disc) => (
                <tr key={disc.discrepancyId} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono text-slate-500">
                    {disc.discrepancyId}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-semibold text-teal-700">
                    {disc.fdrNumber}
                  </td>
                  <td className="py-3 px-3.5 font-medium text-slate-900 max-w-[200px] truncate">
                    {disc.institutionName}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-slate-800">
                    {disc.discrepancyType}
                  </td>
                  <td className="py-3 px-3.5">
                    <SemanticStatusText status={disc.severity} />
                  </td>
                  <td className="py-3 px-3.5 text-slate-600">{disc.assignedOfficer}</td>
                  <td className="py-3 px-3.5">
                    <SemanticStatusText status={disc.resolutionStatus} />
                  </td>
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDisc(disc);
                        setAssignedOfficerInput(disc.assignedOfficer);
                        setActionNotes('');
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                    >
                      Manage & Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage & Resolve Discrepancy Modal */}
      {selectedDisc && (
        <ModalDialog
          isOpen={Boolean(selectedDisc)}
          onClose={() => setSelectedDisc(null)}
          title={`Discrepancy Case ${selectedDisc.discrepancyId} · ${selectedDisc.fdrNumber}`}
          subtitle={`${selectedDisc.discrepancyType} · ${selectedDisc.institutionName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
              <div className="font-semibold text-slate-900">Observation Summary:</div>
              <div className="text-slate-700">{selectedDisc.description}</div>
              {(selectedDisc.expectedValue || selectedDisc.actualValue) && (
                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                    Expected: {selectedDisc.expectedValue || 'Standard Norm'}
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                    Actual: {selectedDisc.actualValue || 'Mismatch'}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Assign / Reassign Scrutiny Officer
                </label>
                <input
                  type="text"
                  value={assignedOfficerInput}
                  onChange={(e) => setAssignedOfficerInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Current Status
                </label>
                <div className="py-1.5">
                  <SemanticStatusText status={selectedDisc.resolutionStatus} />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Officer Investigation Observations / Resolution Remarks
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Record clarification request, investigation findings, or resolution proof..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateDiscrepancyStatus(
                    selectedDisc.discrepancyId,
                    'Clarification Requested',
                    actionNotes || 'Clarification requested from institution.',
                    assignedOfficerInput
                  );
                  setSelectedDisc(null);
                }}
                className="p-2 bg-amber-600 text-white rounded font-medium"
              >
                Request Clarification
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateDiscrepancyStatus(
                    selectedDisc.discrepancyId,
                    'Under Investigation',
                    actionNotes || 'Marked under formal scrutiny investigation.',
                    assignedOfficerInput
                  );
                  setSelectedDisc(null);
                }}
                className="p-2 bg-teal-700 text-white rounded font-medium"
              >
                Under Investigation
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateDiscrepancyStatus(
                    selectedDisc.discrepancyId,
                    'Resolved',
                    actionNotes || 'Discrepancy resolved and linked FDR verified.',
                    assignedOfficerInput
                  );
                  setSelectedDisc(null);
                }}
                className="p-2 bg-emerald-600 text-white rounded font-medium"
              >
                Resolve Discrepancy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateDiscrepancyStatus(
                    selectedDisc.discrepancyId,
                    'Submission Rejected',
                    actionNotes || 'Submission rejected due to unresolved discrepancy.',
                    assignedOfficerInput
                  );
                  setSelectedDisc(null);
                }}
                className="p-2 bg-rose-600 text-white rounded font-medium"
              >
                Reject Submission
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="font-semibold text-slate-900">
                Discrepancy Resolution History ({selectedDisc.history.length})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {selectedDisc.history.map((h) => (
                  <div key={h.id} className="p-2.5 text-[11px]">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{h.action}</span>
                      <span className="font-mono text-slate-400">
                        {formatDateShort(h.timestamp)}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{h.remarks}</div>
                    <div className="text-slate-400">
                      By {h.actor} ({h.role})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Create Discrepancy Modal */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Log Statutory Discrepancy"
        subtitle="Creates a discrepancy record and updates the linked FDR status automatically."
      >
        <form onSubmit={handleCreateDiscrepancy} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Target FDR</label>
            <select
              value={newDiscFdrId}
              onChange={(e) => setNewDiscFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {fdrs.map((f) => (
                <option key={f.fdrId} value={f.fdrId}>
                  {f.fdrNumber} — {f.institutionName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Discrepancy Type (8 Categories)
              </label>
              <select
                value={newDiscType}
                onChange={(e) => setNewDiscType(e.target.value as DiscrepancyType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {ALL_DISCREPANCY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Severity</label>
              <select
                value={newDiscSeverity}
                onChange={(e) =>
                  setNewDiscSeverity(e.target.value as DiscrepancySeverity)
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Observation Description
            </label>
            <textarea
              rows={3}
              required
              value={newDiscDesc}
              onChange={(e) => setNewDiscDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded-md font-medium"
            >
              Flag Discrepancy
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 3. SECTION 10 — MATURITY & VALIDITY MONITORING MODULE
// ============================================================================
export const AdminMaturityMonitoringPage: React.FC = () => {
  const {
    fdrs,
    renewals,
    systemConfig,
    simulatedToday,
    setSimulatedToday,
    getRemainingDays,
    triggerMaturityReminders,
    setSelectedFdrForDrawer,
  } = useData();

  const [activeBucket, setActiveBucket] = useState<
    | 'ALL_URGENT'
    | '30D'
    | '15D'
    | '7D'
    | 'MATURED'
    | 'OVERDUE_RENEWAL'
    | 'RENEWAL_PENDING'
  >('ALL_URGENT');

  const lead30 = systemConfig.maturityAlertWindowDays || 30;
  const lead15 = systemConfig.reminderInterval15Days || 15;
  const lead7 = systemConfig.reminderInterval7Days || 7;

  const shiftSimulatedDate = (daysToAdd: number) => {
    const base = new Date(simulatedToday);
    base.setDate(base.getDate() + daysToAdd);
    setSimulatedToday(base.toISOString().slice(0, 10));
  };

  const buckets = useMemo(() => {
    const exp30 = fdrs.filter((f) => {
      const d = getRemainingDays(f.maturityDate);
      return d > 0 && d <= lead30;
    });
    const exp15 = fdrs.filter((f) => {
      const d = getRemainingDays(f.maturityDate);
      return d > 0 && d <= lead15;
    });
    const exp7 = fdrs.filter((f) => {
      const d = getRemainingDays(f.maturityDate);
      return d > 0 && d <= lead7;
    });
    const matured = fdrs.filter(
      (f) => getRemainingDays(f.maturityDate) <= 0 || f.status === 'MATURED'
    );
    const pendingRenewalFdrIds = new Set(
      renewals
        .filter((r) => r.status === 'Submitted' || r.status === 'Under Scrutiny')
        .map((r) => r.originalFdrId)
    );
    const overdueRenewal = matured.filter((f) => !pendingRenewalFdrIds.has(f.fdrId));
    const renewalPending = fdrs.filter(
      (f) => f.status === 'RENEWAL_INITIATED' || pendingRenewalFdrIds.has(f.fdrId)
    );

    return { exp30, exp15, exp7, matured, overdueRenewal, renewalPending };
  }, [fdrs, renewals, getRemainingDays, lead30, lead15, lead7]);

  const displayedFdrs = useMemo(() => {
    if (activeBucket === '30D') return buckets.exp30;
    if (activeBucket === '15D') return buckets.exp15;
    if (activeBucket === '7D') return buckets.exp7;
    if (activeBucket === 'MATURED') return buckets.matured;
    if (activeBucket === 'OVERDUE_RENEWAL') return buckets.overdueRenewal;
    if (activeBucket === 'RENEWAL_PENDING') return buckets.renewalPending;
    return [...fdrs]
      .filter((f) => getRemainingDays(f.maturityDate) <= lead30)
      .sort((a, b) => getRemainingDays(a.maturityDate) - getRemainingDays(b.maturityDate));
  }, [activeBucket, buckets, fdrs, getRemainingDays, lead30]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 10 · Statutory Validity & Expiry Radar"
        title="Maturity & Validity Monitoring Centre"
        subtitle={`Automated tracking across ${lead30}-day, ${lead15}-day, and ${lead7}-day reminder buckets with interactive Demo Date Simulation and non-duplicate reminder dispatch.`}
        primaryActionLabel="Trigger Maturity Reminders (Non-Duplicate)"
        onPrimaryAction={() => triggerMaturityReminders()}
      />

      <div className="bg-slate-900 text-white border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-teal-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-teal-300">
              DEMO DATE SIMULATOR · DYNAMIC REMAINING DAYS CALCULATOR
            </div>
            <p className="text-xs text-slate-300">
              Advance or change the simulated reference date to watch FDRs move across 30d / 15d / 7d / Matured buckets in real time.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={simulatedToday}
            onChange={(e) => setSimulatedToday(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-white"
          />
          <button
            type="button"
            onClick={() => shiftSimulatedDate(7)}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded"
          >
            +7 Days
          </button>
          <button
            type="button"
            onClick={() => shiftSimulatedDate(15)}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded"
          >
            +15 Days
          </button>
          <button
            type="button"
            onClick={() => shiftSimulatedDate(30)}
            className="px-2.5 py-1.5 text-xs font-mono bg-teal-600 hover:bg-teal-500 rounded font-medium"
          >
            +30 Days
          </button>
          <button
            type="button"
            onClick={() => setSimulatedToday('2026-10-30')}
            className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300"
          >
            Reset Date
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            id: '30D',
            label: `Expiring <= ${lead30} Days`,
            count: buckets.exp30.length,
            tone: 'text-amber-700',
          },
          {
            id: '15D',
            label: `Expiring <= ${lead15} Days`,
            count: buckets.exp15.length,
            tone: 'text-amber-700',
          },
          {
            id: '7D',
            label: `Expiring <= ${lead7} Days`,
            count: buckets.exp7.length,
            tone: 'text-rose-700',
          },
          {
            id: 'MATURED',
            label: 'Matured (<=0 Days)',
            count: buckets.matured.length,
            tone: 'text-rose-700',
          },
          {
            id: 'OVERDUE_RENEWAL',
            label: 'Overdue Renewals',
            count: buckets.overdueRenewal.length,
            tone: 'text-rose-700',
          },
          {
            id: 'RENEWAL_PENDING',
            label: 'Renewal Pending',
            count: buckets.renewalPending.length,
            tone: 'text-teal-700',
          },
        ].map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setActiveBucket(b.id as typeof activeBucket)}
            className={`p-3.5 rounded-lg border text-left transition-colors ${
              activeBucket === b.id
                ? 'border-teal-600 bg-teal-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500">{b.label}</div>
            <div className={`mt-1 text-xl font-bold font-mono ${b.tone}`}>
              {b.count}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">FDR Number</th>
                <th className="py-3 px-3.5">Institution</th>
                <th className="py-3 px-3.5">Issuing Bank</th>
                <th className="py-3 px-3.5 text-right">Deposit Amount</th>
                <th className="py-3 px-3.5">Maturity Date</th>
                <th className="py-3 px-3.5 text-right">Remaining Days</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedFdrs.map((fdr) => {
                const rem = getRemainingDays(fdr.maturityDate);
                return (
                  <tr
                    key={fdr.fdrId}
                    onClick={() => setSelectedFdrForDrawer(fdr)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-3.5 font-mono font-semibold text-teal-700">
                      {fdr.fdrNumber}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      {fdr.institutionName}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">{fdr.bankName}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold">
                      {formatINR(fdr.principalAmount)}
                    </td>
                    <td className="py-3 px-3.5 font-mono">
                      {formatDateShort(fdr.maturityDate)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold">
                      <span
                        className={
                          rem <= 0
                            ? 'text-rose-700'
                            : rem <= 15
                            ? 'text-amber-700'
                            : 'text-teal-700'
                        }
                      >
                        {rem <= 0 ? `${rem}d (Matured)` : `${rem} days`}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <SemanticStatusText status={fdr.adminStatus || fdr.status} />
                    </td>
                    <td
                      className="py-3 px-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => triggerMaturityReminders(fdr.fdrId)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                      >
                        Send Reminder
                      </button>
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

// ============================================================================
// 4. SECTION 11 — RENEWAL & REPLACEMENT MODULE
// ============================================================================
export const AdminRenewalMonitoringPage: React.FC = () => {
  const {
    renewals,
    fdrs,
    reviewRenewalRecord,
    submitRenewalOrReplacement,
    simulateRenewalCase,
  } = useData();

  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const [origFdrId, setOrigFdrId] = useState(fdrs[0]?.fdrId || 'FDR-2001');
  const [newFdrNum, setNewFdrNum] = useState('SBI-REN-2026-99104');
  const [newAmt, setNewAmt] = useState(4000000);
  const [newMatDate, setNewMatDate] = useState('2034-10-30');
  const [reqType, setReqType] = useState<'Renewal' | 'Replacement'>('Renewal');

  const handleCreateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = fdrs.find((f) => f.fdrId === origFdrId) || fdrs[0];
    if (!orig) return;
    await submitRenewalOrReplacement({
      originalFdrId: orig.fdrId,
      newFdrNumber: newFdrNum,
      bankName: orig.bankName,
      branchName: orig.branchName,
      ifscCode: orig.ifscCode,
      newAmount: Number(newAmt),
      newMaturityDate: newMatDate,
      requestType: reqType,
      observations: 'Submitted renewed instrument for 8-year extension.',
      documentName: `${newFdrNum}_Renewal_Proof.pdf`,
    });
    setSubmitModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 11 · Instrument Continuity & Lineage Desk"
        title="Renewal & Replacement Monitoring"
        subtitle="Compare Original FDR vs Renewed/Replacement FDR side-by-side, approve or request documents, and maintain unbroken historical instrument lineage."
        primaryActionLabel="Submit Renewal / Replacement"
        onPrimaryAction={() => setSubmitModalOpen(true)}
        secondaryActionLabel="Simulate Renewal Case"
        onSecondaryAction={() => simulateRenewalCase()}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <GitBranch className="w-4 h-4 text-teal-700" />
          <span>Mandatory Lineage Chain Preserved on Every Renewal:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded">
            Original FDR (Archived)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded">
            Renewal 1
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded">
            Replacement FDR
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded">
            Current Active Instrument
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">Renewal ID</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Institution</th>
                <th className="py-3 px-3.5">Old FDR → New FDR</th>
                <th className="py-3 px-3.5 text-right">Old → New Amount</th>
                <th className="py-3 px-3.5">New Maturity</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {renewals.map((ren) => (
                <tr key={ren.renewalId} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-mono text-slate-500">
                    {ren.renewalId}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-slate-800">
                    {ren.requestType}
                  </td>
                  <td className="py-3 px-3.5 font-medium text-slate-900">
                    {ren.institutionName}
                  </td>
                  <td className="py-3 px-3.5 font-mono">
                    <span className="text-slate-500">{ren.originalFdrNumber}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="font-semibold text-teal-700">
                      {ren.newFdrNumber}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono">
                    {formatINR(ren.previousAmount)} →{' '}
                    <strong className="text-emerald-700">
                      {formatINR(ren.newAmount)}
                    </strong>
                  </td>
                  <td className="py-3 px-3.5 font-mono">
                    {formatDateShort(ren.newMaturityDate)}
                  </td>
                  <td className="py-3 px-3.5">
                    <SemanticStatusText status={ren.status} />
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRenewal(ren);
                        setReviewNotes(ren.observations || '');
                      }}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                    >
                      Compare Old vs New
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRenewal && (
        <ModalDialog
          isOpen={Boolean(selectedRenewal)}
          onClose={() => setSelectedRenewal(null)}
          title={`Side-by-Side Comparison · ${selectedRenewal.requestType} (${selectedRenewal.renewalId})`}
          subtitle={selectedRenewal.institutionName}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <div className="font-semibold text-slate-700 uppercase text-[11px]">
                  Original Instrument (Old FDR)
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {selectedRenewal.originalFdrNumber}
                </div>
                <div>Deposit Amount: {formatINR(selectedRenewal.previousAmount)}</div>
                <div>
                  Previous Maturity:{' '}
                  {formatDateShort(selectedRenewal.previousMaturityDate)}
                </div>
                <div>Bank: {selectedRenewal.bankName}</div>
              </div>

              <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-md space-y-2">
                <div className="font-semibold text-teal-800 uppercase text-[11px]">
                  Renewed / Replacement Instrument (New FDR)
                </div>
                <div className="font-mono font-bold text-teal-800 text-sm">
                  {selectedRenewal.newFdrNumber}
                </div>
                <div>New Deposit Amount: {formatINR(selectedRenewal.newAmount)}</div>
                <div>
                  New Maturity Date: {formatDateShort(selectedRenewal.newMaturityDate)}
                </div>
                <div>Bank: {selectedRenewal.bankName}</div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                AICTE Officer Observations
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await reviewRenewalRecord(
                    selectedRenewal.renewalId,
                    'Approved',
                    reviewNotes ||
                      'Renewal approved. Original FDR archived and linked to new active instrument.'
                  );
                  setSelectedRenewal(null);
                }}
                className="p-2.5 bg-emerald-600 text-white rounded font-medium"
              >
                Approve & Link Lineage
              </button>
              <button
                type="button"
                onClick={async () => {
                  await reviewRenewalRecord(
                    selectedRenewal.renewalId,
                    'Additional Documents Requested',
                    reviewNotes || 'Additional bank renewal endorsement requested.'
                  );
                  setSelectedRenewal(null);
                }}
                className="p-2.5 bg-amber-600 text-white rounded font-medium"
              >
                Request Additional Docs
              </button>
              <button
                type="button"
                onClick={async () => {
                  await reviewRenewalRecord(
                    selectedRenewal.renewalId,
                    'Rejected',
                    reviewNotes || 'Renewal rejected due to instrument mismatch.'
                  );
                  setSelectedRenewal(null);
                }}
                className="p-2.5 bg-rose-600 text-white rounded font-medium"
              >
                Reject Renewal
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      <ModalDialog
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit FDR Renewal or Replacement"
        subtitle="Preserves full lineage from the original FDR to the new instrument."
      >
        <form onSubmit={handleCreateRenewal} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Original FDR Instrument
            </label>
            <select
              value={origFdrId}
              onChange={(e) => setOrigFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {fdrs.map((f) => (
                <option key={f.fdrId} value={f.fdrId}>
                  {f.fdrNumber} — {f.institutionName} ({formatINR(f.principalAmount)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Request Type
              </label>
              <select
                value={reqType}
                onChange={(e) =>
                  setReqType(e.target.value as 'Renewal' | 'Replacement')
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="Renewal">Renewal</option>
                <option value="Replacement">Replacement</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                New FDR Number
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
                New Deposit Amount (INR)
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
                value={newMatDate}
                onChange={(e) => setNewMatDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSubmitModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
            >
              Submit Request
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 5. SECTION 12 — RELEASE & REFUND WORKFLOW MODULE
// ============================================================================
export const AdminReleaseProcessingPage: React.FC = () => {
  const {
    releases,
    systemConfig,
    saveSystemConfiguration,
    advanceReleaseWorkflow,
    simulateReleaseWorkflowCase,
  } = useData();

  const [selectedRelease, setSelectedRelease] = useState<ReleaseRefundRequest | null>(
    null
  );
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const stagesOrder: ReleaseWorkflowStage[] = [
    'SUBMITTED',
    'UNDER_DOCUMENT_REVIEW',
    'ELIGIBILITY_SCRUTINY',
    'PENDING_AUTHORITY_APPROVAL',
    'APPROVED',
    'RELEASE_PROCESSING',
    'RELEASED',
    'COMPLETED',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 12 · Statutory Lien Discharge & NOC Sanctioning"
        title="Release & Refund Workflow Processing"
        subtitle="Manage multi-stage statutory release workflows and exception states with configurable Demo Eligibility Rules and full decision history."
        primaryActionLabel="Simulate Release / Refund Case"
        onPrimaryAction={() => simulateReleaseWorkflowCase()}
      />

      {/* Configurable Demo Eligibility Rules Panel (Section 12) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">
              Configurable Demo Eligibility Rules for FDR Lien Release
            </h3>
            <p className="text-[11px] text-slate-500">
              Toggle rules below to configure how the automated Eligibility Check evaluates release requests
            </p>
          </div>
          <span className="text-[11px] font-mono text-teal-700">
            Live Rule Engine Active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={systemConfig.requireJointLienVerification}
              onChange={(e) =>
                saveSystemConfiguration({
                  requireJointLienVerification: e.target.checked,
                })
              }
            />
            <span>Require Joint-Lien Clause Verification</span>
          </label>
          <label className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(systemConfig.enableAutoDiscrepancyDetection)}
              onChange={(e) =>
                saveSystemConfiguration({
                  enableAutoDiscrepancyDetection: e.target.checked,
                })
              }
            />
            <span>Require Zero Unresolved Discrepancies</span>
          </label>
          <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-800 rounded flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Minimum Lock-In Period: {systemConfig.defaultLockInYears} Years
            </span>
          </div>
        </div>
      </div>

      {/* Releases Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">Request ID</th>
                <th className="py-3 px-3.5">FDR Number</th>
                <th className="py-3 px-3.5">Institution</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5">Eligibility Checks</th>
                <th className="py-3 px-3.5">Current Workflow Stage</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {releases.map((rel) => {
                const passedCount = Object.values(rel.eligibilityCheck).filter(
                  Boolean
                ).length;
                return (
                  <tr key={rel.requestId} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-mono text-slate-500">
                      {rel.requestId}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-semibold text-teal-700">
                      {rel.fdrNumber}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      {rel.institutionName}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold">
                      {formatINR(rel.depositAmount)}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-xs">
                      <span
                        className={
                          passedCount === 3
                            ? 'text-emerald-700 font-bold'
                            : 'text-amber-700'
                        }
                      >
                        {passedCount}/3 Rules Passed
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <SemanticStatusText status={rel.stage} />
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRelease(rel);
                          setDecisionRemarks('');
                        }}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                      >
                        Process Workflow
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Release Workflow Modal */}
      {selectedRelease && (
        <ModalDialog
          isOpen={Boolean(selectedRelease)}
          onClose={() => setSelectedRelease(null)}
          title={`Release & Refund Request ${selectedRelease.requestId} · ${selectedRelease.fdrNumber}`}
          subtitle={`${selectedRelease.institutionName} · ${formatINR(
            selectedRelease.depositAmount
          )}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <div className="font-semibold text-slate-800 mb-2">
                Statutory Release Progression:
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                {stagesOrder.map((st) => (
                  <span
                    key={st}
                    className={`px-2 py-1 rounded border ${
                      selectedRelease.stage === st
                        ? 'bg-teal-700 text-white border-teal-700 font-bold'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Officer Remarks / Sanction Reason
              </label>
              <textarea
                rows={2}
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="Enter scrutiny recommendation, approval order reference, or exception reason..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'UNDER_DOCUMENT_REVIEW',
                    'Moved to Document Review',
                    decisionRemarks || 'Eligibility verified; under scrutiny.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-slate-800 text-white rounded font-medium"
              >
                1. Document Review
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'ELIGIBILITY_SCRUTINY',
                    'Eligibility Scrutiny Passed',
                    decisionRemarks || 'Scrutiny complete; recommended for NOC.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-teal-700 text-white rounded font-medium"
              >
                2. Eligibility Scrutiny
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'PENDING_AUTHORITY_APPROVAL',
                    'Routed to Senior Approving Officer',
                    decisionRemarks || 'Awaiting Senior Approving Officer sanction.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-teal-600 text-white rounded font-medium"
              >
                3. Senior Approval Queue
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'APPROVED',
                    'Sanctioned by Senior Approving Officer',
                    decisionRemarks || 'Statutory NOC sanctioned.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-emerald-600 text-white rounded font-medium"
              >
                4. Approve NOC
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'RELEASED',
                    'FDR Lien Released',
                    decisionRemarks || 'Bank lien release order dispatched.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-emerald-700 text-white rounded font-medium"
              >
                5. Mark Lien Released
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'COMPLETED',
                    'Refund Completed',
                    decisionRemarks || 'Principal & interest settled to institution.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-slate-900 text-white rounded font-medium"
              >
                6. Complete Refund
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'ON_HOLD',
                    'Placed On Hold',
                    decisionRemarks || 'Placed on hold pending compliance clearance.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-amber-600 text-white rounded font-medium"
              >
                Exception: On Hold
              </button>
              <button
                type="button"
                onClick={async () => {
                  await advanceReleaseWorkflow(
                    selectedRelease.requestId,
                    'REJECTED',
                    'Release Request Rejected',
                    decisionRemarks || 'Rejected due to lock-in period.'
                  );
                  setSelectedRelease(null);
                }}
                className="p-2 bg-rose-600 text-white rounded font-medium"
              >
                Exception: Reject
              </button>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="font-semibold text-slate-900">
                Decision History Timeline ({selectedRelease.timeline.length})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {selectedRelease.timeline.map((step) => (
                  <div key={step.id} className="p-2.5 text-[11px]">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>
                        {step.stage} — {step.action}
                      </span>
                      <span className="font-mono text-slate-400">
                        {formatDateShort(step.timestamp)}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{step.remarks}</div>
                    <div className="text-slate-400">
                      {step.officerName} ({step.officerRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
};
