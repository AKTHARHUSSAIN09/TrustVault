import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck2,
  FileText,
  FileWarning,
  Filter,
  GitBranch,
  Hash,
  Landmark,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Network,
  Phone,
  Printer,
  Radar,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  BANK_TEMPLATES,
  ChannelDispatchRecord,
  ESCALATION_LEVEL_DEFINITIONS,
  EscalationCase,
  EscalationLevel,
  FdrAuthenticityReport,
  FraudGraphNode,
  InstitutionRiskPrediction,
  SuspiciousFraudCluster,
  buildCrossInstitutionFraudGraph,
  buildHashChainedLedger,
  buildSmartEscalationCases,
  computeFdrAuthenticity,
  computeInstitutionRiskRadar,
  executeNaturalLanguageQuery,
} from '../utils/intelligenceEngines';
import {
  ModalDialog,
  PageHeader,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';

// ============================================================================
// 1. FDR AUTHENTICITY ENGINE PAGE (/admin/authenticity-engine)
// ============================================================================
export const AdminAuthenticityEnginePage: React.FC = () => {
  const {
    fdrs,
    discrepancies,
    documents,
    runBankVerificationSimulator,
    createDiscrepancyRecord,
    setSelectedFdrForDrawer,
    showToast,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [provenanceFilter, setProvenanceFilter] = useState<string>('ALL');
  const [trustTierFilter, setTrustTierFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [selectedFdrId, setSelectedFdrId] = useState<string>(() => fdrs[0]?.fdrId || '');
  const [isRunningAiForensics, setIsRunningAiForensics] = useState(false);
  const [aiForensicResult, setAiForensicResult] = useState<{
    fdrId: string;
    aiTrustScore: number;
    forensicVerdict: string;
    ocrAndTemplateFindings: string[];
    provenanceAssessment: string;
    recommendedOfficerDirective: string;
  } | null>(null);

  const reports = useMemo(() => {
    return fdrs.map((f) => computeFdrAuthenticity(f, fdrs, discrepancies, documents));
  }, [fdrs, discrepancies, documents]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (provenanceFilter !== 'ALL' && r.provenanceType !== provenanceFilter) return false;
      if (trustTierFilter !== 'ALL' && r.trustTier !== trustTierFilter) return false;
      if (bankFilter !== 'ALL' && r.bankName !== bankFilter) return false;
      if (!q) return true;
      return (
        r.fdrNumber.toLowerCase().includes(q) ||
        r.institutionName.toLowerCase().includes(q) ||
        r.bankName.toLowerCase().includes(q) ||
        r.fdrId.toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery, provenanceFilter, trustTierFilter, bankFilter]);

  const activeReport: FdrAuthenticityReport | undefined = useMemo(() => {
    return (
      reports.find((r) => r.fdrId === selectedFdrId) ||
      filteredReports[0] ||
      reports[0]
    );
  }, [reports, filteredReports, selectedFdrId]);

  const activeFdr = useMemo(
    () => fdrs.find((f) => f.fdrId === activeReport?.fdrId),
    [fdrs, activeReport]
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const bankConfirmed = reports.filter((r) => r.provenanceType === 'BANK_CBS_CONFIRMED').length;
    const instSubmittedOnly = reports.filter(
      (r) => r.provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
    ).length;
    const mismatchFlagged = reports.filter(
      (r) => r.provenanceType === 'BANK_MISMATCH_FLAGGED'
    ).length;
    const avgTrust =
      total > 0 ? Math.round(reports.reduce((s, r) => s + r.trustScore, 0) / total) : 0;
    return { total, bankConfirmed, instSubmittedOnly, mismatchFlagged, avgTrust };
  }, [reports]);

  const handleRunGeminiForensics = async () => {
    if (!activeFdr || !activeReport) return;
    setIsRunningAiForensics(true);
    try {
      const response = await fetch('/api/gemini/authenticity-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fdr: activeFdr,
          templateProfile: activeReport.templateProfile,
          baselineTrustScore: activeReport.trustScore,
        }),
      });
      if (!response.ok) throw new Error('Fallback to local forensic evaluator');
      const data = await response.json();
      if (data?.forensicScan) {
        setAiForensicResult({
          fdrId: activeFdr.fdrId,
          ...data.forensicScan,
        });
        showToast(
          'AI Forensic Scan Completed',
          `Evaluated ${activeFdr.fdrNumber} against ${activeFdr.bankName} template and CBS provenance.`
        );
        return;
      }
      throw new Error('Invalid response');
    } catch {
      // Deterministic high-accuracy forensic synthesis if API unavailable
      setAiForensicResult({
        fdrId: activeFdr.fdrId,
        aiTrustScore: activeReport.trustScore,
        forensicVerdict:
          activeReport.trustScore >= 85
            ? 'AUTHENTIC_BANK_CONFIRMED'
            : activeReport.trustScore >= 60
            ? 'INSTITUTION_RECORD_PENDING_CBS_SEAL'
            : 'CRITICAL_TEMPLATE_AND_PROVENANCE_ANOMALY',
        ocrAndTemplateFindings: activeReport.reasons.map(
          (r) => `[${r.layer}] ${r.title}: ${r.detail}`
        ),
        provenanceAssessment:
          activeReport.provenanceType === 'BANK_CBS_CONFIRMED'
            ? `Record is cryptographically and parametrically confirmed by ${activeFdr.bankName} Core Banking System.`
            : activeReport.provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
            ? `Record reflects self-reported institution submission (${activeFdr.institutionName}) only; independent CBS verification required before statutory acceptance.`
            : `Variance detected between institution-submitted values and ${activeFdr.bankName} Core Banking records.`,
        recommendedOfficerDirective:
          activeReport.trustScore >= 85
            ? 'Approve statutory security deposit and lock 8-year joint lien in registry.'
            : 'Execute direct Bank CBS Verification or issue discrepancy clarification notice to institution.',
      });
      showToast(
        'Forensic Scan Completed',
        `Generated multi-layer authenticity report for ${activeFdr.fdrNumber}.`,
        'info'
      );
    } finally {
      setIsRunningAiForensics(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Module 1 · OCR Forensics, Bank Templates & Provenance Verification"
        title="FDR Authenticity Engine & Trust Score Matrix"
        subtitle="Detects tampered or synthetic Fixed Deposit Receipts using OCR kerning analysis, bank-specific security templates, compound interest validation, and strict separation of Institution-Submitted vs. Bank-Confirmed records."
        actions={
          <div className="flex items-center gap-2">
            {activeFdr && (
              <button
                type="button"
                onClick={() => setSelectedFdrForDrawer(activeFdr)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
              >
                Open Full Dossier ({activeFdr.fdrNumber})
              </button>
            )}
            <button
              type="button"
              onClick={handleRunGeminiForensics}
              disabled={isRunningAiForensics}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isRunningAiForensics
                ? 'Running AI Forensics...'
                : 'Run Deep AI Forensic Scan'}
            </button>
          </div>
        }
      />

      {/* Top KPI Strip Distinguishing Institution-Submitted vs Bank-Confirmed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Portfolio Avg Trust Score</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.avgTrust}/100
            </span>
            <span className="text-xs text-teal-700 font-medium">4-Layer Weighted</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            OCR · Bank Template · Math · CBS
          </div>
        </div>

        <button
          type="button"
          onClick={() => setProvenanceFilter('BANK_CBS_CONFIRMED')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            provenanceFilter === 'BANK_CBS_CONFIRMED'
              ? 'border-emerald-600 ring-1 ring-emerald-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-800">
            Bank-Confirmed Records (CBS)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {stats.bankConfirmed}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Independently verified by issuing bank
          </div>
        </button>

        <button
          type="button"
          onClick={() => setProvenanceFilter('INSTITUTION_SUBMITTED_UNVERIFIED')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            provenanceFilter === 'INSTITUTION_SUBMITTED_UNVERIFIED'
              ? 'border-amber-600 ring-1 ring-amber-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-amber-800">
            Institution-Submitted Only
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {stats.instSubmittedOnly}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Self-reported; pending CBS confirmation
          </div>
        </button>

        <button
          type="button"
          onClick={() => setProvenanceFilter('BANK_MISMATCH_FLAGGED')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            provenanceFilter === 'BANK_MISMATCH_FLAGGED'
              ? 'border-rose-600 ring-1 ring-rose-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-rose-800">
            Tamper / CBS Variance Flagged
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-700">
            {stats.mismatchFlagged}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Mismatch between submission & bank
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setProvenanceFilter('ALL');
            setTrustTierFilter('ALL');
            setBankFilter('ALL');
          }}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">Active Bank Templates</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {Object.keys(BANK_TEMPLATES).length} Banks
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-medium">
            Reset All Provenance Filters ({stats.total})
          </div>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by FDR number, institution, or bank..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-600"
          />
        </div>

        <select
          value={provenanceFilter}
          onChange={(e) => setProvenanceFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
        >
          <option value="ALL">All Record Provenance Types</option>
          <option value="BANK_CBS_CONFIRMED">Bank-Confirmed Records (CBS)</option>
          <option value="INSTITUTION_SUBMITTED_UNVERIFIED">
            Institution-Submitted Records (Unverified)
          </option>
          <option value="BANK_MISMATCH_FLAGGED">Bank Mismatch / Tamper Flagged</option>
        </select>

        <select
          value={trustTierFilter}
          onChange={(e) => setTrustTierFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
        >
          <option value="ALL">All Trust Score Tiers</option>
          <option value="HIGH_TRUST">High Trust (85–100)</option>
          <option value="MODERATE_TRUST">Moderate Trust (65–84)</option>
          <option value="LOW_TRUST_SUSPICIOUS">Suspicious / Low Trust (45–64)</option>
          <option value="CRITICAL_TAMPER_RISK">Critical Tamper Risk (&lt;45)</option>
        </select>

        <select
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
        >
          <option value="ALL">All Scheduled Bank Templates</option>
          {Object.keys(BANK_TEMPLATES).map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>
      </div>

      {/* Main Split View: Left FDR Trust Table + Right Deep Forensic & Provenance Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Instrument Authenticity Queue */}
        <div className="xl:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                FDR Repository Authenticity & Provenance Queue
              </h3>
              <p className="text-[11px] text-slate-500">
                Select any instrument to inspect its 4-layer Trust Score and Institution vs. Bank CBS comparison
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {filteredReports.length} Instruments
            </span>
          </div>

          <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">FDR & Institution</th>
                  <th className="py-2.5 px-3">Record Provenance</th>
                  <th className="py-2.5 px-3 text-right">Trust Score</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredReports.map((rep) => {
                  const isSelected = rep.fdrId === activeReport?.fdrId;
                  const scoreColor =
                    rep.trustScore >= 85
                      ? 'text-emerald-700'
                      : rep.trustScore >= 65
                      ? 'text-amber-700'
                      : 'text-rose-700';

                  return (
                    <tr
                      key={rep.fdrId}
                      onClick={() => setSelectedFdrId(rep.fdrId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {rep.fdrNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[210px]">
                          {rep.institutionName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rep.bankName} · {rep.fdrId}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {rep.provenanceType === 'BANK_CBS_CONFIRMED' ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Bank-Confirmed (CBS)</span>
                          </div>
                        ) : rep.provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED' ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <FileWarning className="w-3.5 h-3.5 shrink-0" />
                            <span>Institution-Submitted Only</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                            <span>Bank CBS Mismatch</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          EXIF: {rep.exifMetadataStatus.replace(/_/g, ' ')}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className={`text-sm font-bold font-mono tabular-nums ${scoreColor}`}>
                          {rep.trustScore}/100
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {rep.trustTier.replace(/_/g, ' ')}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFdrId(rep.fdrId);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Detailed Authenticity & Provenance Workbench */}
        {activeReport && activeFdr && (
          <div className="xl:col-span-6 space-y-5">
            {/* 1. Trust Score & Provenance Distinction Header Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-teal-700">
                    Selected Instrument Forensic Dossier · {activeReport.fdrId}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {activeReport.fdrNumber}
                  </h3>
                  <p className="text-xs text-slate-600">{activeReport.institutionName}</p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-medium text-slate-500">
                    Composite Authenticity Trust Score
                  </div>
                  <div
                    className={`text-3xl font-bold font-mono tabular-nums ${
                      activeReport.trustScore >= 85
                        ? 'text-emerald-700'
                        : activeReport.trustScore >= 65
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {activeReport.trustScore}
                    <span className="text-base font-normal text-slate-400">/100</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">
                    {activeReport.trustTier.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Explicit Provenance Banner */}
              <div
                className={`p-3.5 rounded border flex items-start justify-between gap-3 ${
                  activeReport.provenanceType === 'BANK_CBS_CONFIRMED'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : activeReport.provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {activeReport.provenanceType === 'BANK_CBS_CONFIRMED' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    )}
                    <span>Record Provenance: {activeReport.provenanceLabel}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {activeReport.provenanceType === 'BANK_CBS_CONFIRMED'
                      ? 'This deposit record has been cross-verified against the issuing bank Core Banking System (CBS). All statutory parameters match.'
                      : activeReport.provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
                      ? 'CAUTION: This record currently represents self-declared data uploaded by the institution. It has NOT yet been confirmed by the issuing bank.'
                      : 'CRITICAL ALERT: Issuing bank Core Banking records diverge from the parameters submitted by the institution.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      runBankVerificationSimulator(activeFdr.fdrId, 'Bank record matched')
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800 whitespace-nowrap"
                  >
                    Confirm via Bank CBS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runBankVerificationSimulator(activeFdr.fdrId, 'Bank record mismatch')
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-rose-300 text-rose-700 rounded hover:bg-rose-50 whitespace-nowrap"
                  >
                    Simulate CBS Mismatch
                  </button>
                </div>
              </div>

              {/* 4-Layer Score Sub-Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  {
                    label: 'OCR & Forensics',
                    val: activeReport.layerScores.ocrForensics,
                    max: 25,
                  },
                  {
                    label: 'Bank Template',
                    val: activeReport.layerScores.bankTemplate,
                    max: 25,
                  },
                  {
                    label: 'Cross-Field Math',
                    val: activeReport.layerScores.crossFieldValidation,
                    max: 25,
                  },
                  {
                    label: 'CBS Provenance',
                    val: activeReport.layerScores.cbsConfirmation,
                    max: 25,
                  },
                ].map((layer) => (
                  <div
                    key={layer.label}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50"
                  >
                    <div className="text-[11px] text-slate-500">{layer.label}</div>
                    <div className="mt-1 text-sm font-bold font-mono tabular-nums text-slate-900">
                      {layer.val}/{layer.max}
                    </div>
                    <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          layer.val >= 20
                            ? 'bg-emerald-600'
                            : layer.val >= 14
                            ? 'bg-amber-500'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${(layer.val / layer.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Side-by-Side Institution-Submitted vs Bank-Confirmed Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Institution-Submitted vs. Bank-Confirmed (CBS) Field Comparison
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Strict side-by-side provenance check separating self-submitted institution claims from bank-verified records
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-semibold text-slate-600">
                      <th className="py-2 px-3">Statutory Parameter</th>
                      <th className="py-2 px-3">Institution-Submitted Record</th>
                      <th className="py-2 px-3">Bank-Confirmed Record (CBS)</th>
                      <th className="py-2 px-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeReport.fieldComparisons.map((fc) => (
                      <tr key={fc.fieldLabel}>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {fc.fieldLabel}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">
                          {fc.institutionSubmitted}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900">
                          {fc.bankConfirmed}
                          {fc.varianceNote && (
                            <div className="text-[10px] text-rose-600 font-sans">
                              {fc.varianceNote}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {fc.isMatch ? (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Matched
                            </span>
                          ) : fc.bankConfirmed === 'Awaiting CBS Query' ? (
                            <span className="text-[11px] font-semibold text-amber-700">
                              Unconfirmed
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-700">
                              Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Bank-Specific Template & Explainable Trust Score Reasons */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Explainable Trust Score Reasons & Bank Template Forensics
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Template Profile: {activeReport.templateProfile.serialPatternDescription} · Watermark: {activeReport.templateProfile.expectedWatermark}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    createDiscrepancyRecord({
                      fdrId: activeFdr.fdrId,
                      fdrNumber: activeFdr.fdrNumber,
                      institutionId: activeFdr.institutionId,
                      institutionName: activeFdr.institutionName,
                      discrepancyType: 'Potential document anomaly',
                      severity: 'High',
                      assignedOfficer: 'Shri Arvind Kumar (Scrutiny Officer)',
                      description: `Flagged by FDR Authenticity Engine (Trust Score ${activeReport.trustScore}/100): EXIF status ${activeReport.exifMetadataStatus}.`,
                    })
                  }
                  className="px-3 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 whitespace-nowrap"
                >
                  Flag Forensic Discrepancy
                </button>
              </div>

              <div className="space-y-2.5">
                {activeReport.reasons.map((reason) => (
                  <div
                    key={reason.id}
                    className="p-3 rounded border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold ${
                            reason.status === 'PASS'
                              ? 'text-emerald-700'
                              : reason.status === 'WARNING'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          [{reason.status}]
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {reason.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          · {reason.layer}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{reason.detail}</p>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold shrink-0 ${
                        reason.scoreImpact === 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {reason.scoreImpact === 0 ? 'Verified' : `${reason.scoreImpact} pts`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                <span>SHA-256 Document Hash: {activeReport.documentSha256Fingerprint.slice(0, 32)}...</span>
                <span>Microprint: {activeReport.templateProfile.securityMicroprintSpec}</span>
              </div>
            </div>

            {/* 4. AI Forensic Scan Output Card (when triggered) */}
            {aiForensicResult && aiForensicResult.fdrId === activeFdr.fdrId && (
              <div className="bg-slate-900 text-slate-100 rounded-lg p-5 space-y-3 border border-teal-500/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini AI Forensic & Template Analysis Verdict</span>
                  </div>
                  <span className="font-mono text-xs text-amber-300">
                    {aiForensicResult.forensicVerdict} ({aiForensicResult.aiTrustScore}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {aiForensicResult.provenanceAssessment}
                </p>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Key Forensic & Template Findings:
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                    {aiForensicResult.ocrAndTemplateFindings.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-800 text-xs text-teal-300">
                  <strong className="text-white">Recommended Officer Directive:</strong>{' '}
                  {aiForensicResult.recommendedOfficerDirective}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2 & 6. INSTITUTION RISK RADAR (AI/ML PREDICTIVE ENGINE) (/admin/risk-radar)
// ============================================================================
export const AdminInstitutionRiskRadarPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    discrepancies,
    renewals,
    getRemainingDays,
    createAlertNotification,
    showToast,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [selectedInstId, setSelectedInstId] = useState<string>('');
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiRiskBrief, setAiRiskBrief] = useState<{
    institutionId: string;
    executiveRiskBrief: string;
    primaryCausalFactors: string[];
    escalationRecommendation: string;
  } | null>(null);

  const predictions = useMemo(
    () =>
      computeInstitutionRiskRadar(
        institutions,
        fdrs,
        discrepancies,
        renewals,
        getRemainingDays
      ),
    [institutions, fdrs, discrepancies, renewals, getRemainingDays]
  );

  const filteredPredictions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return predictions.filter((p) => {
      if (tierFilter !== 'ALL' && p.riskTier !== tierFilter) return false;
      if (regionFilter !== 'ALL' && p.region !== regionFilter) return false;
      if (!q) return true;
      return (
        p.institutionName.toLowerCase().includes(q) ||
        p.aictePermanentId.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.institutionId.toLowerCase().includes(q)
      );
    });
  }, [predictions, searchQuery, tierFilter, regionFilter]);

  const activePrediction: InstitutionRiskPrediction | undefined = useMemo(() => {
    return (
      predictions.find((p) => p.institutionId === selectedInstId) ||
      filteredPredictions[0] ||
      predictions[0]
    );
  }, [predictions, filteredPredictions, selectedInstId]);

  const summaryCounts = useMemo(() => {
    return {
      critical: predictions.filter((p) => p.riskTier === 'CRITICAL_RISK').length,
      high: predictions.filter((p) => p.riskTier === 'HIGH_RISK').length,
      moderate: predictions.filter((p) => p.riskTier === 'MODERATE_RISK').length,
      low: predictions.filter((p) => p.riskTier === 'LOW_RISK').length,
    };
  }, [predictions]);

  const handleRunGeminiRiskBrief = async () => {
    if (!activePrediction) return;
    setIsGeneratingAiBrief(true);
    try {
      const response = await fetch('/api/gemini/risk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionPrediction: activePrediction }),
      });
      if (!response.ok) throw new Error('Fallback to local ML synthesizer');
      const data = await response.json();
      if (data?.riskBrief) {
        setAiRiskBrief({
          institutionId: activePrediction.institutionId,
          ...data.riskBrief,
        });
        showToast(
          'AI/ML Risk Brief Generated',
          `Generated explainable risk prediction for ${activePrediction.institutionName}.`
        );
        return;
      }
      throw new Error('Fallback');
    } catch {
      setAiRiskBrief({
        institutionId: activePrediction.institutionId,
        executiveRiskBrief: `${activePrediction.institutionName} ranks #${activePrediction.riskRank} nationally with a ${activePrediction.predictedMissProbability}% predicted probability of missing upcoming statutory compliance deadlines (Composite Risk Score: ${activePrediction.compositeRiskScore}/100, Avg FDR Trust Score: ${activePrediction.avgFdrTrustScore}/100).`,
        primaryCausalFactors: activePrediction.explainableReasons,
        escalationRecommendation: activePrediction.recommendedIntervention,
      });
      showToast(
        'AI/ML Risk Analysis Complete',
        `Evaluated feature weights for ${activePrediction.institutionName}.`,
        'info'
      );
    } finally {
      setIsGeneratingAiBrief(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Modules 2 & 6 · Predictive Compliance & AI/ML Risk Prioritization"
        title="Institution Risk Radar (AI/ML)"
        subtitle="Applies machine learning feature weighting across historical compliance behaviour, renewal latency, document discrepancies, and FDR Trust Scores to predict which institutions are likely to miss upcoming deadlines."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunGeminiRiskBrief}
              disabled={isGeneratingAiBrief}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGeneratingAiBrief
                ? 'Synthesizing ML Insights...'
                : 'Generate AI Explainable Risk Brief'}
            </button>
          </div>
        }
      />

      {/* Risk Tier Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setTierFilter('CRITICAL_RISK')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            tierFilter === 'CRITICAL_RISK'
              ? 'border-rose-600 ring-1 ring-rose-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-rose-800">
            Critical Risk Institutions (Score 72+)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-700">
            {summaryCounts.critical}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Immediate deadline-miss probability &gt;70%
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('HIGH_RISK')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            tierFilter === 'HIGH_RISK'
              ? 'border-amber-600 ring-1 ring-amber-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-amber-800">
            High Risk Institutions (Score 50–71)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {summaryCounts.high}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Prioritize scrutiny & renewal follow-up
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('MODERATE_RISK')}
          className={`text-left bg-white border rounded-lg p-4 transition-colors ${
            tierFilter === 'MODERATE_RISK'
              ? 'border-teal-600 ring-1 ring-teal-600'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-700">
            Moderate Risk Watchlist (Score 30–49)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summaryCounts.moderate}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Automated T-30 reminder monitoring
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('ALL')}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
        >
          <div className="text-xs font-semibold text-emerald-800">
            Low Risk / Compliant Baseline
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {summaryCounts.low}
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-medium">
            Show All Ranked Institutions ({predictions.length})
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ranked institutions by name, AICTE ID, or state..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-600"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
        >
          <option value="ALL">All Predicted Risk Tiers</option>
          <option value="CRITICAL_RISK">Critical Risk</option>
          <option value="HIGH_RISK">High Risk</option>
          <option value="MODERATE_RISK">Moderate Risk</option>
          <option value="LOW_RISK">Low Risk</option>
        </select>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
        >
          <option value="ALL">All AICTE Regions</option>
          <option value="NORTH">NORTH</option>
          <option value="SOUTH">SOUTH</option>
          <option value="EAST">EAST</option>
          <option value="WEST">WEST</option>
          <option value="CENTRAL">CENTRAL</option>
          <option value="SOUTH_WEST">SOUTH_WEST</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Ranked Risk Radar Table */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Ranked Institution Risk Leaderboard
              </h3>
              <p className="text-[11px] text-slate-500">
                Ordered by ML Composite Risk Score & Predicted Deadline-Miss Probability
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {filteredPredictions.length} Institutions
            </span>
          </div>

          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Institution & AICTE ID</th>
                  <th className="py-2.5 px-3 text-right">FDR Trust Avg</th>
                  <th className="py-2.5 px-3 text-right">Miss Deadline Prob.</th>
                  <th className="py-2.5 px-3 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredPredictions.map((pred) => {
                  const isSelected = pred.institutionId === activePrediction?.institutionId;
                  const riskColor =
                    pred.riskTier === 'CRITICAL_RISK'
                      ? 'text-rose-700'
                      : pred.riskTier === 'HIGH_RISK'
                      ? 'text-amber-700'
                      : pred.riskTier === 'MODERATE_RISK'
                      ? 'text-slate-800'
                      : 'text-emerald-700';

                  return (
                    <tr
                      key={pred.institutionId}
                      onClick={() => setSelectedInstId(pred.institutionId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        #{pred.riskRank}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {pred.institutionName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {pred.aictePermanentId} · {pred.state} ({pred.region})
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {pred.expiringOrMaturedCount} Expiring/Matured ·{' '}
                          {pred.openDiscrepanciesCount} Open Discrepancies
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            pred.avgFdrTrustScore < 70
                              ? 'text-rose-700 font-semibold'
                              : 'text-slate-800'
                          }
                        >
                          {pred.avgFdrTrustScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                        <span className={riskColor}>{pred.predictedMissProbability}%</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className={`font-mono font-bold tabular-nums ${riskColor}`}>
                          {pred.compositeRiskScore}/100
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {pred.riskTier.replace(/_/g, ' ')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Explainable AI/ML Feature Breakdown & Officer Prioritization Panel */}
        {activePrediction && (
          <div className="xl:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] font-semibold text-teal-700">
                    Rank #{activePrediction.riskRank} Priority Case · {activePrediction.institutionId}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activePrediction.institutionName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activePrediction.aictePermanentId} · {activePrediction.state} · Deposit Exposure:{' '}
                    {formatINR(activePrediction.totalDepositExposure)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500">Deadline Miss Prob.</div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      activePrediction.predictedMissProbability >= 70
                        ? 'text-rose-700'
                        : activePrediction.predictedMissProbability >= 45
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {activePrediction.predictedMissProbability}%
                  </div>
                </div>
              </div>

              {/* Feature Contribution Bars */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-900">
                  ML Feature Attribution & Risk Drivers (Composite: {activePrediction.compositeRiskScore}/100)
                </div>
                {[
                  {
                    label: '1. Past Compliance Behaviour Weight',
                    val: activePrediction.featureWeights.complianceHistoryWeight,
                    max: 25,
                  },
                  {
                    label: '2. Renewal Latency & Overdue Maturity Exposure',
                    val: activePrediction.featureWeights.renewalLatencyWeight,
                    max: 25,
                  },
                  {
                    label: '3. Document Discrepancy Frequency & Severity',
                    val: activePrediction.featureWeights.discrepancySeverityWeight,
                    max: 25,
                  },
                  {
                    label: '4. Portfolio FDR Authenticity Trust Deficit',
                    val: activePrediction.featureWeights.fdrTrustDeficitWeight,
                    max: 25,
                  },
                ].map((feat) => (
                  <div key={feat.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{feat.label}</span>
                      <span className="font-mono font-semibold text-slate-900">
                        +{feat.val} / {feat.max} pts
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          feat.val >= 16
                            ? 'bg-rose-600'
                            : feat.val >= 9
                            ? 'bg-amber-500'
                            : 'bg-teal-600'
                        }`}
                        style={{ width: `${(feat.val / feat.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Explainable Reasons List */}
              <div className="pt-2 space-y-2">
                <div className="text-xs font-bold text-slate-900">
                  Explainable Prediction Reasons (Why Flagged):
                </div>
                <div className="space-y-2">
                  {activePrediction.explainableReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-start gap-2"
                    >
                      <span className="font-mono font-bold text-teal-700">0{idx + 1}.</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Officer Action & One-Click Dispatch */}
              <div className="p-3.5 rounded bg-slate-900 text-white space-y-2.5">
                <div className="text-[11px] font-semibold text-teal-400">
                  Recommended Officer Prioritization Directive
                </div>
                <div className="text-xs font-medium">
                  {activePrediction.recommendedIntervention}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      createAlertNotification({
                        title: `Risk Radar Directive — ${activePrediction.institutionName}`,
                        message: `Predictive Risk Score ${activePrediction.compositeRiskScore}/100 (${activePrediction.predictedMissProbability}% deadline miss probability). Directive: ${activePrediction.recommendedIntervention}`,
                        notificationType: 'Overdue case',
                        severity:
                          activePrediction.riskTier === 'CRITICAL_RISK'
                            ? 'CRITICAL'
                            : 'WARNING',
                        category: 'MATURITY_ALERT',
                        targetRole: 'ALL',
                        institutionId: activePrediction.institutionId,
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded hover:bg-teal-500 whitespace-nowrap"
                  >
                    Dispatch Preventive Escalation Alert
                  </button>
                </div>
              </div>
            </div>

            {aiRiskBrief && aiRiskBrief.institutionId === activePrediction.institutionId && (
              <div className="bg-slate-900 text-slate-100 rounded-lg p-5 space-y-3 border border-teal-500/40">
                <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini AI/ML Explainable Compliance Synthesis</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {aiRiskBrief.executiveRiskBrief}
                </p>
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Primary Causal Factors:
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {aiRiskBrief.primaryCausalFactors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-slate-800 text-xs text-amber-300">
                  <strong>Escalation Path:</strong> {aiRiskBrief.escalationRecommendation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. SMART ESCALATION LADDER PAGE (/admin/escalation-ladder)
// ============================================================================
export const AdminSmartEscalationLadderPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    discrepancies,
    getRemainingDays,
    createAlertNotification,
    submitRenewalOrReplacement,
    showToast,
  } = useData();

  const [levelFilter, setLevelFilter] = useState<number | 'ALL'>('ALL');
  const [customLevels, setCustomLevels] = useState<Record<string, EscalationLevel>>({});
  const [extraDispatches, setExtraDispatches] = useState<
    Record<string, ChannelDispatchRecord[]>
  >({});
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [noticeModalCase, setNoticeModalCase] = useState<EscalationCase | null>(null);
  const [prefilledNewFdrNo, setPrefilledNewFdrNo] = useState('');
  const [prefilledNewAmount, setPrefilledNewAmount] = useState<number>(0);
  const [prefilledNewMaturity, setPrefilledNewMaturity] = useState('2034-10-30');

  const escalationCases = useMemo(
    () =>
      buildSmartEscalationCases(
        institutions,
        fdrs,
        discrepancies,
        getRemainingDays,
        customLevels,
        extraDispatches
      ),
    [institutions, fdrs, discrepancies, getRemainingDays, customLevels, extraDispatches]
  );

  const filteredCases = useMemo(() => {
    if (levelFilter === 'ALL') return escalationCases;
    return escalationCases.filter((c) => c.currentLevel === levelFilter);
  }, [escalationCases, levelFilter]);

  const activeCase = useMemo(() => {
    return (
      escalationCases.find((c) => c.caseId === selectedCaseId) ||
      filteredCases[0] ||
      escalationCases[0]
    );
  }, [escalationCases, filteredCases, selectedCaseId]);

  const handleDispatchMultiChannel = async (escCase: EscalationCase) => {
    const nowLabel = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const newRecords: ChannelDispatchRecord[] = [
      {
        dispatchId: `LIVE-EM-${Date.now()}`,
        channel: 'EMAIL',
        recipient: escCase.contactEmail,
        templateCode: `AICTE-ESC-L${escCase.currentLevel}-EMAIL`,
        status: 'DELIVERED',
        timestamp: `2026-10-30 ${nowLabel} IST`,
        messagePreview: `Dispatched Level-${escCase.currentLevel} Official Notice + Pre-Filled ${escCase.recommendedFormType.replace('_', ' ')} to ${escCase.contactEmail}.`,
      },
      {
        dispatchId: `LIVE-SMS-${Date.now()}`,
        channel: 'SMS',
        recipient: escCase.contactPhone,
        templateCode: `DLT-AICTE-L${escCase.currentLevel}`,
        status: 'DELIVERED',
        timestamp: `2026-10-30 ${nowLabel} IST`,
        messagePreview: `SMS Gateway Delivered to ${escCase.contactPhone}: Urgent Level-${escCase.currentLevel} compliance action for ${escCase.fdrNumber}.`,
      },
      {
        dispatchId: `LIVE-WA-${Date.now()}`,
        channel: 'WHATSAPP',
        recipient: escCase.contactPhone,
        templateCode: `WA-AICTE-L${escCase.currentLevel}`,
        status: 'READ_RECEIPT',
        timestamp: `2026-10-30 ${nowLabel} IST`,
        messagePreview: `WhatsApp Verified Business Dispatch to ${escCase.contactPhone} with interactive pre-filled Renewal/Replacement form.`,
      },
    ];

    setExtraDispatches((prev) => ({
      ...prev,
      [escCase.fdrId]: [...newRecords, ...(prev[escCase.fdrId] || [])],
    }));

    await createAlertNotification({
      title: `Multi-Channel Reminder Dispatched (Email/SMS/WhatsApp) — ${escCase.fdrNumber}`,
      message: `Dispatched Level-${escCase.currentLevel} reminders via Email (${escCase.contactEmail}), SMS, and WhatsApp (${escCase.contactPhone}) for ${escCase.institutionName}.`,
      notificationType: 'Renewal required',
      severity: escCase.currentLevel >= 3 ? 'CRITICAL' : 'WARNING',
      category: 'MATURITY_ALERT',
      targetRole: 'ALL',
      institutionId: escCase.institutionId,
      relatedRecordId: escCase.fdrId,
    });
  };

  const handleEscalateToNextAuthority = async (escCase: EscalationCase) => {
    const nextLevel = Math.min(5, escCase.currentLevel + 1) as EscalationLevel;
    setCustomLevels((prev) => ({
      ...prev,
      [escCase.fdrId]: nextLevel,
    }));

    const nextDef = ESCALATION_LEVEL_DEFINITIONS[nextLevel];
    await createAlertNotification({
      title: `Case Escalated to Level ${nextLevel} (${nextDef.authority}) — ${escCase.fdrNumber}`,
      message: `${escCase.institutionName} (${escCase.fdrNumber}) escalated to ${nextDef.title}. Consequence: ${nextDef.regulatoryConsequence}.`,
      notificationType: 'Overdue case',
      severity: 'CRITICAL',
      category: 'MATURITY_ALERT',
      targetRole: 'SENIOR_APPROVING_OFFICER',
      institutionId: escCase.institutionId,
      relatedRecordId: escCase.fdrId,
    });
  };

  const handleOpenRegulatoryNotice = (escCase: EscalationCase) => {
    setPrefilledNewFdrNo(`${escCase.fdrNumber}-R2026`);
    setPrefilledNewAmount(escCase.principalAmount);
    setPrefilledNewMaturity('2034-10-30');
    setNoticeModalCase(escCase);
  };

  const handleSubmitPrefilledForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeModalCase) return;
    await submitRenewalOrReplacement({
      originalFdrId: noticeModalCase.fdrId,
      newFdrNumber: prefilledNewFdrNo,
      bankName: noticeModalCase.bankName,
      branchName: noticeModalCase.branchName,
      ifscCode: noticeModalCase.ifscCode,
      newAmount: Number(prefilledNewAmount) || noticeModalCase.principalAmount,
      newMaturityDate: prefilledNewMaturity,
      requestType:
        noticeModalCase.recommendedFormType === 'REPLACEMENT_FORM'
          ? 'Replacement'
          : 'Renewal',
      observations: `Submitted via Pre-Filled Regulatory Notice Form (${noticeModalCase.regulatoryNoticeRef}).`,
      documentName: `Prefilled_Statutory_${prefilledNewFdrNo}.pdf`,
    });
    setNoticeModalCase(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Module 3 · Automated Multi-Channel Reminders & Authority Escalation"
        title="Smart Escalation Ladder & Regulatory Notice Generator"
        subtitle="Automates deadline-based reminders across Email, SMS, and WhatsApp, escalates unresolved cases up the 5-tier AICTE authority hierarchy, and generates regulatory show-cause notices with pre-filled renewal or replacement forms."
      />

      {/* 5-Stage Visual Escalation Ladder */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {([1, 2, 3, 4, 5] as EscalationLevel[]).map((lvl) => {
          const def = ESCALATION_LEVEL_DEFINITIONS[lvl];
          const count = escalationCases.filter((c) => c.currentLevel === lvl).length;
          const isSelected = levelFilter === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(isSelected ? 'ALL' : lvl)}
              className={`text-left p-3.5 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-mono ${
                    isSelected
                      ? 'text-teal-400'
                      : lvl >= 4
                      ? 'text-rose-700'
                      : lvl === 3
                      ? 'text-amber-700'
                      : 'text-teal-700'
                  }`}
                >
                  STAGE L{lvl}
                </span>
                <span className="text-lg font-bold font-mono tabular-nums">{count}</span>
              </div>
              <div className="mt-1 text-xs font-semibold leading-snug">{def.title}</div>
              <div
                className={`mt-1 text-[11px] ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {def.authority}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split View: Escalation Cases + Multi-Channel & Notice Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Active Deadline & Discrepancy Escalation Queue
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any case to inspect Email/SMS/WhatsApp delivery receipts, escalate authority, or generate regulatory notice
              </p>
            </div>
            {levelFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setLevelFilter('ALL')}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Show All Levels ({escalationCases.length})
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Ladder Stage</th>
                  <th className="py-2.5 px-3">FDR & Institution</th>
                  <th className="py-2.5 px-3">Channels Sent</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredCases.map((c) => {
                  const isSelected = c.caseId === activeCase?.caseId;
                  return (
                    <tr
                      key={c.caseId}
                      onClick={() => setSelectedCaseId(c.caseId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div
                          className={`font-mono font-bold ${
                            c.currentLevel >= 4
                              ? 'text-rose-700'
                              : c.currentLevel === 3
                              ? 'text-amber-700'
                              : 'text-teal-700'
                          }`}
                        >
                          Level {c.currentLevel} / 5
                        </div>
                        <div className="text-[10px] text-slate-500">
                          SLA: {c.slaDeadlineHours}h
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {c.fdrNumber} · {formatINR(c.principalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-700 truncate max-w-[230px]">
                          {c.institutionName}
                        </div>
                        <div className="text-[10px] text-slate-500">{c.triggerReason}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                          <span>Email</span>
                          <span>·</span>
                          <span>SMS</span>
                          <span>·</span>
                          <span>WhatsApp</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.channelsDispatched.length} dispatches logged
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRegulatoryNotice(c);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 whitespace-nowrap"
                        >
                          Notice & Form
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Multi-Channel Automation & Authority Escalation Control Panel */}
        {activeCase && (
          <div className="xl:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] font-mono font-semibold text-teal-700">
                    {activeCase.regulatoryNoticeRef}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeCase.institutionName}
                  </h3>
                  <p className="text-xs text-slate-600">
                    FDR: <span className="font-mono font-semibold">{activeCase.fdrNumber}</span> ·{' '}
                    {activeCase.bankName} · {formatINR(activeCase.principalAmount)}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 shrink-0">
                  STAGE L{activeCase.currentLevel}
                </span>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Current Authority:</span>{' '}
                  <span className="text-slate-900">{activeCase.assignedAuthority}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Escalation Trigger:</span>{' '}
                  <span className="text-slate-900">{activeCase.triggerReason}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Nodal Contacts:</span>{' '}
                  <span className="font-mono text-slate-800">
                    {activeCase.contactEmail} | {activeCase.contactPhone}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDispatchMultiChannel(activeCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Email + SMS + WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => handleEscalateToNextAuthority(activeCase)}
                  disabled={activeCase.currentLevel >= 5}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 disabled:opacity-50 whitespace-nowrap"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Escalate to Level {Math.min(5, activeCase.currentLevel + 1)} Authority
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRegulatoryNotice(activeCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate Regulatory Notice + Pre-Filled Form
                </button>
              </div>

              {/* Multi-Channel Delivery Log */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-900">
                  Multi-Channel Dispatch & Delivery Log (Email · SMS · WhatsApp)
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {activeCase.channelsDispatched.map((d) => (
                    <div
                      key={d.dispatchId}
                      className="p-2.5 rounded border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          {d.channel === 'EMAIL' ? (
                            <Mail className="w-3.5 h-3.5 text-teal-700" />
                          ) : d.channel === 'SMS' ? (
                            <Phone className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                          <span>{d.channel}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ({d.recipient})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                          {d.status} · {d.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{d.messagePreview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Regulatory Notice + Pre-Filled Renewal/Replacement Form Modal */}
      <ModalDialog
        isOpen={Boolean(noticeModalCase)}
        onClose={() => setNoticeModalCase(null)}
        title={`Statutory Regulatory Notice & Pre-Filled ${
          noticeModalCase?.recommendedFormType === 'REPLACEMENT_FORM'
            ? 'Replacement'
            : 'Renewal'
        } Form`}
      >
        {noticeModalCase && (
          <form onSubmit={handleSubmitPrefilledForm} className="space-y-4 text-xs">
            <div className="p-4 rounded border border-slate-300 bg-slate-50 space-y-2 font-serif text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 font-sans">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 · Financial Scrutiny Bureau
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div>Ref: {noticeModalCase.regulatoryNoticeRef}</div>
                  <div>Date: 30 Oct 2026</div>
                </div>
              </div>

              <div className="pt-1 font-sans space-y-1.5">
                <div className="font-bold text-slate-900">
                  SUBJECT: STATUTORY LEVEL-{noticeModalCase.currentLevel} ESCALATION NOTICE FOR SECURITY DEPOSIT FDR {noticeModalCase.fdrNumber}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Whereas <strong>{noticeModalCase.institutionName}</strong> (AICTE Permanent ID:{' '}
                  <strong>{noticeModalCase.aictePermanentId}</strong>) pledged Fixed Deposit Receipt{' '}
                  <strong>{noticeModalCase.fdrNumber}</strong> of{' '}
                  <strong>{formatINR(noticeModalCase.principalAmount)}</strong> drawn on{' '}
                  <strong>{noticeModalCase.bankName}</strong> ({noticeModalCase.ifscCode}); and whereas the
                  automated statutory monitor logged: <em>{noticeModalCase.triggerReason}</em>.
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The Institution is hereby directed under AICTE Approval Process Handbook norms to execute the pre-filled{' '}
                  <strong>
                    {noticeModalCase.recommendedFormType === 'REPLACEMENT_FORM'
                      ? 'Replacement FDR Endorsement Form'
                      : '8-Year Statutory FDR Renewal Form'}
                  </strong>{' '}
                  below within {noticeModalCase.slaDeadlineHours} hours.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
              <div className="text-xs font-bold text-teal-800">
                Pre-Filled Statutory {noticeModalCase.recommendedFormType === 'REPLACEMENT_FORM' ? 'Replacement' : 'Renewal'} Schedule (Auto-Populated from Registry)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Institution & AICTE ID (Pre-Filled)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${noticeModalCase.institutionName} (${noticeModalCase.aictePermanentId})`}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Original Linked FDR Number (Pre-Filled)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${noticeModalCase.fdrNumber} (${noticeModalCase.fdrId})`}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Issuing Scheduled Bank & IFSC (Pre-Filled)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${noticeModalCase.bankName} — ${noticeModalCase.ifscCode}`}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    New Renewed / Replacement FDR Serial Number
                  </label>
                  <input
                    type="text"
                    required
                    value={prefilledNewFdrNo}
                    onChange={(e) => setPrefilledNewFdrNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Principal Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={prefilledNewAmount}
                    onChange={(e) => setPrefilledNewAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    New Statutory Maturity Date (8-Year Lock-In)
                  </label>
                  <input
                    type="date"
                    required
                    value={prefilledNewMaturity}
                    onChange={(e) => setPrefilledNewMaturity(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Official Regulatory Notice
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNoticeModalCase(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800"
                >
                  Execute & Submit Pre-Filled Form
                </button>
              </div>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 4. TAMPER-PROOF LIFECYCLE LEDGER + NATURAL-LANGUAGE QUERY (/admin/tamper-ledger)
// ============================================================================
export const AdminTamperProofLedgerPage: React.FC = () => {
  const {
    auditLogs,
    fdrs,
    institutions,
    discrepancies,
    getRemainingDays,
    setSelectedFdrForDrawer,
    showToast,
  } = useData();

  const [nlqInput, setNlqInput] = useState(
    'Show all SBI FDRs maturing within 30 days or having discrepancies'
  );
  const [tamperedOverrides, setTamperedOverrides] = useState<
    Record<string, { tamperedSummary?: string; tamperedNewValue?: string }>
  >({});
  const [isRunningGeminiNlq, setIsRunningGeminiNlq] = useState(false);
  const [geminiNlqInsight, setGeminiNlqInsight] = useState<{
    interpretedIntent: string;
    structuredSqlPreview: string;
    analyticalSynthesis: string;
  } | null>(null);

  const ledgerBlocks = useMemo(
    () => buildHashChainedLedger(auditLogs, tamperedOverrides),
    [auditLogs, tamperedOverrides]
  );

  const nlqOutput = useMemo(
    () =>
      executeNaturalLanguageQuery(
        nlqInput,
        fdrs,
        institutions,
        discrepancies,
        ledgerBlocks,
        getRemainingDays
      ),
    [nlqInput, fdrs, institutions, discrepancies, ledgerBlocks, getRemainingDays]
  );

  const isChainIntact = useMemo(
    () => ledgerBlocks.every((b) => b.integrityStatus === 'VERIFIED_INTACT'),
    [ledgerBlocks]
  );

  const handleSimulateTamperAttack = () => {
    // Pick a middle block in the chain so downstream cascade is clearly visible
    const targetBlock = ledgerBlocks[Math.min(4, ledgerBlocks.length - 1)];
    if (!targetBlock) return;
    setTamperedOverrides({
      [targetBlock.logId]: {
        tamperedNewValue: '₹99,00,000 (UNAUTHORIZED DIRECT DB MUTATION)',
        tamperedSummary: `[TAMPERED PAYLOAD] Unauthorized edit injected into historical record ${targetBlock.targetId} bypassing workflow.`,
      },
    });
    showToast(
      'Simulated Record Tampering Detected',
      `Block #${targetBlock.blockIndex} (${targetBlock.logId}) SHA-256 seal broken! Downstream hash chain invalidated.`,
      'error'
    );
  };

  const handleRestoreChainIntegrity = () => {
    setTamperedOverrides({});
    showToast(
      'Cryptographic Chain Restored',
      'Re-verified all SHA-256 block hashes against sealed Merkle roots.',
      'success'
    );
  };

  const handleRunGeminiNlq = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsRunningGeminiNlq(true);
    try {
      const response = await fetch('/api/gemini/nlq-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nlqInput,
          sampleStats: {
            matchedCount: nlqOutput.results.length,
            parsedIntent: nlqOutput.parsedIntent,
            filters: nlqOutput.interpretedFilters,
          },
        }),
      });
      if (!response.ok) throw new Error('Fallback');
      const data = await response.json();
      if (data?.nlqAnalysis) {
        setGeminiNlqInsight(data.nlqAnalysis);
        showToast('Natural-Language Query Executed', `Found ${nlqOutput.results.length} matching records.`);
        return;
      }
      throw new Error('Fallback');
    } catch {
      setGeminiNlqInsight({
        interpretedIntent: nlqOutput.parsedIntent,
        structuredSqlPreview: nlqOutput.sqlEquivalent,
        analyticalSynthesis: nlqOutput.executiveSummary,
      });
      showToast('Natural-Language Query Executed', `Found ${nlqOutput.results.length} matching records.`, 'info');
    } finally {
      setIsRunningGeminiNlq(false);
    }
  };

  const handleDownloadNlqCsv = () => {
    const headers = [
      'Record ID',
      'Type',
      'Primary Label',
      'Institution / Actor',
      'Bank / Module',
      'Amount / Metric',
      'Status',
      'Date',
    ];
    const csvRows = [
      headers.join(','),
      ...nlqOutput.results.map((r) =>
        [
          `"${r.recordId}"`,
          `"${r.recordType}"`,
          `"${r.primaryLabel.replace(/"/g, '""')}"`,
          `"${r.institutionName.replace(/"/g, '""')}"`,
          `"${r.bankOrModule.replace(/"/g, '""')}"`,
          `"${r.amountOrMetric.replace(/"/g, '""')}"`,
          `"${r.statusLabel}"`,
          `"${r.dateLabel}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AICTE_NLQ_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('NLQ Report Downloaded', `Exported ${nlqOutput.results.length} records to CSV.`);
  };

  const presetQueries = [
    'Show all SBI FDRs maturing within 30 days',
    'Find all critical or open discrepancies across institutions',
    'List institutions with non-compliant or at-risk status',
    'Show all FDRs above 35 lakhs pending verification',
    'Search audit ledger blocks for bank CBS verification',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Module 4 · Cryptographic SHA-256 Audit Chain & Natural-Language Search"
        title="Tamper-Proof Lifecycle Ledger & Natural-Language Query"
        subtitle="Maintains an immutable, hash-chained audit trail of every submission, verification, edit, and approval to immediately detect record tampering, paired with a natural-language query engine and downloadable reports."
        actions={
          <div className="flex items-center gap-2">
            {isChainIntact ? (
              <button
                type="button"
                onClick={handleSimulateTamperAttack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                Simulate Record Tamper Attack
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestoreChainIntegrity}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                Restore Cryptographic Ledger Integrity
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadNlqCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export NLQ Report (CSV)
            </button>
          </div>
        }
      />

      {/* Section A: Natural-Language Query (NLQ) Search & Report Engine */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Natural-Language Query (NLQ) & Instant Report Generator
            </h3>
            <p className="text-xs text-slate-500">
              Search FDRs, institutions, discrepancies, and hash-chained ledger blocks using plain English
            </p>
          </div>
          <span className="text-xs font-mono text-teal-700 font-semibold">
            {nlqOutput.results.length} Records Matched
          </span>
        </div>

        <form onSubmit={handleRunGeminiNlq} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={nlqInput}
              onChange={(e) => setNlqInput(e.target.value)}
              placeholder="Ask in plain English, e.g., 'Show all SBI FDRs maturing within 30 days above 35 lakhs'..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-600"
            />
          </div>
          <button
            type="submit"
            disabled={isRunningGeminiNlq}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isRunningGeminiNlq ? 'Analyzing Query...' : 'Execute Natural-Language Query'}
          </button>
        </form>

        {/* Preset Query Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 mr-1">Sample Queries:</span>
          {presetQueries.map((pq) => (
            <button
              key={pq}
              type="button"
              onClick={() => setNlqInput(pq)}
              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Parsed Intent & SQL Translation Strip */}
        <div className="p-3 rounded bg-slate-900 text-slate-200 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-teal-400">
              {geminiNlqInsight?.interpretedIntent || nlqOutput.parsedIntent}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Filters: {nlqOutput.interpretedFilters.join(' · ')}
            </span>
          </div>
          <div className="font-mono text-[11px] text-amber-300 overflow-x-auto">
            {geminiNlqInsight?.structuredSqlPreview || nlqOutput.sqlEquivalent}
          </div>
          <div className="text-xs text-slate-300 pt-1 border-t border-slate-800">
            {geminiNlqInsight?.analyticalSynthesis || nlqOutput.executiveSummary}
          </div>
        </div>

        {/* NLQ Results Table */}
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-200 rounded">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr className="text-[11px] font-semibold text-slate-600">
                <th className="py-2 px-3">Record ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Record Details</th>
                <th className="py-2 px-3">Institution / Actor</th>
                <th className="py-2 px-3">Bank / Module</th>
                <th className="py-2 px-3 text-right">Amount / Metric</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {nlqOutput.results.map((row) => (
                <tr
                  key={row.recordId}
                  onClick={() => {
                    if (row.fdrIdForDrawer) {
                      const found = fdrs.find((f) => f.fdrId === row.fdrIdForDrawer);
                      if (found) setSelectedFdrForDrawer(found);
                    }
                  }}
                  className={row.fdrIdForDrawer ? 'cursor-pointer hover:bg-slate-50' : ''}
                >
                  <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                    {row.recordId}
                  </td>
                  <td className="py-2 px-3 text-[11px] font-mono text-teal-700">
                    {row.recordType}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-slate-900">{row.primaryLabel}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[260px]">
                      {row.secondaryLabel}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-700">{row.institutionName}</td>
                  <td className="py-2 px-3 text-slate-600">{row.bankOrModule}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                    {row.amountOrMetric}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-slate-800">{row.statusLabel}</span>
                    <div className="text-[10px] text-slate-400">{row.dateLabel}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: Cryptographic Hash-Chained Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div
          className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${
            isChainIntact
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-rose-50 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isChainIntact ? (
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0" />
            )}
            <div>
              <h3
                className={`text-sm font-bold ${
                  isChainIntact ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {isChainIntact
                  ? `Cryptographic Hash-Chain Verified (${ledgerBlocks.length} Immutable Blocks)`
                  : 'CRITICAL SECURITY ALERT: Historical Record Tampering & Hash Chain Break Detected!'}
              </h3>
              <p className="text-xs text-slate-600">
                {isChainIntact
                  ? 'Every block hash (SHA-256) matches its sealed payload signature and links unbroken to Genesis Block #1.'
                  : 'An unauthorized modification altered a historical block payload, invalidating its SHA-256 hash and breaking all downstream previousBlockHash pointers.'}
              </p>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-700">
            Latest Head Hash: {ledgerBlocks[0]?.computedBlockHash.slice(0, 20)}...
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr className="text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Block #</th>
                <th className="py-2.5 px-3">Timestamp & Actor</th>
                <th className="py-2.5 px-3">Lifecycle Event & State Delta</th>
                <th className="py-2.5 px-3">Cryptographic Hash Chain (Prev → Current)</th>
                <th className="py-2.5 px-3 text-right">Chain Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ledgerBlocks.map((blk) => {
                const isTampered = blk.integrityStatus === 'TAMPER_DETECTED_AT_BLOCK';
                const isCascade = blk.integrityStatus === 'CHAIN_BROKEN_DOWNSTREAM';
                return (
                  <tr
                    key={blk.logId}
                    className={
                      isTampered
                        ? 'bg-rose-100/80'
                        : isCascade
                        ? 'bg-amber-50/70'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      #{String(blk.blockIndex).padStart(4, '0')}
                      <div className="text-[10px] font-normal text-slate-500">{blk.logId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{blk.actorName}</div>
                      <div className="text-[11px] text-slate-500">{blk.actorRole}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {formatDateShort(blk.timestamp)}
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-[340px]">
                      <div className="font-semibold text-slate-900">
                        {blk.action} · <span className="font-mono">{blk.targetId}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">{blk.summary}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Delta: [{blk.previousValue}] → [{blk.newValue}]
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="text-slate-500">
                        Prev: {blk.previousBlockHash.slice(0, 20)}...
                      </div>
                      <div
                        className={
                          isTampered
                            ? 'text-rose-700 font-bold'
                            : isCascade
                            ? 'text-amber-800 font-semibold'
                            : 'text-emerald-800 font-semibold'
                        }
                      >
                        Curr: {blk.computedBlockHash.slice(0, 20)}...
                      </div>
                      {isTampered && (
                        <div className="text-[10px] text-rose-700">
                          Expected Seal: {blk.sealedBlockHash.slice(0, 20)}...
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {blk.integrityStatus === 'VERIFIED_INTACT' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified Intact
                        </span>
                      ) : isTampered ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          TAMPERED BLOCK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Downstream Cascade Break
                        </span>
                      )}
                      <div className="text-[10px] font-mono text-slate-400">
                        Merkle: {blk.merkleRootFragment}
                      </div>
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
// 8. CROSS-INSTITUTION FRAUD GRAPH PAGE (/admin/fraud-graph)
// ============================================================================
export const AdminCrossInstitutionFraudGraphPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    documents,
    createDiscrepancyRecord,
    setSelectedFdrForDrawer,
    showToast,
  } = useData();

  const [injectedRings, setInjectedRings] = useState(0);
  const [frozenClusters, setFrozenClusters] = useState<string[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('FRAUD-RING-01');
  const [selectedNode, setSelectedNode] = useState<FraudGraphNode | null>(null);

  const graphData = useMemo(
    () =>
      buildCrossInstitutionFraudGraph(
        institutions,
        fdrs,
        documents,
        injectedRings,
        frozenClusters
      ),
    [institutions, fdrs, documents, injectedRings, frozenClusters]
  );

  const activeCluster: SuspiciousFraudCluster | undefined = useMemo(
    () =>
      graphData.clusters.find((c) => c.clusterId === selectedClusterId) ||
      graphData.clusters[0],
    [graphData, selectedClusterId]
  );

  const handleSimulateCrossInstitutionClone = () => {
    setInjectedRings((prev) => prev + 1);
    setSelectedClusterId('FRAUD-RING-04-LIVE');
    showToast(
      'Cross-Institution Cloned FDR Intercepted',
      'Graph correlation detected two institutions attempting to pledge the same underlying bank deposit serial.',
      'warning'
    );
  };

  const handleFreezeAndFlagCluster = async (cluster: SuspiciousFraudCluster) => {
    if (frozenClusters.includes(cluster.clusterId)) return;
    setFrozenClusters((prev) => [...prev, cluster.clusterId]);

    for (let i = 0; i < cluster.involvedFdrs.length; i++) {
      const fdrItem = cluster.involvedFdrs[i];
      const instItem = cluster.involvedInstitutions[i] || cluster.involvedInstitutions[0];
      await createDiscrepancyRecord({
        fdrId: fdrItem.fdrId,
        fdrNumber: fdrItem.fdrNumber,
        institutionId: instItem.institutionId,
        institutionName: instItem.institutionName,
        discrepancyType: 'Duplicate instrument',
        severity: 'Critical',
        assignedOfficer: 'Special Vigilance & Fraud Cell',
        description: `[Cross-Institution Fraud Graph ${cluster.clusterId}] ${cluster.forensicExplanation}`,
        expectedValue: 'Unique Single-Institution Pledged FDR',
        actualValue: cluster.sharedArtifact,
      });
    }

    showToast(
      'Fraud Cluster Frozen & Flagged',
      `Created Critical Discrepancy cases for all ${cluster.involvedInstitutions.length} linked institutions in ${cluster.clusterId}.`,
      'error'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Module 8 · Multi-Institution Entity Resolution & Collusion Detection"
        title="Cross-Institution Fraud Graph"
        subtitle="Builds a network graph connecting institutions, submitted FDR serial numbers, SHA-256 document fingerprints, and bank branches to identify identical or modified FDRs reused across multiple institutions."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateCrossInstitutionClone}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 whitespace-nowrap"
            >
              <Network className="w-3.5 h-3.5" />
              Simulate Cross-Institution Cloned FDR
            </button>
          </div>
        }
      />

      {/* Top Suspicious Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {graphData.clusters.map((cluster) => {
          const isSelected = cluster.clusterId === activeCluster?.clusterId;
          const isFrozen = cluster.status === 'CLUSTER_FROZEN_AND_FLAGGED';
          return (
            <div
              key={cluster.clusterId}
              onClick={() => setSelectedClusterId(cluster.clusterId)}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-mono font-bold ${
                    isSelected ? 'text-rose-400' : 'text-rose-700'
                  }`}
                >
                  {cluster.clusterId} · {cluster.severity}
                </span>
                <span className="text-xs font-mono">
                  {cluster.confidenceScore}% Match Confidence
                </span>
              </div>
              <h3 className="mt-1.5 text-xs font-bold leading-snug">{cluster.title}</h3>
              <p
                className={`mt-1 text-[11px] line-clamp-2 ${
                  isSelected ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {cluster.sharedArtifact}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span>
                  {cluster.involvedInstitutions.length} Institutions ·{' '}
                  {cluster.involvedFdrs.length} FDRs
                </span>
                <span
                  className={`font-semibold ${
                    isFrozen
                      ? 'text-emerald-400'
                      : isSelected
                      ? 'text-amber-300'
                      : 'text-rose-700'
                  }`}
                >
                  {isFrozen ? 'Frozen & Flagged' : 'Active Alert'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Interactive Network Graph Canvas + Cluster Forensic Dossier */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Interactive SVG Network Graph */}
        <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden text-slate-100">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-white">
                Interactive Cross-Institution Collusion & Reuse Network Topology
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any Institution, FDR Instrument, or Shared Fingerprint Hub node to inspect cross-institution links
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-sky-400 font-medium">■ Institution</span>
              <span className="text-amber-400 font-medium">● FDR Instrument</span>
              <span className="text-rose-400 font-medium">◆ Collusion Hub / Hash</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-slate-950 p-2">
            <svg
              viewBox="0 0 880 440"
              className="w-full h-[420px] select-none"
              role="img"
              aria-label="Cross-Institution Fraud Network Graph"
            >
              {/* Subtle Grid Lines */}
              <defs>
                <pattern
                  id="fraud-grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="880" height="440" fill="url(#fraud-grid)" />

              {/* Edges */}
              {graphData.edges.map((edge) => {
                const src = graphData.nodes.find((n) => n.id === edge.source);
                const tgt = graphData.nodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;
                const isSelectedCluster = src.clusterId === activeCluster?.clusterId;
                return (
                  <g key={edge.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={
                        edge.isSuspicious
                          ? isSelectedCluster
                            ? '#f43f5e'
                            : '#e11d48'
                          : '#38bdf8'
                      }
                      strokeWidth={isSelectedCluster ? 2.6 : 1.6}
                      strokeDasharray={edge.isSuspicious ? '6,4' : undefined}
                      opacity={isSelectedCluster ? 1 : 0.55}
                    />
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 5}
                      textAnchor="middle"
                      fill={edge.isSuspicious ? '#fda4af' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {edge.relationship}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {graphData.nodes.map((node) => {
                const isClusterFocused = node.clusterId === activeCluster?.clusterId;
                const isNodeSelected = selectedNode?.id === node.id;
                const fill =
                  node.nodeType === 'INSTITUTION'
                    ? '#0284c7'
                    : node.nodeType === 'FDR_INSTRUMENT' && !node.id.endsWith('-HUB')
                    ? '#d97706'
                    : '#e11d48';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => {
                      setSelectedClusterId(node.clusterId);
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer"
                  >
                    {isClusterFocused && (
                      <circle
                        r="28"
                        fill="none"
                        stroke={isNodeSelected ? '#2dd4bf' : fill}
                        strokeWidth="1.5"
                        opacity="0.5"
                      />
                    )}
                    <circle
                      r="20"
                      fill={fill}
                      stroke={isNodeSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth="2.5"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.nodeType === 'INSTITUTION'
                        ? 'INST'
                        : node.id.endsWith('-HUB')
                        ? 'HUB'
                        : 'FDR'}
                    </text>
                    <text
                      y="33"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {node.label}
                    </text>
                    <text y="45" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      {node.subLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Suspicious Cluster Forensic Investigation Panel */}
        {activeCluster && (
          <div className="xl:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-rose-700">
                    {activeCluster.clusterId} · {activeCluster.anomalyCategory.replace(/_/g, ' ')}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeCluster.title}
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-rose-700 shrink-0">
                  {activeCluster.confidenceScore}% Match
                </span>
              </div>

              <div className="p-3.5 rounded border border-rose-200 bg-rose-50/60 space-y-1.5">
                <div className="text-xs font-bold text-rose-950">
                  Shared / Colliding Artifact Across Institutions:
                </div>
                <div className="text-xs font-mono text-rose-900">
                  {activeCluster.sharedArtifact}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pt-1">
                  {activeCluster.forensicExplanation}
                </p>
              </div>

              {/* Involved Institutions & Reused FDRs */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">
                  Connected Institutions & Colliding FDR Submissions:
                </div>
                {activeCluster.involvedInstitutions.map((inst, idx) => {
                  const fdrItem =
                    activeCluster.involvedFdrs[idx] || activeCluster.involvedFdrs[0];
                  return (
                    <div
                      key={`${inst.institutionId}-${idx}`}
                      className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {inst.institutionName} ({inst.state})
                        </div>
                        <div className="text-[11px] font-mono text-slate-600">
                          Submitted FDR: {fdrItem.fdrNumber} · {fdrItem.bankName} ·{' '}
                          {formatINR(fdrItem.amount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const found = fdrs.find((f) => f.fdrId === fdrItem.fdrId);
                          if (found) setSelectedFdrForDrawer(found);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-white border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap"
                      >
                        Inspect FDR
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedNode && (
                <div className="p-3 rounded border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="font-bold text-slate-900">
                    Selected Graph Node: {selectedNode.label} ({selectedNode.nodeType})
                  </div>
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                      <span className="text-slate-500">{k}:</span>
                      <span className="font-mono text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFreezeAndFlagCluster(activeCluster)}
                  disabled={activeCluster.status === 'CLUSTER_FROZEN_AND_FLAGGED'}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-rose-700 rounded hover:bg-rose-800 disabled:bg-emerald-700 disabled:opacity-90 transition-colors"
                >
                  {activeCluster.status === 'CLUSTER_FROZEN_AND_FLAGGED'
                    ? 'Cluster Frozen & Critical Discrepancies Logged Across All Linked Institutions'
                    : 'Freeze Suspicious Cluster & Flag All Linked Institutions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
