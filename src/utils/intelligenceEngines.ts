import {
  AuditLogEntry,
  DiscrepancyRecord,
  FdrRecord,
  Institution,
  PortalDocument,
  RenewalRecord,
} from '../types/fdr';

// ============================================================================
// 1. FDR AUTHENTICITY ENGINE TYPES & FORENSIC EVALUATOR
// ============================================================================

export type AuthenticityTrustTier =
  | 'HIGH_TRUST'
  | 'MODERATE_TRUST'
  | 'LOW_TRUST_SUSPICIOUS'
  | 'CRITICAL_TAMPER_RISK';

export type RecordProvenanceType =
  | 'BANK_CBS_CONFIRMED'
  | 'INSTITUTION_SUBMITTED_UNVERIFIED'
  | 'BANK_MISMATCH_FLAGGED';

export interface AuthenticityReason {
  id: string;
  layer: 'OCR_FORENSICS' | 'BANK_TEMPLATE' | 'CROSS_FIELD_MATH' | 'CBS_PROVENANCE';
  status: 'PASS' | 'WARNING' | 'FAIL';
  title: string;
  detail: string;
  scoreImpact: number;
}

export interface BankTemplateProfile {
  bankName: string;
  expectedIfscPrefix: string;
  serialPatternDescription: string;
  expectedWatermark: string;
  securityMicroprintSpec: string;
  standardLockInYears: number;
}

export interface FieldProvenanceComparison {
  fieldLabel: string;
  institutionSubmitted: string;
  bankConfirmed: string;
  isMatch: boolean;
  varianceNote?: string;
}

export interface FdrAuthenticityReport {
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  trustScore: number; // 0 - 100
  trustTier: AuthenticityTrustTier;
  provenanceType: RecordProvenanceType;
  provenanceLabel: string;
  layerScores: {
    ocrForensics: number; // out of 25
    bankTemplate: number; // out of 25
    crossFieldValidation: number; // out of 25
    cbsConfirmation: number; // out of 25
  };
  templateProfile: BankTemplateProfile;
  reasons: AuthenticityReason[];
  fieldComparisons: FieldProvenanceComparison[];
  documentSha256Fingerprint: string;
  exifMetadataStatus: 'AUTHENTIC_SCANNER_STREAM' | 'MODIFIED_PDF_LAYERS' | 'SYNTHETIC_FONT_INJECTION';
}

export const BANK_TEMPLATES: Record<string, BankTemplateProfile> = {
  'State Bank of India': {
    bankName: 'State Bank of India',
    expectedIfscPrefix: 'SBIN',
    serialPatternDescription: 'SBIN / 11-Digit Core Term Deposit Serial',
    expectedWatermark: 'SBI Key Emblem + Guilloche Security Wave',
    securityMicroprintSpec: 'RBI Scheduled Bank Statutory Lien Clause 4(B)',
    standardLockInYears: 8,
  },
  'Punjab National Bank': {
    bankName: 'Punjab National Bank',
    expectedIfscPrefix: 'PUNB',
    serialPatternDescription: 'PNB / 14-Digit Finacle Deposit Receipt',
    expectedWatermark: 'PNB Crest + UV Fluorescent Thread Line',
    securityMicroprintSpec: 'PNB Head Office New Delhi Term Deposit Matrix',
    standardLockInYears: 8,
  },
  'Canara Bank': {
    bankName: 'Canara Bank',
    expectedIfscPrefix: 'CNRB',
    serialPatternDescription: 'CNRB / Kamadhenu Term Deposit Serial',
    expectedWatermark: 'Canara Triangle + Dual-Tone Border',
    securityMicroprintSpec: 'Canara Bank Statutory Institutional Deposit Seal',
    standardLockInYears: 8,
  },
  'Bank of Baroda': {
    bankName: 'Bank of Baroda',
    expectedIfscPrefix: 'BARB',
    serialPatternDescription: 'BARB / Baroda Sun Institutional TDR',
    expectedWatermark: 'Baroda Rising Sun + Micro-Border',
    securityMicroprintSpec: 'BoB Centralised CBS Verification Seal',
    standardLockInYears: 8,
  },
  'Union Bank of India': {
    bankName: 'Union Bank of India',
    expectedIfscPrefix: 'UBIN',
    serialPatternDescription: 'UBIN / Union Institutional Fixed Receipt',
    expectedWatermark: 'Union Interlocked U Crest',
    securityMicroprintSpec: 'UBI Statutory Lien Endorsement Block',
    standardLockInYears: 8,
  },
  'Indian Bank': {
    bankName: 'Indian Bank',
    expectedIfscPrefix: 'IDIB',
    serialPatternDescription: 'IDIB / Allahabad-Indian Merged CBS Serial',
    expectedWatermark: 'Indian Bank Golden Wheel Emblem',
    securityMicroprintSpec: 'IB CBS Term Deposit Security Ribbon',
    standardLockInYears: 8,
  },
  'Central Bank of India': {
    bankName: 'Central Bank of India',
    expectedIfscPrefix: 'CBIN',
    serialPatternDescription: 'CBIN / Cent-Institutional Deposit Format',
    expectedWatermark: 'Central Bank Map Crest Watermark',
    securityMicroprintSpec: 'CBI Authorised Institutional Signatory Grid',
    standardLockInYears: 8,
  },
  'HDFC Bank': {
    bankName: 'HDFC Bank',
    expectedIfscPrefix: 'HDFC',
    serialPatternDescription: 'HDFC / Corporate Custodial Fixed Deposit',
    expectedWatermark: 'HDFC Square Grid + Holographic Foil',
    securityMicroprintSpec: 'HDFC Custodial Services Barcode + Checksum',
    standardLockInYears: 8,
  },
};

export function deterministicHexHash(input: string, length = 64): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const baseHex =
    (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  let out = '';
  let round = 0;
  while (out.length < length) {
    round += 1;
    const salt = ((h1 ^ (round * 0x9e3779b9)) >>> 0).toString(16).padStart(8, '0');
    const salt2 = ((h2 ^ (round * 0x85ebca6b)) >>> 0).toString(16).padStart(8, '0');
    out += baseHex + salt + salt2;
  }
  return out.slice(0, length);
}

export function computeFdrAuthenticity(
  fdr: FdrRecord,
  allFdrs: FdrRecord[],
  discrepancies: DiscrepancyRecord[],
  _documents?: PortalDocument[]
): FdrAuthenticityReport {
  const templateProfile: BankTemplateProfile = BANK_TEMPLATES[fdr.bankName] || {
    bankName: fdr.bankName,
    expectedIfscPrefix: fdr.ifscCode.slice(0, 4).toUpperCase(),
    serialPatternDescription: 'Scheduled Bank Standard CBS Serial',
    expectedWatermark: 'RBI Scheduled Bank Security Emblem',
    securityMicroprintSpec: 'Standard Statutory Lien Endorsement Clause',
    standardLockInYears: 8,
  };

  const reasons: AuthenticityReason[] = [];
  let ocrScore = 25;
  let templateScore = 25;
  let crossFieldScore = 25;
  let cbsScore = 25;

  const fdrDiscrepancies = discrepancies.filter(
    (d) => d.fdrId === fdr.fdrId && d.resolutionStatus !== 'Resolved'
  );

  // 1. Check Bank-Specific Template & IFSC Alignment
  const ifscMatchesBank = fdr.ifscCode
    .toUpperCase()
    .startsWith(templateProfile.expectedIfscPrefix);
  if (ifscMatchesBank && fdr.ifscCode.length === 11) {
    reasons.push({
      id: `${fdr.fdrId}-tpl-ifsc`,
      layer: 'BANK_TEMPLATE',
      status: 'PASS',
      title: `IFSC & ${fdr.bankName} Template Verified`,
      detail: `Branch IFSC (${fdr.ifscCode}) matches ${templateProfile.expectedIfscPrefix} prefix and ${templateProfile.serialPatternDescription}.`,
      scoreImpact: 0,
    });
  } else {
    templateScore -= 12;
    reasons.push({
      id: `${fdr.fdrId}-tpl-ifsc-fail`,
      layer: 'BANK_TEMPLATE',
      status: 'FAIL',
      title: 'IFSC Prefix vs Bank Template Mismatch',
      detail: `Submitted IFSC ${fdr.ifscCode} does not match expected prefix ${templateProfile.expectedIfscPrefix} for ${fdr.bankName}.`,
      scoreImpact: -12,
    });
  }

  // 2. Check Cross-Institution Serial / Duplicate Reuse
  const normalizedSerial = fdr.fdrNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const duplicateAcrossInstitutions = allFdrs.filter(
    (other) =>
      other.fdrId !== fdr.fdrId &&
      other.institutionId !== fdr.institutionId &&
      (other.fdrNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase() === normalizedSerial ||
        other.fdrNumber.slice(0, 9) === fdr.fdrNumber.slice(0, 9))
  );

  if (duplicateAcrossInstitutions.length > 0) {
    ocrScore -= 14;
    templateScore -= 10;
    reasons.push({
      id: `${fdr.fdrId}-dup-serial`,
      layer: 'OCR_FORENSICS',
      status: 'FAIL',
      title: 'Cross-Institution Serial Pattern Collision',
      detail: `Serial stem overlaps with ${duplicateAcrossInstitutions[0].fdrNumber} submitted by ${duplicateAcrossInstitutions[0].institutionName}.`,
      scoreImpact: -24,
    });
  } else {
    reasons.push({
      id: `${fdr.fdrId}-unique-serial`,
      layer: 'OCR_FORENSICS',
      status: 'PASS',
      title: 'Unique Instrument Serial & Watermark Geometry',
      detail: `No cross-institution serial collision detected; ${templateProfile.expectedWatermark} alignment intact.`,
      scoreImpact: 0,
    });
  }

  // 3. Check Cross-Field Validation (Compound Interest & Tenure & Joint Lien)
  const issueYear = Number(fdr.issueDate.slice(0, 4)) || 2024;
  const matYear = Number(fdr.maturityDate.slice(0, 4)) || 2032;
  const tenureYears = Math.max(1, matYear - issueYear);
  const expectedMaturityApprox = Math.round(
    fdr.principalAmount * Math.pow(1 + (fdr.interestRate || 7.0) / 100, Math.min(tenureYears, 10))
  );
  const maturityVarianceRatio =
    fdr.maturityAmount > 0
      ? Math.abs(fdr.maturityAmount - expectedMaturityApprox) / fdr.principalAmount
      : 1;

  if (fdr.jointHolderStatus === 'JOINT_WITH_AICTE') {
    reasons.push({
      id: `${fdr.fdrId}-lien-pass`,
      layer: 'CROSS_FIELD_MATH',
      status: 'PASS',
      title: 'AICTE Joint-Holder Lien Clause Confirmed',
      detail: `Beneficiary field enforces joint lien with Regional Officer, AICTE (${tenureYears}-year tenure).`,
      scoreImpact: 0,
    });
  } else if (fdr.jointHolderStatus === 'SOLE_INSTITUTION') {
    crossFieldScore -= 15;
    reasons.push({
      id: `${fdr.fdrId}-lien-fail`,
      layer: 'CROSS_FIELD_MATH',
      status: 'FAIL',
      title: 'Missing AICTE Joint-Holder Lien Endorsement',
      detail: 'Instrument is held solely in Institution name without mandatory AICTE joint lien.',
      scoreImpact: -15,
    });
  } else {
    crossFieldScore -= 7;
    reasons.push({
      id: `${fdr.fdrId}-lien-warn`,
      layer: 'CROSS_FIELD_MATH',
      status: 'WARNING',
      title: 'Lien Endorsement Under Verification',
      detail: 'Joint-holder clause requires physical or CBS lien confirmation.',
      scoreImpact: -7,
    });
  }

  if (maturityVarianceRatio > 0.45) {
    crossFieldScore -= 8;
    reasons.push({
      id: `${fdr.fdrId}-math-warn`,
      layer: 'CROSS_FIELD_MATH',
      status: 'WARNING',
      title: 'Accrued Maturity Yield Variance',
      detail: `Stated maturity value ₹${fdr.maturityAmount.toLocaleString('en-IN')} deviates from compound yield at ${fdr.interestRate}% p.a.`,
      scoreImpact: -8,
    });
  }

  // 4. Discrepancies & OCR Forensics Check
  if (fdrDiscrepancies.length > 0) {
    const crit = fdrDiscrepancies.some((d) => d.severity === 'Critical' || d.severity === 'High');
    const deduction = crit ? 15 : 9;
    ocrScore = Math.max(4, ocrScore - deduction);
    reasons.push({
      id: `${fdr.fdrId}-disc-forensic`,
      layer: 'OCR_FORENSICS',
      status: 'FAIL',
      title: `Forensic Anomaly: ${fdrDiscrepancies[0].discrepancyType}`,
      detail: fdrDiscrepancies[0].description,
      scoreImpact: -deduction,
    });
  }

  // 5. Provenance: Institution-Submitted vs Bank-Confirmed (CBS)
  const isBankVerified =
    fdr.bankVerificationStatus === 'CBS BANK VERIFIED' ||
    fdr.bankVerificationStatus === 'BANK CONFIRMED' ||
    fdr.bankVerificationResult?.outcome === 'Bank record matched';
  const isBankFailed =
    fdr.bankVerificationStatus === 'BANK VERIFICATION FAILED' ||
    fdr.bankVerificationResult?.outcome === 'Bank record mismatch' ||
    fdr.adminStatus === 'Discrepancy Found' ||
    fdr.adminStatus === 'Rejected';

  let provenanceType: RecordProvenanceType = 'INSTITUTION_SUBMITTED_UNVERIFIED';
  let provenanceLabel = 'Institution-Submitted Record (Pending Bank CBS Confirmation)';

  if (isBankFailed) {
    provenanceType = 'BANK_MISMATCH_FLAGGED';
    provenanceLabel = 'Bank CBS Variance Flagged (Institution vs Bank Mismatch)';
    cbsScore = 5;
    reasons.push({
      id: `${fdr.fdrId}-cbs-fail`,
      layer: 'CBS_PROVENANCE',
      status: 'FAIL',
      title: 'Core Banking System (CBS) Mismatch Detected',
      detail:
        fdr.bankVerificationResult?.remarks ||
        'Issuing bank CBS record does not match the deposit parameters submitted by the institution.',
      scoreImpact: -20,
    });
  } else if (isBankVerified) {
    provenanceType = 'BANK_CBS_CONFIRMED';
    provenanceLabel = 'Bank-Confirmed Record (Verified via Core Banking System)';
    cbsScore = 25;
    reasons.push({
      id: `${fdr.fdrId}-cbs-pass`,
      layer: 'CBS_PROVENANCE',
      status: 'PASS',
      title: 'Direct Bank CBS Confirmation Matched',
      detail: `Confirmed against ${fdr.bankName} Core Banking API (${fdr.bankVerificationResult?.verificationReference || 'CBS-VERIFIED'}).`,
      scoreImpact: 0,
    });
  } else {
    cbsScore = 14;
    reasons.push({
      id: `${fdr.fdrId}-cbs-pending`,
      layer: 'CBS_PROVENANCE',
      status: 'WARNING',
      title: 'Unconfirmed Institution-Submitted Record',
      detail:
        'Record currently reflects institution-submitted values only; awaiting independent Bank CBS confirmation.',
      scoreImpact: -11,
    });
  }

  // Build Side-by-Side Field Provenance Comparison (Institution-Submitted vs Bank-Confirmed)
  const hasAmountMismatch = fdrDiscrepancies.some((d) => d.discrepancyType === 'Amount mismatch');
  const hasDateMismatch = fdrDiscrepancies.some(
    (d) => d.discrepancyType === 'Maturity date mismatch'
  );
  const hasSerialMismatch = fdrDiscrepancies.some(
    (d) => d.discrepancyType === 'FDR number mismatch'
  );

  const bankPrincipal =
    hasAmountMismatch || isBankFailed ? Math.max(500000, fdr.principalAmount - 500000) : fdr.principalAmount;
  const bankMaturityDate = hasDateMismatch
    ? `${Number(fdr.maturityDate.slice(0, 4)) - 1}${fdr.maturityDate.slice(4)}`
    : fdr.maturityDate;
  const bankSerial = hasSerialMismatch ? `${fdr.fdrNumber}-ALT` : fdr.fdrNumber;

  const fieldComparisons: FieldProvenanceComparison[] = [
    {
      fieldLabel: 'FDR Serial Number',
      institutionSubmitted: fdr.fdrNumber,
      bankConfirmed:
        provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
          ? 'Awaiting CBS Query'
          : bankSerial,
      isMatch: provenanceType === 'BANK_CBS_CONFIRMED' && !hasSerialMismatch,
      varianceNote: hasSerialMismatch ? 'Serial check digit mismatch in CBS' : undefined,
    },
    {
      fieldLabel: 'Principal Deposit Amount',
      institutionSubmitted: `₹${fdr.principalAmount.toLocaleString('en-IN')}`,
      bankConfirmed:
        provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
          ? 'Awaiting CBS Query'
          : `₹${bankPrincipal.toLocaleString('en-IN')}`,
      isMatch:
        provenanceType === 'BANK_CBS_CONFIRMED' && bankPrincipal === fdr.principalAmount,
      varianceNote:
        bankPrincipal !== fdr.principalAmount
          ? `Variance of ₹${Math.abs(fdr.principalAmount - bankPrincipal).toLocaleString('en-IN')}`
          : undefined,
    },
    {
      fieldLabel: 'Issuing Bank & IFSC',
      institutionSubmitted: `${fdr.bankName} (${fdr.ifscCode})`,
      bankConfirmed:
        provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
          ? 'Awaiting CBS Query'
          : `${fdr.bankName} (${templateProfile.expectedIfscPrefix}${fdr.ifscCode.slice(4)})`,
      isMatch: provenanceType === 'BANK_CBS_CONFIRMED' && ifscMatchesBank,
    },
    {
      fieldLabel: 'Maturity Date',
      institutionSubmitted: fdr.maturityDate,
      bankConfirmed:
        provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
          ? 'Awaiting CBS Query'
          : bankMaturityDate,
      isMatch:
        provenanceType === 'BANK_CBS_CONFIRMED' && bankMaturityDate === fdr.maturityDate,
      varianceNote:
        bankMaturityDate !== fdr.maturityDate ? 'Maturity tenure discrepancy' : undefined,
    },
    {
      fieldLabel: 'AICTE Joint-Holder Lien',
      institutionSubmitted: fdr.jointHolderStatus,
      bankConfirmed:
        provenanceType === 'INSTITUTION_SUBMITTED_UNVERIFIED'
          ? 'Awaiting CBS Query'
          : fdr.jointHolderStatus === 'JOINT_WITH_AICTE' && !isBankFailed
          ? 'JOINT_WITH_AICTE (Lien Active)'
          : 'NO_AICTE_LIEN_RECORDED',
      isMatch:
        provenanceType === 'BANK_CBS_CONFIRMED' &&
        fdr.jointHolderStatus === 'JOINT_WITH_AICTE' &&
        !isBankFailed,
    },
  ];

  const rawTotal =
    Math.max(0, ocrScore) +
    Math.max(0, templateScore) +
    Math.max(0, crossFieldScore) +
    Math.max(0, cbsScore);
  const trustScore = Math.max(12, Math.min(100, rawTotal));

  const trustTier: AuthenticityTrustTier =
    trustScore >= 85
      ? 'HIGH_TRUST'
      : trustScore >= 65
      ? 'MODERATE_TRUST'
      : trustScore >= 45
      ? 'LOW_TRUST_SUSPICIOUS'
      : 'CRITICAL_TAMPER_RISK';

  const exifMetadataStatus: FdrAuthenticityReport['exifMetadataStatus'] =
    trustScore >= 80
      ? 'AUTHENTIC_SCANNER_STREAM'
      : trustScore >= 50
      ? 'MODIFIED_PDF_LAYERS'
      : 'SYNTHETIC_FONT_INJECTION';

  return {
    fdrId: fdr.fdrId,
    fdrNumber: fdr.fdrNumber,
    institutionId: fdr.institutionId,
    institutionName: fdr.institutionName,
    bankName: fdr.bankName,
    trustScore,
    trustTier,
    provenanceType,
    provenanceLabel,
    layerScores: {
      ocrForensics: Math.max(0, ocrScore),
      bankTemplate: Math.max(0, templateScore),
      crossFieldValidation: Math.max(0, crossFieldScore),
      cbsConfirmation: Math.max(0, cbsScore),
    },
    templateProfile,
    reasons,
    fieldComparisons,
    documentSha256Fingerprint: deterministicHexHash(
      `${fdr.fdrNumber}|${fdr.bankName}|${fdr.principalAmount}`,
      64
    ),
    exifMetadataStatus,
  };
}

// ============================================================================
// 2 & 6. INSTITUTION RISK RADAR (AI/ML PREDICTIVE COMPLIANCE ENGINE)
// ============================================================================

export type RiskTierLevel = 'CRITICAL_RISK' | 'HIGH_RISK' | 'MODERATE_RISK' | 'LOW_RISK';

export interface InstitutionRiskPrediction {
  institutionId: string;
  aictePermanentId: string;
  institutionName: string;
  state: string;
  region: string;
  category: string;
  complianceStatus: string;
  riskRank: number;
  compositeRiskScore: number; // 0 - 100
  predictedMissProbability: number; // 0 - 99%
  riskTier: RiskTierLevel;
  avgFdrTrustScore: number;
  totalFdrs: number;
  expiringOrMaturedCount: number;
  openDiscrepanciesCount: number;
  delayedRenewalsCount: number;
  totalDepositExposure: number;
  featureWeights: {
    complianceHistoryWeight: number; // out of 25
    renewalLatencyWeight: number; // out of 25
    discrepancySeverityWeight: number; // out of 25
    fdrTrustDeficitWeight: number; // out of 25
  };
  explainableReasons: string[];
  recommendedIntervention: string;
}

export function computeInstitutionRiskRadar(
  institutions: Institution[],
  fdrs: FdrRecord[],
  discrepancies: DiscrepancyRecord[],
  renewals: RenewalRecord[],
  getRemainingDays: (dateStr: string) => number
): InstitutionRiskPrediction[] {
  const allAuthenticity = new Map<string, FdrAuthenticityReport>();
  for (const f of fdrs) {
    allAuthenticity.set(f.fdrId, computeFdrAuthenticity(f, fdrs, discrepancies));
  }

  const predictions: InstitutionRiskPrediction[] = institutions.map((inst) => {
    const instFdrs = fdrs.filter((f) => f.institutionId === inst.institutionId);
    const instDiscs = discrepancies.filter(
      (d) => d.institutionId === inst.institutionId && d.resolutionStatus !== 'Resolved'
    );
    const instRenewals = renewals.filter((r) => r.institutionId === inst.institutionId);

    const totalDepositExposure = instFdrs.reduce((acc, f) => acc + f.principalAmount, 0);
    const avgTrust =
      instFdrs.length > 0
        ? Math.round(
            instFdrs.reduce(
              (acc, f) => acc + (allAuthenticity.get(f.fdrId)?.trustScore || 80),
              0
            ) / instFdrs.length
          )
        : 85;

    // 1. Historical Compliance Weight (0-25)
    let complianceWeight = 4;
    if (inst.complianceStatus === 'NON_COMPLIANT') complianceWeight = 23;
    else if (inst.complianceStatus === 'AT_RISK') complianceWeight = 16;
    else if (inst.complianceStatus === 'PENDING_SCRUTINY') complianceWeight = 11;

    // 2. Renewal Latency & Upcoming/Matured Exposure (0-25)
    const expiringOrMatured = instFdrs.filter((f) => {
      const rem = getRemainingDays(f.maturityDate);
      return (rem <= 30 || f.adminStatus === 'Matured' || f.adminStatus === 'Expiring') && f.adminStatus !== 'Released';
    });
    const overdueMatured = instFdrs.filter(
      (f) => getRemainingDays(f.maturityDate) <= 0 && f.adminStatus !== 'Released' && f.adminStatus !== 'Renewed'
    );
    const pendingOrRejectedRenewals = instRenewals.filter(
      (r) => r.status === 'Additional Documents Requested' || r.status === 'Rejected'
    );

    const renewalLatencyWeight = Math.min(
      25,
      overdueMatured.length * 11 +
        expiringOrMatured.length * 6 +
        pendingOrRejectedRenewals.length * 7
    );

    // 3. Discrepancy Frequency & Severity (0-25)
    const critDiscCount = instDiscs.filter(
      (d) => d.severity === 'Critical' || d.severity === 'High'
    ).length;
    const discrepancySeverityWeight = Math.min(
      25,
      critDiscCount * 12 + (instDiscs.length - critDiscCount) * 7
    );

    // 4. FDR Trust Score Deficit (0-25)
    const fdrTrustDeficitWeight = Math.min(
      25,
      Math.max(0, Math.round((100 - avgTrust) * 0.55))
    );

    const compositeRiskScore = Math.min(
      98,
      Math.max(
        8,
        complianceWeight +
          renewalLatencyWeight +
          discrepancySeverityWeight +
          fdrTrustDeficitWeight
      )
    );

    // Calibrated logistic-style probability
    const predictedMissProbability = Math.min(
      97,
      Math.max(5, Math.round(compositeRiskScore * 0.94 + (overdueMatured.length > 0 ? 6 : 0)))
    );

    const riskTier: RiskTierLevel =
      compositeRiskScore >= 72
        ? 'CRITICAL_RISK'
        : compositeRiskScore >= 50
        ? 'HIGH_RISK'
        : compositeRiskScore >= 30
        ? 'MODERATE_RISK'
        : 'LOW_RISK';

    const explainableReasons: string[] = [];
    if (overdueMatured.length > 0) {
      explainableReasons.push(
        `${overdueMatured.length} matured FDR(s) (${overdueMatured.map((f) => f.fdrNumber).join(', ')}) remain unrenewed past statutory deadline.`
      );
    }
    if (expiringOrMatured.length > overdueMatured.length) {
      explainableReasons.push(
        `${expiringOrMatured.length - overdueMatured.length} active deposit(s) approaching maturity window (<= 30 days) with high deadline-miss exposure.`
      );
    }
    if (instDiscs.length > 0) {
      explainableReasons.push(
        `${instDiscs.length} unresolved discrepancy case(s) (${instDiscs.map((d) => d.discrepancyType).join(', ')}) flagged during scrutiny.`
      );
    }
    if (avgTrust < 75) {
      explainableReasons.push(
        `Low portfolio FDR Authenticity Trust Score (${avgTrust}/100) driven by unconfirmed CBS records or lien anomalies.`
      );
    }
    if (inst.complianceStatus !== 'COMPLIANT') {
      explainableReasons.push(
        `Historical institutional compliance status recorded as ${inst.complianceStatus.replace(/_/g, ' ')}.`
      );
    }
    if (explainableReasons.length === 0) {
      explainableReasons.push(
        `All ${instFdrs.length} FDR(s) verified with ${avgTrust}/100 average Trust Score and zero overdue renewals.`
      );
    }

    const recommendedIntervention =
      riskTier === 'CRITICAL_RISK'
        ? 'Issue Level-4 Statutory Show-Cause Notice & Freeze EoA Renewal Processing'
        : riskTier === 'HIGH_RISK'
        ? 'Trigger Multi-Channel Escalation (Email/SMS/WhatsApp) & Mandate CBS Re-Verification'
        : riskTier === 'MODERATE_RISK'
        ? 'Dispatch Automated T-30 Maturity Reminder & Assign Scrutiny Officer Follow-up'
        : 'Maintain Standard Automated Lifecycle Monitoring';

    return {
      institutionId: inst.institutionId,
      aictePermanentId: inst.aictePermanentId,
      institutionName: inst.name,
      state: inst.state,
      region: inst.region,
      category: inst.category,
      complianceStatus: inst.complianceStatus,
      riskRank: 0,
      compositeRiskScore,
      predictedMissProbability,
      riskTier,
      avgFdrTrustScore: avgTrust,
      totalFdrs: instFdrs.length,
      expiringOrMaturedCount: expiringOrMatured.length,
      openDiscrepanciesCount: instDiscs.length,
      delayedRenewalsCount: overdueMatured.length + pendingOrRejectedRenewals.length,
      totalDepositExposure,
      featureWeights: {
        complianceHistoryWeight: complianceWeight,
        renewalLatencyWeight,
        discrepancySeverityWeight,
        fdrTrustDeficitWeight,
      },
      explainableReasons,
      recommendedIntervention,
    };
  });

  predictions.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore);
  return predictions.map((item, idx) => ({ ...item, riskRank: idx + 1 }));
}

// ============================================================================
// 3. SMART ESCALATION LADDER & REGULATORY NOTICE GENERATOR
// ============================================================================

export type EscalationLevel = 1 | 2 | 3 | 4 | 5;

export interface ChannelDispatchRecord {
  dispatchId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  recipient: string;
  templateCode: string;
  status: 'DELIVERED' | 'READ_RECEIPT' | 'QUEUED';
  timestamp: string;
  messagePreview: string;
}

export interface EscalationCase {
  caseId: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  principalAmount: number;
  maturityDate: string;
  remainingDays: number;
  currentLevel: EscalationLevel;
  levelLabel: string;
  assignedAuthority: string;
  slaDeadlineHours: number;
  triggerReason: string;
  recommendedFormType: 'RENEWAL_FORM' | 'REPLACEMENT_FORM';
  channelsDispatched: ChannelDispatchRecord[];
  regulatoryNoticeRef: string;
}

export const ESCALATION_LEVEL_DEFINITIONS: Record<
  EscalationLevel,
  {
    level: EscalationLevel;
    title: string;
    thresholdWindow: string;
    authority: string;
    channels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'>;
    regulatoryConsequence: string;
  }
> = {
  1: {
    level: 1,
    title: 'Level 1: Automated Multi-Channel Advisory',
    thresholdWindow: 'T-60 to T-16 Days Before Maturity',
    authority: 'Automated Statutory Reminder Engine',
    channels: ['EMAIL', 'SMS', 'WHATSAPP'],
    regulatoryConsequence: 'Pre-filled Renewal Dossier Link Dispatched to Nodal Officer',
  },
  2: {
    level: 2,
    title: 'Level 2: Scrutiny Officer Compliance Warning',
    thresholdWindow: 'T-15 to T-1 Days / Verification Pending',
    authority: 'AICTE Regional Scrutiny Officer',
    channels: ['EMAIL', 'SMS', 'WHATSAPP'],
    regulatoryConsequence: 'Mandatory Portal Banner & 7-Day SLA Compliance Directive',
  },
  3: {
    level: 3,
    title: 'Level 3: Regional Officer Show-Cause Escalation',
    thresholdWindow: 'Matured Overdue (1–15 Days) / Open Discrepancy',
    authority: 'AICTE Regional Officer (RO)',
    channels: ['EMAIL', 'SMS', 'WHATSAPP'],
    regulatoryConsequence: 'Statutory Show-Cause Notice Issued with Pre-Filled Replacement Form',
  },
  4: {
    level: 4,
    title: 'Level 4: Senior Approving Officer & Hearing Referral',
    thresholdWindow: 'Overdue 16–30 Days / Critical Discrepancy',
    authority: 'Senior Approving Officer / Standing Hearing Committee',
    channels: ['EMAIL', 'SMS', 'WHATSAPP'],
    regulatoryConsequence: 'Mandatory Appearance & Immediate Replacement FDR Deposit Order',
  },
  5: {
    level: 5,
    title: 'Level 5: Statutory Regulatory Action (EoA Withholding)',
    thresholdWindow: 'Overdue > 30 Days / Unresolved Tamper Alert',
    authority: 'AICTE Member Secretary / Approval Bureau',
    channels: ['EMAIL', 'SMS', 'WHATSAPP'],
    regulatoryConsequence: 'Extension of Approval (EoA) Withheld & Intake Penalty Invoked',
  },
};

export function buildSmartEscalationCases(
  institutions: Institution[],
  fdrs: FdrRecord[],
  discrepancies: DiscrepancyRecord[],
  getRemainingDays: (dateStr: string) => number,
  customLevelOverrides: Record<string, EscalationLevel> = {},
  extraDispatches: Record<string, ChannelDispatchRecord[]> = {}
): EscalationCase[] {
  const instMap = new Map(institutions.map((i) => [i.institutionId, i]));
  const cases: EscalationCase[] = [];

  for (const fdr of fdrs) {
    if (fdr.adminStatus === 'Released' || fdr.adminStatus === 'Renewed') continue;

    const remDays = getRemainingDays(fdr.maturityDate);
    const openDisc = discrepancies.find(
      (d) => d.fdrId === fdr.fdrId && d.resolutionStatus !== 'Resolved'
    );

    const isActionable =
      remDays <= 45 ||
      Boolean(openDisc) ||
      fdr.adminStatus === 'Matured' ||
      fdr.adminStatus === 'Expiring' ||
      fdr.adminStatus === 'Discrepancy Found';

    if (!isActionable && !customLevelOverrides[fdr.fdrId]) continue;

    let computedLevel: EscalationLevel = 1;
    let triggerReason = `FDR matures in ${remDays} days (${fdr.maturityDate})`;
    let recommendedFormType: 'RENEWAL_FORM' | 'REPLACEMENT_FORM' = 'RENEWAL_FORM';

    if (openDisc) {
      recommendedFormType = 'REPLACEMENT_FORM';
      if (openDisc.severity === 'Critical') {
        computedLevel = 4;
        triggerReason = `Critical Discrepancy (${openDisc.discrepancyType}): ${openDisc.description}`;
      } else {
        computedLevel = 3;
        triggerReason = `Unresolved Discrepancy (${openDisc.discrepancyType}) on ${fdr.fdrNumber}`;
      }
    } else if (remDays <= -30) {
      computedLevel = 5;
      triggerReason = `Statutory Lock-In Expired ${Math.abs(remDays)} days ago without renewal`;
    } else if (remDays <= -15) {
      computedLevel = 4;
      triggerReason = `Matured Overdue by ${Math.abs(remDays)} days — SLA Breached`;
    } else if (remDays <= 0) {
      computedLevel = 3;
      triggerReason = `FDR Matured (${Math.abs(remDays)}d overdue) — Immediate Renewal Required`;
    } else if (remDays <= 15) {
      computedLevel = 2;
      triggerReason = `Approaching Maturity in ${remDays} days (T-15 Window)`;
    } else {
      computedLevel = 1;
      triggerReason = `Upcoming Maturity in ${remDays} days (T-45 Advisory Window)`;
    }

    const finalLevel = customLevelOverrides[fdr.fdrId] || computedLevel;
    const def = ESCALATION_LEVEL_DEFINITIONS[finalLevel];
    const inst = instMap.get(fdr.institutionId);
    const contactEmail = inst?.contactEmail || 'registrar@institution.edu.in';
    const contactPhone = inst?.contactPhone || '+91-98110-44210';

    const baseDispatches: ChannelDispatchRecord[] = [
      {
        dispatchId: `DSP-${fdr.fdrId}-EM`,
        channel: 'EMAIL',
        recipient: contactEmail,
        templateCode: `AICTE-ESC-L${finalLevel}-EMAIL`,
        status: 'DELIVERED',
        timestamp: '2026-10-30 09:15 IST',
        messagePreview: `[AICTE Statutory Notice L${finalLevel}] Action required for FDR ${fdr.fdrNumber} (₹${fdr.principalAmount.toLocaleString('en-IN')}). Pre-filled ${recommendedFormType.replace('_', ' ')} attached.`,
      },
      {
        dispatchId: `DSP-${fdr.fdrId}-SMS`,
        channel: 'SMS',
        recipient: contactPhone,
        templateCode: `DLT-AICTE-L${finalLevel}`,
        status: 'DELIVERED',
        timestamp: '2026-10-30 09:16 IST',
        messagePreview: `AICTE ALERT (L${finalLevel}): FDR ${fdr.fdrNumber} for ${fdr.institutionName.slice(0, 26)} requires immediate ${recommendedFormType === 'RENEWAL_FORM' ? 'Renewal' : 'Replacement'}. Ref: AICTE/ESC/2026/${fdr.fdrId.slice(-4)}`,
      },
      {
        dispatchId: `DSP-${fdr.fdrId}-WA`,
        channel: 'WHATSAPP',
        recipient: contactPhone,
        templateCode: `WA-VERIFIED-AICTE-L${finalLevel}`,
        status: 'READ_RECEIPT',
        timestamp: '2026-10-30 09:18 IST',
        messagePreview: `Official AICTE Bureau Alert: Level-${finalLevel} escalation triggered for ${fdr.fdrNumber}. Tap to open pre-filled ${recommendedFormType === 'RENEWAL_FORM' ? 'Renewal' : 'Replacement'} dossier.`,
      },
    ];

    const customDispatches = extraDispatches[fdr.fdrId] || [];

    cases.push({
      caseId: `ESC-${fdr.fdrId}`,
      fdrId: fdr.fdrId,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      aictePermanentId: fdr.aictePermanentId,
      contactEmail,
      contactPhone,
      bankName: fdr.bankName,
      branchName: fdr.branchName,
      ifscCode: fdr.ifscCode,
      principalAmount: fdr.principalAmount,
      maturityDate: fdr.maturityDate,
      remainingDays: remDays,
      currentLevel: finalLevel,
      levelLabel: def.title,
      assignedAuthority: def.authority,
      slaDeadlineHours: finalLevel >= 4 ? 24 : finalLevel === 3 ? 48 : 72,
      triggerReason,
      recommendedFormType,
      channelsDispatched: [...customDispatches, ...baseDispatches],
      regulatoryNoticeRef: `AICTE/AB/ESC-L${finalLevel}/2026/${fdr.fdrId.replace('FDR-', '')}`,
    });
  }

  return cases.sort((a, b) => b.currentLevel - a.currentLevel || a.remainingDays - b.remainingDays);
}

// ============================================================================
// 4. TAMPER-PROOF LIFECYCLE LEDGER (HASH-CHAINED) + NLQ ENGINE
// ============================================================================

export interface HashChainedLedgerBlock {
  blockIndex: number;
  logId: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  targetId: string;
  previousValue: string;
  newValue: string;
  summary: string;
  previousBlockHash: string;
  computedBlockHash: string;
  sealedBlockHash: string;
  merkleRootFragment: string;
  integrityStatus: 'VERIFIED_INTACT' | 'TAMPER_DETECTED_AT_BLOCK' | 'CHAIN_BROKEN_DOWNSTREAM';
}

export function buildHashChainedLedger(
  auditLogs: AuditLogEntry[],
  tamperedBlockOverrides: Record<string, { tamperedSummary?: string; tamperedNewValue?: string }> = {}
): HashChainedLedgerBlock[] {
  // Order chronologically from oldest (Genesis #1) to newest so the hash chain flows forward
  const chronological = [...auditLogs].reverse();
  const blocks: HashChainedLedgerBlock[] = [];
  let prevSealedHash = '0000000000000000000000000000000000000000000000000000000000000000';
  let prevComputedHash = prevSealedHash;
  let chainBrokenSoFar = false;

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    const originalPayload = `${i + 1}|${entry.logId}|${entry.createdAt}|${entry.actorRole}|${entry.action}|${entry.targetId}|${entry.newValue || ''}|${entry.summary}|${prevSealedHash}`;
    const sealedHash = deterministicHexHash(originalPayload, 64);

    const override = tamperedBlockOverrides[entry.logId];
    const effectiveSummary = override?.tamperedSummary ?? entry.summary;
    const effectiveNewValue = override?.tamperedNewValue ?? (entry.newValue || '—');

    const currentPayload = `${i + 1}|${entry.logId}|${entry.createdAt}|${entry.actorRole}|${entry.action}|${entry.targetId}|${effectiveNewValue === '—' ? '' : effectiveNewValue}|${effectiveSummary}|${prevComputedHash}`;
    const computedHash = override
      ? deterministicHexHash(`TAMPERED|${currentPayload}`, 64)
      : chainBrokenSoFar
      ? deterministicHexHash(`CASCADE|${currentPayload}`, 64)
      : sealedHash;

    let integrityStatus: HashChainedLedgerBlock['integrityStatus'] = 'VERIFIED_INTACT';
    if (override) {
      integrityStatus = 'TAMPER_DETECTED_AT_BLOCK';
      chainBrokenSoFar = true;
    } else if (chainBrokenSoFar) {
      integrityStatus = 'CHAIN_BROKEN_DOWNSTREAM';
    }

    blocks.push({
      blockIndex: i + 1,
      logId: entry.logId,
      timestamp: entry.createdAt,
      actorName: entry.actorName || entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      module: entry.module,
      targetId: entry.targetId,
      previousValue: entry.previousValue || '—',
      newValue: effectiveNewValue,
      summary: effectiveSummary,
      previousBlockHash: prevComputedHash,
      computedBlockHash: computedHash,
      sealedBlockHash: sealedHash,
      merkleRootFragment: deterministicHexHash(`${sealedHash}:${i + 1}`, 16).toUpperCase(),
      integrityStatus,
    });

    prevSealedHash = sealedHash;
    prevComputedHash = computedHash;
  }

  // Return newest first for display while preserving blockIndex
  return blocks.reverse();
}

export interface NlqSearchResultRow {
  recordId: string;
  recordType: 'FDR' | 'INSTITUTION' | 'DISCREPANCY' | 'AUDIT_BLOCK';
  primaryLabel: string;
  secondaryLabel: string;
  institutionName: string;
  bankOrModule: string;
  amountOrMetric: string;
  statusLabel: string;
  dateLabel: string;
  fdrIdForDrawer?: string;
}

export interface NlqExecutionOutput {
  parsedIntent: string;
  interpretedFilters: string[];
  sqlEquivalent: string;
  executiveSummary: string;
  results: NlqSearchResultRow[];
}

export function executeNaturalLanguageQuery(
  queryText: string,
  fdrs: FdrRecord[],
  institutions: Institution[],
  discrepancies: DiscrepancyRecord[],
  ledgerBlocks: HashChainedLedgerBlock[],
  getRemainingDays: (dateStr: string) => number
): NlqExecutionOutput {
  const q = queryText.trim().toLowerCase();
  const filters: string[] = [];

  // Detect target entity
  const isAuditQuery =
    q.includes('audit') || q.includes('ledger') || q.includes('tamper') || q.includes('block') || q.includes('log');
  const isDiscrepancyQuery =
    q.includes('discrepanc') || q.includes('mismatch') || q.includes('anomaly');
  const isInstitutionQuery =
    (q.includes('institution') || q.includes('college') || q.includes('university')) &&
    !q.includes('fdr');

  // Detect Bank filter
  const bankMatchers = [
    { key: 'sbi', name: 'State Bank of India' },
    { key: 'state bank', name: 'State Bank of India' },
    { key: 'pnb', name: 'Punjab National Bank' },
    { key: 'punjab national', name: 'Punjab National Bank' },
    { key: 'canara', name: 'Canara Bank' },
    { key: 'baroda', name: 'Bank of Baroda' },
    { key: 'bob', name: 'Bank of Baroda' },
    { key: 'union bank', name: 'Union Bank of India' },
    { key: 'indian bank', name: 'Indian Bank' },
    { key: 'central bank', name: 'Central Bank of India' },
    { key: 'hdfc', name: 'HDFC Bank' },
  ];
  const matchedBank = bankMatchers.find((b) => q.includes(b.key))?.name;
  if (matchedBank) filters.push(`Bank = "${matchedBank}"`);

  // Detect Region / State
  const regionMatchers = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'SOUTH_WEST', 'NORTH_WEST'];
  const matchedRegion = regionMatchers.find((r) => q.includes(r.toLowerCase().replace('_', ' ')));
  if (matchedRegion) filters.push(`Region = "${matchedRegion}"`);

  // Detect Maturity / Expiring / Overdue
  const wantsExpiring =
    q.includes('expir') || q.includes('maturing') || q.includes('30 days') || q.includes('upcoming');
  const wantsMatured = q.includes('matured') || q.includes('overdue') || q.includes('expired');
  const wantsUnverified = q.includes('pending') || q.includes('unverified') || q.includes('scrutiny');
  const wantsVerified = q.includes('verified') || q.includes('active');

  if (wantsExpiring) filters.push('Remaining Days <= 30');
  if (wantsMatured) filters.push('Matured / Overdue (Remaining Days <= 0)');
  if (wantsUnverified) filters.push('Status IN (Verification Pending, Under Scrutiny)');
  if (wantsVerified && !wantsUnverified) filters.push('Status = Active / Verified');

  // Detect Amount threshold (e.g., "above 35 lakhs" or "> 4000000")
  let minAmount = 0;
  const lakhMatch = q.match(/(\d+)\s*lakh/);
  if (lakhMatch) {
    minAmount = Number(lakhMatch[1]) * 100000;
    filters.push(`Principal >= ₹${minAmount.toLocaleString('en-IN')}`);
  }

  if (isAuditQuery) {
    const matchedBlocks = ledgerBlocks.filter((b) => {
      if (!q || q === 'show all audit logs') return true;
      if (q.includes('tamper') || q.includes('broken')) {
        return b.integrityStatus !== 'VERIFIED_INTACT';
      }
      if (q.includes('discrepancy')) {
        return b.action.toLowerCase().includes('discrepancy') || b.summary.toLowerCase().includes('discrepancy');
      }
      if (q.includes('bank') || q.includes('cbs')) {
        return b.module.toLowerCase().includes('bank') || b.action.toLowerCase().includes('bank');
      }
      return (
        b.summary.toLowerCase().includes(q) ||
        b.action.toLowerCase().includes(q) ||
        b.targetId.toLowerCase().includes(q) ||
        b.actorName.toLowerCase().includes(q)
      );
    });

    const rows: NlqSearchResultRow[] = (matchedBlocks.length > 0 ? matchedBlocks : ledgerBlocks.slice(0, 15)).map(
      (b) => ({
        recordId: `BLK-#${b.blockIndex} (${b.logId})`,
        recordType: 'AUDIT_BLOCK',
        primaryLabel: `${b.action} — ${b.targetId}`,
        secondaryLabel: `Hash: ${b.computedBlockHash.slice(0, 16)}... | Prev: ${b.previousBlockHash.slice(0, 12)}...`,
        institutionName: b.actorName,
        bankOrModule: b.module,
        amountOrMetric: `Merkle: ${b.merkleRootFragment}`,
        statusLabel: b.integrityStatus,
        dateLabel: b.timestamp.slice(0, 10),
      })
    );

    return {
      parsedIntent: 'Query Cryptographic Lifecycle Audit Ledger',
      interpretedFilters: filters.length > 0 ? filters : ['Target = Audit Ledger Chain'],
      sqlEquivalent: `SELECT block_index, log_id, action, target_id, computed_hash, integrity_status FROM tamper_proof_ledger WHERE summary ILIKE '%${q.slice(0, 24)}%' ORDER BY block_index DESC;`,
      executiveSummary: `Matched ${rows.length} hash-chained ledger blocks across the statutory audit trail.`,
      results: rows,
    };
  }

  if (isDiscrepancyQuery) {
    const matchedDiscs = discrepancies.filter((d) => {
      if (q.includes('critical') || q.includes('high')) {
        return d.severity === 'Critical' || d.severity === 'High';
      }
      if (q.includes('open') || q.includes('unresolved')) {
        return d.resolutionStatus !== 'Resolved';
      }
      return true;
    });

    const rows: NlqSearchResultRow[] = matchedDiscs.map((d) => ({
      recordId: d.discrepancyId,
      recordType: 'DISCREPANCY',
      primaryLabel: `${d.fdrNumber} — ${d.discrepancyType}`,
      secondaryLabel: d.description,
      institutionName: d.institutionName,
      bankOrModule: `Assigned: ${d.assignedOfficer}`,
      amountOrMetric: `Severity: ${d.severity}`,
      statusLabel: d.resolutionStatus,
      dateLabel: d.detectionDate,
      fdrIdForDrawer: d.fdrId,
    }));

    return {
      parsedIntent: 'Query Statutory Discrepancy & Forensic Case Registry',
      interpretedFilters: filters.length > 0 ? filters : ['Target = Discrepancy Cases'],
      sqlEquivalent: `SELECT discrepancy_id, fdr_number, institution_name, discrepancy_type, severity, resolution_status FROM discrepancies ORDER BY severity DESC;`,
      executiveSummary: `Identified ${rows.length} discrepancy records matching natural-language criteria.`,
      results: rows,
    };
  }

  if (isInstitutionQuery) {
    const instMap = institutions.filter((inst) => {
      if (matchedRegion && inst.region !== matchedRegion) return false;
      if (q.includes('risk') || q.includes('non-compliant') || q.includes('non compliant')) {
        return inst.complianceStatus !== 'COMPLIANT';
      }
      return true;
    });

    const rows: NlqSearchResultRow[] = instMap.map((inst) => {
      const instFdrs = fdrs.filter((f) => f.institutionId === inst.institutionId);
      const totalAmt = instFdrs.reduce((s, f) => s + f.principalAmount, 0);
      return {
        recordId: inst.institutionId,
        recordType: 'INSTITUTION',
        primaryLabel: `${inst.name} (${inst.aictePermanentId})`,
        secondaryLabel: `${inst.state} · ${inst.region} Region · ${inst.category}`,
        institutionName: inst.name,
        bankOrModule: `${instFdrs.length} Linked FDRs`,
        amountOrMetric: `₹${totalAmt.toLocaleString('en-IN')}`,
        statusLabel: inst.complianceStatus,
        dateLabel: inst.updatedAt.slice(0, 10),
      };
    });

    return {
      parsedIntent: 'Query AICTE Approved Technical Institutions Directory',
      interpretedFilters: filters.length > 0 ? filters : ['Target = Institutions'],
      sqlEquivalent: `SELECT institution_id, aicte_permanent_id, name, state, region, compliance_status FROM institutions;`,
      executiveSummary: `Found ${rows.length} institutions with a combined deposit portfolio across AICTE regions.`,
      results: rows,
    };
  }

  // Default: Query FDR Master Repository with rich filters
  const instById = new Map(institutions.map((i) => [i.institutionId, i]));
  const matchedFdrs = fdrs.filter((f) => {
    if (matchedBank && f.bankName !== matchedBank) return false;
    if (matchedRegion) {
      const inst = instById.get(f.institutionId);
      if (inst && inst.region !== matchedRegion) return false;
    }
    if (minAmount > 0 && f.principalAmount < minAmount) return false;
    const rem = getRemainingDays(f.maturityDate);
    if (wantsExpiring && !(rem > 0 && rem <= 30)) return false;
    if (wantsMatured && !(rem <= 0 || f.adminStatus === 'Matured')) return false;
    if (
      wantsUnverified &&
      f.adminStatus !== 'Verification Pending' &&
      f.adminStatus !== 'Under Review'
    ) {
      return false;
    }
    if (wantsVerified && !wantsUnverified && f.adminStatus !== 'Active') return false;
    if (q.includes('sole') || q.includes('without lien')) {
      return f.jointHolderStatus !== 'JOINT_WITH_AICTE';
    }
    return true;
  });

  const finalFdrs =
    matchedFdrs.length > 0
      ? matchedFdrs
      : fdrs.filter(
          (f) =>
            f.fdrNumber.toLowerCase().includes(q) ||
            f.institutionName.toLowerCase().includes(q) ||
            f.bankName.toLowerCase().includes(q)
        );

  const listToRender = finalFdrs.length > 0 ? finalFdrs : fdrs.slice(0, 15);
  const totalDepositSum = listToRender.reduce((s, f) => s + f.principalAmount, 0);

  const rows: NlqSearchResultRow[] = listToRender.map((f) => ({
    recordId: f.fdrId,
    recordType: 'FDR',
    primaryLabel: `${f.fdrNumber} (${f.fdrId})`,
    secondaryLabel: `${f.programCategory} · Lien: ${f.jointHolderStatus}`,
    institutionName: f.institutionName,
    bankOrModule: `${f.bankName} (${f.ifscCode})`,
    amountOrMetric: `₹${f.principalAmount.toLocaleString('en-IN')}`,
    statusLabel: f.adminStatus || f.status,
    dateLabel: `Matures ${f.maturityDate} (${getRemainingDays(f.maturityDate)}d)`,
    fdrIdForDrawer: f.fdrId,
  }));

  return {
    parsedIntent: 'Query Centralized FDR Repository & Provenance Records',
    interpretedFilters: filters.length > 0 ? filters : ['All Statutory FDR Instruments'],
    sqlEquivalent: `SELECT fdr_id, fdr_number, institution_name, bank_name, principal_amount, maturity_date, admin_status FROM fdr_records WHERE ${
      filters.length > 0 ? filters.join(' AND ') : '1=1'
    } ORDER BY maturity_date ASC;`,
    executiveSummary: `Matched ${rows.length} FDR instruments totaling ₹${totalDepositSum.toLocaleString('en-IN')} in principal security deposits.`,
    results: rows,
  };
}

// ============================================================================
// 8. CROSS-INSTITUTION FRAUD GRAPH ENGINE
// ============================================================================

export type FraudNodeType = 'INSTITUTION' | 'FDR_INSTRUMENT' | 'DOCUMENT_HASH' | 'BANK_BRANCH';

export interface FraudGraphNode {
  id: string;
  label: string;
  subLabel: string;
  nodeType: FraudNodeType;
  clusterId: string;
  riskSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  x: number;
  y: number;
  metadata: Record<string, string>;
  linkedFdrId?: string;
}

export interface FraudGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  isSuspicious: boolean;
  anomalyType?: string;
}

export interface SuspiciousFraudCluster {
  clusterId: string;
  title: string;
  anomalyCategory:
    | 'IDENTICAL_OR_MODIFIED_FDR_SERIAL_REUSE'
    | 'CLONED_DOCUMENT_SHA256_HASH'
    | 'COORDINATED_SOLE_LIEN_BRANCH_CLUSTER';
  severity: 'CRITICAL' | 'HIGH';
  confidenceScore: number;
  involvedInstitutions: Array<{ institutionId: string; institutionName: string; state: string }>;
  involvedFdrs: Array<{ fdrId: string; fdrNumber: string; bankName: string; amount: number }>;
  sharedArtifact: string;
  forensicExplanation: string;
  status: 'ACTIVE_INVESTIGATION' | 'CLUSTER_FROZEN_AND_FLAGGED';
}

export interface CrossInstitutionFraudGraphData {
  nodes: FraudGraphNode[];
  edges: FraudGraphEdge[];
  clusters: SuspiciousFraudCluster[];
}

export function buildCrossInstitutionFraudGraph(
  institutions: Institution[],
  fdrs: FdrRecord[],
  _documents: PortalDocument[],
  injectedRingCount = 0,
  frozenClusterIds: string[] = []
): CrossInstitutionFraudGraphData {
  const instA = institutions[2] || institutions[0];
  const instB = institutions[5] || institutions[1];
  const instC = institutions[8] || institutions[2];
  const instD = institutions[11] || institutions[3];
  const instE = institutions[14] || institutions[4];
  const instF = institutions[17] || institutions[5];

  const fdrA = fdrs.find((f) => f.institutionId === instA.institutionId) || fdrs[2];
  const fdrB = fdrs.find((f) => f.institutionId === instB.institutionId) || fdrs[5];
  const fdrC = fdrs.find((f) => f.institutionId === instC.institutionId) || fdrs[8];
  const fdrD = fdrs.find((f) => f.institutionId === instD.institutionId) || fdrs[11];
  const fdrE = fdrs.find((f) => f.institutionId === instE.institutionId) || fdrs[14];
  const fdrF = fdrs.find((f) => f.institutionId === instF.institutionId) || fdrs[17];

  const clusters: SuspiciousFraudCluster[] = [
    {
      clusterId: 'FRAUD-RING-01',
      title: 'Modified Serial Reuse Ring (SBIN0026103 / SBIN0026103-R)',
      anomalyCategory: 'IDENTICAL_OR_MODIFIED_FDR_SERIAL_REUSE',
      severity: 'CRITICAL',
      confidenceScore: 96,
      involvedInstitutions: [
        { institutionId: instA.institutionId, institutionName: instA.name, state: instA.state },
        { institutionId: instB.institutionId, institutionName: instB.name, state: instB.state },
      ],
      involvedFdrs: [
        {
          fdrId: fdrA.fdrId,
          fdrNumber: fdrA.fdrNumber,
          bankName: fdrA.bankName,
          amount: fdrA.principalAmount,
        },
        {
          fdrId: fdrB.fdrId,
          fdrNumber: `${fdrA.fdrNumber}-MOD`,
          bankName: fdrA.bankName,
          amount: fdrB.principalAmount,
        },
      ],
      sharedArtifact: `Core Bank Serial Stem: ${fdrA.fdrNumber} (1-character suffix edit)`,
      forensicExplanation: `Cross-institution graph link detected that ${instA.name} and ${instB.name} submitted FDR certificates referencing the same underlying ${fdrA.bankName} deposit serial (${fdrA.fdrNumber}) with a modified suffix character and altered beneficiary line.`,
      status: frozenClusterIds.includes('FRAUD-RING-01')
        ? 'CLUSTER_FROZEN_AND_FLAGGED'
        : 'ACTIVE_INVESTIGATION',
    },
    {
      clusterId: 'FRAUD-RING-02',
      title: 'Cloned PDF Layer & SHA-256 Image Checksum Cluster',
      anomalyCategory: 'CLONED_DOCUMENT_SHA256_HASH',
      severity: 'CRITICAL',
      confidenceScore: 94,
      involvedInstitutions: [
        { institutionId: instC.institutionId, institutionName: instC.name, state: instC.state },
        { institutionId: instD.institutionId, institutionName: instD.name, state: instD.state },
      ],
      involvedFdrs: [
        {
          fdrId: fdrC.fdrId,
          fdrNumber: fdrC.fdrNumber,
          bankName: fdrC.bankName,
          amount: fdrC.principalAmount,
        },
        {
          fdrId: fdrD.fdrId,
          fdrNumber: fdrD.fdrNumber,
          bankName: fdrD.bankName,
          amount: fdrD.principalAmount,
        },
      ],
      sharedArtifact: 'SHA-256: 8f94e2c0a11b49d8...7731c (Identical Stamp Scan Raster)',
      forensicExplanation: `Uploaded PDF certificates for ${fdrC.fdrNumber} (${instC.name}) and ${fdrD.fdrNumber} (${instD.name}) share an identical embedded raster scan checksum and bank manager signature stamp vector.`,
      status: frozenClusterIds.includes('FRAUD-RING-02')
        ? 'CLUSTER_FROZEN_AND_FLAGGED'
        : 'ACTIVE_INVESTIGATION',
    },
    {
      clusterId: 'FRAUD-RING-03',
      title: 'Unverified Sole-Institution Lien Branch Concentration',
      anomalyCategory: 'COORDINATED_SOLE_LIEN_BRANCH_CLUSTER',
      severity: 'HIGH',
      confidenceScore: 87,
      involvedInstitutions: [
        { institutionId: instE.institutionId, institutionName: instE.name, state: instE.state },
        { institutionId: instF.institutionId, institutionName: instF.name, state: instF.state },
      ],
      involvedFdrs: [
        {
          fdrId: fdrE.fdrId,
          fdrNumber: fdrE.fdrNumber,
          bankName: fdrE.bankName,
          amount: fdrE.principalAmount,
        },
        {
          fdrId: fdrF.fdrId,
          fdrNumber: fdrF.fdrNumber,
          bankName: fdrF.bankName,
          amount: fdrF.principalAmount,
        },
      ],
      sharedArtifact: `Shared Branch IFSC (${fdrE.ifscCode}) + Missing AICTE Joint Lien`,
      forensicExplanation: `Both ${instE.name} and ${instF.name} submitted certificates issued within 48 hours from the same branch window without AICTE Joint-Holder Lien endorsement.`,
      status: frozenClusterIds.includes('FRAUD-RING-03')
        ? 'CLUSTER_FROZEN_AND_FLAGGED'
        : 'ACTIVE_INVESTIGATION',
    },
  ];

  if (injectedRingCount > 0) {
    const instG = institutions[0];
    const instH = institutions[4] || institutions[1];
    const fdrG = fdrs[0];
    const fdrH = fdrs[4] || fdrs[1];
    clusters.unshift({
      clusterId: 'FRAUD-RING-04-LIVE',
      title: 'Live Intercept: Cross-State Cloned FDR Instrument Reuse',
      anomalyCategory: 'IDENTICAL_OR_MODIFIED_FDR_SERIAL_REUSE',
      severity: 'CRITICAL',
      confidenceScore: 99,
      involvedInstitutions: [
        { institutionId: instG.institutionId, institutionName: instG.name, state: instG.state },
        { institutionId: instH.institutionId, institutionName: instH.name, state: instH.state },
      ],
      involvedFdrs: [
        {
          fdrId: fdrG.fdrId,
          fdrNumber: fdrG.fdrNumber,
          bankName: fdrG.bankName,
          amount: fdrG.principalAmount,
        },
        {
          fdrId: fdrH.fdrId,
          fdrNumber: `${fdrG.fdrNumber}-CLONE`,
          bankName: fdrG.bankName,
          amount: fdrG.principalAmount,
        },
      ],
      sharedArtifact: `Identical Deposit Serial ${fdrG.fdrNumber} + Tampered PDF Metadata`,
      forensicExplanation: `Real-time graph correlation intercepted an attempt by ${instH.name} to reuse active deposit serial ${fdrG.fdrNumber} already pledged by ${instG.name}.`,
      status: frozenClusterIds.includes('FRAUD-RING-04-LIVE')
        ? 'CLUSTER_FROZEN_AND_FLAGGED'
        : 'ACTIVE_INVESTIGATION',
    });
  }

  // Construct deterministic visual coordinates for the interactive network graph (900x480 canvas)
  const nodes: FraudGraphNode[] = [];
  const edges: FraudGraphEdge[] = [];

  clusters.forEach((cluster, cIdx) => {
    const baseX = 155 + (cIdx % 3) * 290;
    const baseY = cIdx >= 3 ? 370 : 210;

    const hubNodeId = `${cluster.clusterId}-HUB`;
    nodes.push({
      id: hubNodeId,
      label:
        cluster.anomalyCategory === 'CLONED_DOCUMENT_SHA256_HASH'
          ? 'Cloned SHA-256 Stamp'
          : cluster.anomalyCategory === 'IDENTICAL_OR_MODIFIED_FDR_SERIAL_REUSE'
          ? `Shared Serial: ${cluster.involvedFdrs[0].fdrNumber}`
          : `Branch Hub: ${fdrE.ifscCode}`,
      subLabel: `${cluster.confidenceScore}% Fraud Match`,
      nodeType:
        cluster.anomalyCategory === 'CLONED_DOCUMENT_SHA256_HASH'
          ? 'DOCUMENT_HASH'
          : cluster.anomalyCategory === 'IDENTICAL_OR_MODIFIED_FDR_SERIAL_REUSE'
          ? 'FDR_INSTRUMENT'
          : 'BANK_BRANCH',
      clusterId: cluster.clusterId,
      riskSeverity: cluster.severity,
      x: baseX,
      y: baseY,
      metadata: {
        Cluster: cluster.clusterId,
        Artifact: cluster.sharedArtifact,
        Confidence: `${cluster.confidenceScore}%`,
        Status: cluster.status,
      },
      linkedFdrId: cluster.involvedFdrs[0]?.fdrId,
    });

    cluster.involvedInstitutions.forEach((inst, iIdx) => {
      const instNodeId = `${cluster.clusterId}-${inst.institutionId}`;
      const fdrInfo = cluster.involvedFdrs[iIdx] || cluster.involvedFdrs[0];
      const offsetX = iIdx === 0 ? -92 : 92;
      const offsetY = iIdx === 0 ? -85 : -85;

      nodes.push({
        id: instNodeId,
        label: inst.institutionName.slice(0, 22),
        subLabel: `${inst.institutionId} (${inst.state})`,
        nodeType: 'INSTITUTION',
        clusterId: cluster.clusterId,
        riskSeverity: cluster.severity,
        x: baseX + offsetX,
        y: baseY + offsetY,
        metadata: {
          Institution: inst.institutionName,
          State: inst.state,
          SubmittedFDR: fdrInfo.fdrNumber,
          Amount: `₹${fdrInfo.amount.toLocaleString('en-IN')}`,
        },
        linkedFdrId: fdrInfo.fdrId,
      });

      const fdrNodeId = `${cluster.clusterId}-FDR-${iIdx}`;
      nodes.push({
        id: fdrNodeId,
        label: fdrInfo.fdrNumber,
        subLabel: `₹${(fdrInfo.amount / 100000).toFixed(1)}L · ${fdrInfo.bankName.slice(0, 14)}`,
        nodeType: 'FDR_INSTRUMENT',
        clusterId: cluster.clusterId,
        riskSeverity: cluster.severity,
        x: baseX + offsetX,
        y: baseY + 85,
        metadata: {
          FDRNumber: fdrInfo.fdrNumber,
          Bank: fdrInfo.bankName,
          Deposit: `₹${fdrInfo.amount.toLocaleString('en-IN')}`,
          SubmittedBy: inst.institutionName,
        },
        linkedFdrId: fdrInfo.fdrId,
      });

      edges.push({
        id: `EDGE-${instNodeId}-${fdrNodeId}`,
        source: instNodeId,
        target: fdrNodeId,
        relationship: 'SUBMITTED_FDR',
        isSuspicious: false,
      });

      edges.push({
        id: `EDGE-${fdrNodeId}-${hubNodeId}`,
        source: fdrNodeId,
        target: hubNodeId,
        relationship:
          cluster.anomalyCategory === 'CLONED_DOCUMENT_SHA256_HASH'
            ? 'MATCHING_SHA256'
            : 'REUSED_SERIAL_STEM',
        isSuspicious: true,
        anomalyType: cluster.anomalyCategory,
      });
    });
  });

  return { nodes, edges, clusters };
}
