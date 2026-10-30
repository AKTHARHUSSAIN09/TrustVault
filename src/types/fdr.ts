export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  AICTE_ADMIN = 'AICTE_ADMIN',
  AICTE_SCRUTINY_OFFICER = 'AICTE_SCRUTINY_OFFICER',
  SENIOR_APPROVING_OFFICER = 'SENIOR_APPROVING_OFFICER',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.AICTE_ADMIN]: 'AICTE Admin',
  [UserRole.AICTE_SCRUTINY_OFFICER]: 'Scrutiny Officer',
  [UserRole.SENIOR_APPROVING_OFFICER]: 'Senior Approving Officer',
  [UserRole.INSTITUTION_ADMIN]: 'Institution Admin',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:
    'Manage users, institutions, roles, system settings, view all records, and audit logs.',
  [UserRole.AICTE_ADMIN]:
    'View all institution records, manage FDRs, assign verification tasks, review discrepancies, monitor maturity, manage renewals, review releases, and generate reports.',
  [UserRole.AICTE_SCRUTINY_OFFICER]:
    'Review submitted FDRs, inspect uploaded documents, perform AI & bank verification, record observations, identify discrepancies, request additional documents, and forward cases.',
  [UserRole.SENIOR_APPROVING_OFFICER]:
    'Review forwarded cases and scrutiny observations, approve or reject eligible requests, sanction release/refund NOCs, and view approval history.',
  [UserRole.INSTITUTION_ADMIN]:
    'View only own institution data, submit new FDRs, upload documents, view verification results, submit renewals/replacements/releases, and receive notifications.',
};

export const ROLE_PERMISSIONS_MATRIX: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: [
    'MANAGE_USERS',
    'MANAGE_INSTITUTIONS',
    'MANAGE_ROLES',
    'CONFIGURE_SETTINGS',
    'VIEW_ALL_RECORDS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_FDRS',
    'PERFORM_SCRUTINY',
    'FINAL_APPROVAL',
  ],
  [UserRole.AICTE_ADMIN]: [
    'VIEW_ALL_RECORDS',
    'MANAGE_INSTITUTIONS',
    'MANAGE_FDRS',
    'ASSIGN_VERIFICATION',
    'REVIEW_DISCREPANCIES',
    'MONITOR_MATURITY',
    'MANAGE_RENEWALS',
    'REVIEW_RELEASES',
    'GENERATE_REPORTS',
    'VIEW_AUDIT_LOGS',
  ],
  [UserRole.AICTE_SCRUTINY_OFFICER]: [
    'VIEW_ALL_RECORDS',
    'REVIEW_SUBMITTED_FDRS',
    'INSPECT_DOCUMENTS',
    'PERFORM_SCRUTINY',
    'RECORD_OBSERVATIONS',
    'FLAG_DISCREPANCIES',
    'REQUEST_DOCUMENTS',
    'FORWARD_FOR_APPROVAL',
  ],
  [UserRole.SENIOR_APPROVING_OFFICER]: [
    'VIEW_ALL_RECORDS',
    'REVIEW_FORWARDED_CASES',
    'REVIEW_SCRUTINY_OBSERVATIONS',
    'FINAL_APPROVAL',
    'REVIEW_RELEASES',
    'GENERATE_REPORTS',
  ],
  [UserRole.INSTITUTION_ADMIN]: [
    'VIEW_OWN_INSTITUTION',
    'SUBMIT_FDR',
    'UPLOAD_DOCUMENTS',
    'SUBMIT_RENEWAL',
    'SUBMIT_REPLACEMENT',
    'SUBMIT_RELEASE_REQUEST',
    'TRACK_REQUESTS',
  ],
};

export const VALIDATION_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  MAX_ID_LEN: 128,
  MAX_SHORT_TEXT: 64,
  MAX_MEDIUM_TEXT: 128,
  MAX_NAME_TEXT: 256,
  MAX_ADDRESS_TEXT: 512,
  MAX_NOTES_TEXT: 1024,
} as const;

export function sanitizeString(val: string, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}

export function sanitizeId(val: string): string {
  const cleaned = (val || '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, VALIDATION_CONSTRAINTS.MAX_ID_LEN);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

export type AICTERegion =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'CENTRAL'
  | 'SOUTH_WEST'
  | 'NORTH_WEST'
  | 'SOUTH_CENTRAL';

export type InstitutionCategory =
  | 'ENGINEERING'
  | 'MANAGEMENT'
  | 'PHARMACY'
  | 'ARCHITECTURE'
  | 'MCA'
  | 'HOTEL_MANAGEMENT';

export type InstitutionType =
  | 'PRIVATE_SELF_FINANCED'
  | 'DEEMED_UNIVERSITY'
  | 'GOVT_AIDED'
  | 'AUTONOMOUS';

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'AT_RISK'
  | 'NON_COMPLIANT'
  | 'PENDING_SCRUTINY';

export type RegistrationStatus = 'Active' | 'Pending' | 'Deactivated';

export interface Institution {
  institutionId: string;
  aictePermanentId: string;
  name: string;
  state: string;
  district?: string;
  region: AICTERegion;
  category: InstitutionCategory;
  institutionType: InstitutionType;
  contactPerson?: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  registrationStatus?: RegistrationStatus;
  complianceStatus: ComplianceStatus;
  ownerUid: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export type FdrAdminStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Verification Pending'
  | 'Verified'
  | 'Active'
  | 'Discrepancy Found'
  | 'Rejected'
  | 'Expiring'
  | 'Matured'
  | 'Renewal Pending'
  | 'Renewed'
  | 'Release Requested'
  | 'Released';

export type FdrVerificationStatus =
  | 'Verification Pending'
  | 'Under Scrutiny'
  | 'Verified'
  | 'Discrepancy Found'
  | 'Rejected'
  | 'Forwarded to Senior Officer';

export type BankVerificationStatus =
  | 'NOT VERIFIED'
  | 'CBS BANK VERIFIED'
  | 'SIMULATED BANK CHECK'
  | 'BANK CONFIRMED'
  | 'BANK VERIFICATION FAILED'
  | 'MANUAL CONFIRMATION REQUIRED';

// Keep legacy FdrStatus union compatible while supporting full status lifecycle
export type FdrStatus =
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'VERIFIED_ACTIVE'
  | 'DISCREPANCY_RAISED'
  | 'MATURING_SOON'
  | 'MATURED'
  | 'RENEWAL_INITIATED'
  | 'RELEASE_REQUESTED'
  | 'RELEASED';

export type JointHolderStatus =
  | 'JOINT_WITH_AICTE'
  | 'SOLE_INSTITUTION'
  | 'UNDER_LIEN_VERIFICATION';

export interface FdrObservation {
  id: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  note: string;
}

export interface BankVerificationResult {
  bankName: string;
  fdrNumber: string;
  depositAmount: number;
  issueDate: string;
  maturityDate: string;
  verificationReference: string;
  timestamp: string;
  outcome:
    | 'Bank record matched'
    | 'Bank record mismatch'
    | 'Simulated match'
    | 'Simulated mismatch'
    | 'Unable to verify'
    | 'Manual verification required';
  remarks: string;
}

export interface FdrRecord {
  fdrId: string;
  fdrNumber: string;
  referenceNumber?: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  principalAmount: number;
  maturityAmount: number;
  interestRate: number;
  issueDate: string;
  maturityDate: string;
  beneficiaryName?: string;
  programCategory: string;
  depositCategory?: string;
  jointHolderStatus: JointHolderStatus;
  status: FdrStatus;
  adminStatus?: FdrAdminStatus;
  verificationStatus?: FdrVerificationStatus;
  bankVerificationStatus?: BankVerificationStatus;
  bankVerificationResult?: BankVerificationResult;
  assignedOfficer?: string;
  previousFdrId?: string;
  replacedByFdrId?: string;
  lineageStage?: 'Original FDR' | 'Renewal 1' | 'Replacement FDR' | 'Current Active Instrument';
  documentName: string;
  documentUrl: string;
  remarks: string;
  observations?: FdrObservation[];
  extractedData?: ExtractedFdrAssist;
  ownerUid: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory =
  | 'Original FDR'
  | 'Bank Confirmation'
  | 'Deposit Certificate'
  | 'Renewal Document'
  | 'Replacement FDR'
  | 'Release Supporting Document'
  | 'Other Supporting Document';

export interface DocumentVersion {
  versionNumber: number;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  notes: string;
}

export interface PortalDocument {
  documentId: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  category: DocumentCategory;
  fileName: string;
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: 'Pending' | 'Verified' | 'Discrepancy Flagged' | 'Replaced';
  currentVersion: number;
  versions: DocumentVersion[];
  previewUrl?: string;
}

export type DiscrepancyType =
  | 'Amount mismatch'
  | 'FDR number mismatch'
  | 'Bank mismatch'
  | 'Maturity date mismatch'
  | 'Missing information'
  | 'Duplicate instrument'
  | 'Document unreadable'
  | 'Potential document anomaly';

export type DiscrepancySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type DiscrepancyResolutionStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Clarification Requested'
  | 'Resolved'
  | 'Submission Rejected';

export interface DiscrepancyHistoryItem {
  id: string;
  actor: string;
  role: string;
  action: string;
  timestamp: string;
  remarks: string;
}

export interface DiscrepancyRecord {
  discrepancyId: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  discrepancyType: DiscrepancyType;
  severity: DiscrepancySeverity;
  detectionDate: string;
  assignedOfficer: string;
  resolutionStatus: DiscrepancyResolutionStatus;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  history: DiscrepancyHistoryItem[];
}

export interface RenewalRecord {
  renewalId: string;
  originalFdrId: string;
  originalFdrNumber: string;
  newFdrId: string;
  newFdrNumber: string;
  institutionId: string;
  institutionName: string;
  bankName: string;
  previousAmount: number;
  newAmount: number;
  previousMaturityDate: string;
  newMaturityDate: string;
  requestType: 'Renewal' | 'Replacement';
  status:
    | 'Submitted'
    | 'Under Scrutiny'
    | 'Additional Documents Requested'
    | 'Approved'
    | 'Rejected';
  submittedAt: string;
  reviewedBy?: string;
  observations: string;
  documentName: string;
}

export type ReleaseWorkflowStage =
  | 'SUBMITTED'
  | 'UNDER_DOCUMENT_REVIEW'
  | 'ELIGIBILITY_SCRUTINY'
  | 'PENDING_AUTHORITY_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASE_PROCESSING'
  | 'RELEASED'
  | 'COMPLETED'
  | 'MORE_INFO_REQUESTED'
  | 'ON_HOLD'
  | 'WITHDRAWN';

export interface ReleaseDecisionStep {
  id: string;
  stage: ReleaseWorkflowStage;
  officerName: string;
  officerRole: string;
  timestamp: string;
  action: string;
  remarks: string;
  reason?: string;
}

export interface ReleaseRefundRequest {
  requestId: string;
  referenceNo: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  bankName: string;
  depositAmount: number;
  issueDate: string;
  maturityDate: string;
  reason: string;
  supportingDocument: string;
  stage: ReleaseWorkflowStage;
  submittedAt: string;
  updatedAt: string;
  eligibilityCheck: {
    lockInCompleted: boolean;
    noActiveDiscrepancy: boolean;
    jointLienVerified: boolean;
  };
  timeline: ReleaseDecisionStep[];
}

export type SubmissionType =
  | 'NEW_FDR'
  | 'RENEWAL'
  | 'REPLACEMENT'
  | 'RELEASE_REFUND'
  | 'DISCREPANCY_RESPONSE';

export type SubmissionStatus =
  | 'SUBMITTED'
  | 'SCRUTINY_IN_PROGRESS'
  | 'DISCREPANCY_FLAGGED'
  | 'FORWARDED_TO_SENIOR'
  | 'APPROVED'
  | 'REJECTED';

export interface WorkflowSubmission {
  submissionId: string;
  referenceNo: string;
  submissionType: SubmissionType;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  amount: number;
  bankName: string;
  status: SubmissionStatus;
  assignedRole: 'AICTE_SCRUTINY_OFFICER' | 'SENIOR_APPROVING_OFFICER' | 'AICTE_ADMIN';
  notes: string;
  ownerUid: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  logId: string;
  actorUid: string;
  actorName?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  module: string;
  targetId: string;
  previousValue?: string;
  newValue?: string;
  summary: string;
  orgId: string;
  createdAt: string;
}

export type NotificationType =
  | 'New FDR submitted'
  | 'FDR verification completed'
  | 'Discrepancy found'
  | 'Additional documents requested'
  | 'Maturity approaching'
  | 'FDR matured'
  | 'Renewal required'
  | 'Renewal submitted'
  | 'Refund request submitted'
  | 'Refund request approved'
  | 'Refund request rejected'
  | 'Pending officer action'
  | 'Overdue case';

export interface PortalNotification {
  notificationId: string;
  title: string;
  message: string;
  notificationType?: NotificationType;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  category:
    | 'MATURITY_ALERT'
    | 'SCRUTINY_UPDATE'
    | 'DISCREPANCY'
    | 'RELEASE_APPROVAL'
    | 'SYSTEM';
  targetRole: string;
  institutionId?: string;
  relatedRecordId?: string;
  relatedPath?: string;
  recipientUid: string;
  readStatus: boolean;
  orgId: string;
  createdAt: string;
}

export interface SystemConfiguration {
  configId: string;
  organizationName?: string;
  bureauName?: string;
  headquartersAddress?: string;
  supportEmail?: string;
  maturityAlertWindowDays: number;
  reminderInterval15Days?: number;
  reminderInterval7Days?: number;
  defaultLockInYears: number;
  requireJointLienVerification: boolean;
  enableAutoDiscrepancyDetection?: boolean;
  enableEmailNotifications?: boolean;
  enableSmsAlerts?: boolean;
  allowedBankCategories: string;
  documentCategories?: string[];
  depositCategories?: string[];
  escalationSlaHours: number;
  portalMaintenanceBanner: string;
  updatedByUid: string;
  orgId: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  department: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  lastActivity?: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedFdrAssist {
  fdrNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  principalAmount: number;
  maturityAmount: number;
  interestRate: number;
  issueDate: string;
  maturityDate: string;
  institutionName: string;
  aictePermanentId: string;
  beneficiaryName?: string;
  jointHolderStatus: JointHolderStatus;
  extractionSummary: string;
  source?: 'GEMINI_API' | 'SIMULATED_DEMO';
  confidence?: number;
}
