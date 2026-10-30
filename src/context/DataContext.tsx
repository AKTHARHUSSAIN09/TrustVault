import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  AICTERegion,
  AuditLogEntry,
  BankVerificationResult,
  ComplianceStatus,
  DiscrepancyRecord,
  DiscrepancyResolutionStatus,
  DiscrepancySeverity,
  DiscrepancyType,
  DocumentCategory,
  FdrAdminStatus,
  FdrRecord,
  FdrStatus,
  FdrVerificationStatus,
  Institution,
  InstitutionCategory,
  InstitutionType,
  JointHolderStatus,
  NotificationType,
  PortalDocument,
  PortalNotification,
  RegistrationStatus,
  ReleaseRefundRequest,
  ReleaseWorkflowStage,
  RenewalRecord,
  SubmissionStatus,
  SubmissionType,
  SystemConfiguration,
  UserProfile,
  UserRole,
  WorkflowSubmission,
  sanitizeId,
  sanitizeString,
  VALIDATION_CONSTRAINTS,
} from '../types/fdr';
import {
  CompleteSeedDataset,
  generateDeterministicSeedData,
} from '../data/seedDataset';

const CENTRAL_STORE_KEY = 'aicte_fdr_central_store_v4';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

interface DataContextType {
  institutions: Institution[];
  fdrs: FdrRecord[];
  documents: PortalDocument[];
  discrepancies: DiscrepancyRecord[];
  renewals: RenewalRecord[];
  releases: ReleaseRefundRequest[];
  submissions: WorkflowSubmission[];
  auditLogs: AuditLogEntry[];
  notifications: PortalNotification[];
  users: UserProfile[];
  systemConfig: SystemConfiguration;
  simulatedToday: string;
  setSimulatedToday: (dateStr: string) => void;
  getRemainingDays: (maturityDateStr: string) => number;
  isLoadingData: boolean;
  isSeeding: boolean;
  toasts: ToastMessage[];
  showToast: (title: string, message: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
  selectedFdrForDrawer: FdrRecord | null;
  setSelectedFdrForDrawer: (fdr: FdrRecord | null) => void;

  // 1. Institution Actions
  createInstitution: (input: {
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
    complianceStatus?: ComplianceStatus;
  }) => Promise<string>;
  updateInstitutionDetails: (
    institutionId: string,
    updates: Partial<Institution>
  ) => Promise<void>;
  toggleInstitutionActivation: (institutionId: string) => Promise<void>;

  // 2. FDR Actions
  createFdrDeposit: (input: {
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
    documentName: string;
    documentUrl?: string;
    remarks: string;
    uploadedFiles?: Array<{ name: string; type: 'PDF' | 'JPG' | 'JPEG' | 'PNG'; size: string }>;
  }) => Promise<string>;
  updateFdrStatusAndRemarks: (
    fdr: FdrRecord,
    newStatus: FdrStatus,
    remarks: string,
    adminStatusOverride?: FdrAdminStatus,
    verificationStatusOverride?: FdrVerificationStatus
  ) => Promise<void>;
  updateFdrFields: (fdrId: string, updates: Partial<FdrRecord>) => Promise<void>;
  addFdrObservation: (fdrId: string, note: string) => Promise<void>;
  runBankVerificationSimulator: (
    fdrId: string,
    forcedOutcome?: BankVerificationResult['outcome']
  ) => Promise<BankVerificationResult>;

  // 3. Document Actions
  uploadPortalDocument: (input: {
    fdrId: string;
    fdrNumber: string;
    institutionId: string;
    institutionName: string;
    category: DocumentCategory;
    fileName: string;
    fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
    fileSize: string;
    notes?: string;
  }) => Promise<string>;
  replaceDocumentVersion: (
    documentId: string,
    newFileName: string,
    newFileSize: string,
    notes: string
  ) => Promise<void>;
  updateDocumentVerificationStatus: (
    documentId: string,
    status: PortalDocument['verificationStatus']
  ) => Promise<void>;

  // 4. Discrepancy Actions
  createDiscrepancyRecord: (input: {
    fdrId: string;
    fdrNumber: string;
    institutionId: string;
    institutionName: string;
    discrepancyType: DiscrepancyType;
    severity: DiscrepancySeverity;
    assignedOfficer: string;
    description: string;
    expectedValue?: string;
    actualValue?: string;
  }) => Promise<string>;
  updateDiscrepancyStatus: (
    discrepancyId: string,
    nextStatus: DiscrepancyResolutionStatus,
    remarks: string,
    assignedOfficer?: string
  ) => Promise<void>;

  // 5. Maturity Actions
  triggerMaturityReminders: (specificFdrId?: string) => Promise<number>;

  // 6. Renewal & Replacement Actions
  submitRenewalOrReplacement: (input: {
    originalFdrId: string;
    newFdrNumber: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
    newAmount: number;
    newMaturityDate: string;
    requestType: 'Renewal' | 'Replacement';
    observations: string;
    documentName: string;
  }) => Promise<string>;
  reviewRenewalRecord: (
    renewalId: string,
    decision: RenewalRecord['status'],
    observations: string
  ) => Promise<void>;

  // 7. Release & Refund Actions
  submitReleaseRequest: (input: {
    fdrId: string;
    reason: string;
    supportingDocument: string;
  }) => Promise<string>;
  advanceReleaseWorkflow: (
    requestId: string,
    nextStage: ReleaseWorkflowStage,
    actionLabel: string,
    remarks: string,
    reason?: string
  ) => Promise<void>;

  // 8. Legacy Workflow Submission Actions
  createWorkflowSubmission: (input: {
    submissionType: SubmissionType;
    fdrId: string;
    fdrNumber: string;
    institutionId: string;
    institutionName: string;
    amount: number;
    bankName: string;
    notes: string;
    assignedRole?: 'AICTE_SCRUTINY_OFFICER' | 'SENIOR_APPROVING_OFFICER' | 'AICTE_ADMIN';
  }) => Promise<string>;
  updateSubmissionStatus: (
    submission: WorkflowSubmission,
    newStatus: SubmissionStatus,
    notes: string,
    assignedRole?: 'AICTE_SCRUTINY_OFFICER' | 'SENIOR_APPROVING_OFFICER' | 'AICTE_ADMIN'
  ) => Promise<void>;

  // 9. Notifications
  markNotificationRead: (notification: PortalNotification) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  createAlertNotification: (input: {
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
  }) => Promise<void>;

  // 10. User & Role Management
  createDemoUser: (input: {
    displayName: string;
    email: string;
    role: UserRole;
    institutionId: string;
    institutionName: string;
    department: string;
  }) => Promise<void>;
  updateUserRoleAndStatus: (
    targetUser: UserProfile,
    role: UserRole,
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING',
    institutionId?: string,
    institutionName?: string
  ) => Promise<void>;

  // 11. System Settings & Demo Simulation Controls
  saveSystemConfiguration: (input: Partial<SystemConfiguration>) => Promise<void>;
  seedInitialStatutoryRecords: () => Promise<void>;
  resetDemoDataToSeed: () => Promise<void>;
  simulateSampleDiscrepancy: () => Promise<void>;
  simulateMaturityAlert: () => Promise<void>;
  simulateRenewalCase: () => Promise<void>;
  simulateReleaseWorkflowCase: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function loadOrSeedStore(): CompleteSeedDataset {
  try {
    const raw = localStorage.getItem(CENTRAL_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompleteSeedDataset;
      if (
        Array.isArray(parsed.institutions) &&
        parsed.institutions.length > 0 &&
        Array.isArray(parsed.fdrs) &&
        parsed.fdrs.length > 0
      ) {
        return parsed;
      }
    }
  } catch {
    // fallback to seed
  }
  const seeded = generateDeterministicSeedData();
  try {
    localStorage.setItem(CENTRAL_STORE_KEY, JSON.stringify(seeded));
  } catch {
    // ignore
  }
  return seeded;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, profile } = useAuth();
  const [store, setStore] = useState<CompleteSeedDataset>(() => loadOrSeedStore());
  const [simulatedToday, setSimulatedTodayState] = useState<string>('2026-10-30');
  const [isLoadingData] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedFdrForDrawer, setSelectedFdrForDrawer] = useState<FdrRecord | null>(null);

  // Persist every store update to localStorage so changes survive page reloads
  useEffect(() => {
    try {
      localStorage.setItem(CENTRAL_STORE_KEY, JSON.stringify(store));
    } catch {
      // ignore quota errors
    }
    // Keep drawer FDR synced if open
    if (selectedFdrForDrawer) {
      const updated = store.fdrs.find((f) => f.fdrId === selectedFdrForDrawer.fdrId);
      if (updated) {
        setSelectedFdrForDrawer(updated);
      }
    }
  }, [store]);

  const showToast = (
    title: string,
    message: string,
    tone: ToastMessage['tone'] = 'success'
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, title, message, tone }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setSimulatedToday = (dateStr: string) => {
    if (!dateStr) return;
    setSimulatedTodayState(dateStr);
    showToast(
      'Statutory Reference Date Updated',
      `Maturity calculations and remaining days are now evaluated against ${dateStr}.`,
      'info'
    );
  };

  const getRemainingDays = (maturityDateStr: string): number => {
    const ref = new Date(`${simulatedToday}T00:00:00Z`).getTime();
    const mat = new Date(`${maturityDateStr}T00:00:00Z`).getTime();
    if (Number.isNaN(ref) || Number.isNaN(mat)) return 0;
    return Math.round((mat - ref) / (1000 * 60 * 60 * 24));
  };

  const appendAuditAndNotification = (
    draft: CompleteSeedDataset,
    audit: {
      action: string;
      module: string;
      targetId: string;
      previousValue?: string;
      newValue?: string;
      summary: string;
    },
    notif?: {
      title: string;
      message: string;
      notificationType: NotificationType;
      severity: PortalNotification['severity'];
      category: PortalNotification['category'];
      targetRole?: string;
      institutionId?: string;
      relatedRecordId?: string;
    }
  ): CompleteSeedDataset => {
    const nowIso = new Date().toISOString();
    const newLog: AuditLogEntry = {
      logId: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUid: profile?.uid || 'demo_user',
      actorName: profile?.displayName || 'Authorized Officer',
      actorEmail: profile?.email || 'officer@aicte-india.org',
      actorRole: profile?.role || 'SUPER_ADMIN',
      action: audit.action,
      module: audit.module,
      targetId: audit.targetId,
      previousValue: audit.previousValue || '—',
      newValue: audit.newValue || '—',
      summary: audit.summary,
      orgId: 'AICTE',
      createdAt: nowIso,
    };

    const nextNotifications = [...draft.notifications];
    if (notif) {
      const newNotif: PortalNotification = {
        notificationId: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: notif.title,
        message: notif.message,
        notificationType: notif.notificationType,
        severity: notif.severity,
        category: notif.category,
        targetRole: notif.targetRole || 'ALL',
        institutionId: notif.institutionId,
        relatedRecordId: notif.relatedRecordId || audit.targetId,
        recipientUid: profile?.uid || 'demo_user',
        readStatus: false,
        orgId: 'AICTE',
        createdAt: nowIso,
      };
      nextNotifications.unshift(newNotif);
    }

    return {
      ...draft,
      auditLogs: [newLog, ...draft.auditLogs],
      notifications: nextNotifications,
    };
  };

  // 1. Institution Actions
  const createInstitution: DataContextType['createInstitution'] = async (input) => {
    const institutionId = `INST-${1001 + store.institutions.length}`;
    const nowIso = new Date().toISOString();
    const newInst: Institution = {
      institutionId,
      aictePermanentId: sanitizeString(input.aictePermanentId || '1-889900112', 64),
      name: sanitizeString(input.name, 256),
      state: sanitizeString(input.state, 128),
      district: sanitizeString(input.district || input.state, 128),
      region: input.region,
      category: input.category,
      institutionType: input.institutionType,
      contactPerson: sanitizeString(input.contactPerson || 'Institutional Registrar', 128),
      contactEmail: sanitizeString(input.contactEmail, 256),
      contactPhone: sanitizeString(input.contactPhone, 32),
      address: sanitizeString(input.address, 512),
      registrationStatus: input.registrationStatus || 'Active',
      complianceStatus: input.complianceStatus || 'COMPLIANT',
      ownerUid: sanitizeId(firebaseUser?.uid || profile?.uid || 'demo_user'),
      orgId: 'AICTE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          institutions: [newInst, ...prev.institutions],
        },
        {
          action: 'INSTITUTION_CREATED',
          module: 'Institution Management',
          targetId: institutionId,
          previousValue: 'Unregistered',
          newValue: `${newInst.name} (${newInst.registrationStatus})`,
          summary: `Registered AICTE institution ${newInst.name} (${newInst.aictePermanentId}) in ${newInst.state}.`,
        }
      )
    );

    showToast(
      'Institution Registered',
      `${newInst.name} (${newInst.aictePermanentId}) has been added to the directory.`
    );
    return institutionId;
  };

  const updateInstitutionDetails: DataContextType['updateInstitutionDetails'] = async (
    institutionId,
    updates
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const existing = prev.institutions.find((i) => i.institutionId === institutionId);
      const updatedList = prev.institutions.map((i) =>
        i.institutionId === institutionId ? { ...i, ...updates, updatedAt: nowIso } : i
      );
      return appendAuditAndNotification(
        { ...prev, institutions: updatedList },
        {
          action: 'INSTITUTION_UPDATED',
          module: 'Institution Management',
          targetId: institutionId,
          previousValue: existing?.name || institutionId,
          newValue: updates.name || existing?.name || 'Updated Profile',
          summary: `Updated profile details for institution ${existing?.name || institutionId}.`,
        }
      );
    });
    showToast('Institution Updated', `Saved updated details for ${institutionId}.`);
  };

  const toggleInstitutionActivation: DataContextType['toggleInstitutionActivation'] = async (
    institutionId
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.institutions.find((i) => i.institutionId === institutionId);
      if (!target) return prev;
      const nextReg: RegistrationStatus =
        target.registrationStatus === 'Deactivated' ? 'Active' : 'Deactivated';
      const nextComp: ComplianceStatus =
        nextReg === 'Deactivated' ? 'NON_COMPLIANT' : 'COMPLIANT';

      return appendAuditAndNotification(
        {
          ...prev,
          institutions: prev.institutions.map((i) =>
            i.institutionId === institutionId
              ? { ...i, registrationStatus: nextReg, complianceStatus: nextComp, updatedAt: nowIso }
              : i
          ),
        },
        {
          action: nextReg === 'Active' ? 'INSTITUTION_ACTIVATED' : 'INSTITUTION_DEACTIVATED',
          module: 'Institution Management',
          targetId: institutionId,
          previousValue: target.registrationStatus || 'Active',
          newValue: nextReg,
          summary: `Changed registration status of ${target.name} to ${nextReg}.`,
        }
      );
    });
    showToast('Registration Status Updated', `Updated activation status for ${institutionId}.`, 'info');
  };

  // 2. FDR Actions
  const createFdrDeposit: DataContextType['createFdrDeposit'] = async (input) => {
    const nextNum = 2026001 + store.fdrs.length;
    const fdrId = `FDR-${nextNum}`;
    const nowIso = new Date().toISOString();

    const newFdr: FdrRecord = {
      fdrId,
      fdrNumber: sanitizeString(input.fdrNumber, 64),
      referenceNumber: input.referenceNumber || `AICTE/SD/2026/${1000 + store.fdrs.length}`,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      aictePermanentId: input.aictePermanentId,
      bankName: input.bankName,
      branchName: input.branchName,
      ifscCode: input.ifscCode.toUpperCase(),
      principalAmount: Number(input.principalAmount) || 0,
      maturityAmount: Number(input.maturityAmount) || Math.round((Number(input.principalAmount) || 0) * 1.65),
      interestRate: Number(input.interestRate) || 7.1,
      issueDate: input.issueDate,
      maturityDate: input.maturityDate,
      beneficiaryName:
        input.beneficiaryName ||
        `Jointly: Principal ${input.institutionName} & Regional Officer AICTE`,
      programCategory: input.programCategory,
      depositCategory: input.depositCategory || 'New Institution Security Deposit',
      jointHolderStatus: input.jointHolderStatus,
      status: 'SUBMITTED',
      adminStatus: 'Verification Pending',
      verificationStatus: 'Verification Pending',
      bankVerificationStatus: 'NOT VERIFIED',
      assignedOfficer: 'Shri Arvind Kumar (Scrutiny Officer)',
      lineageStage: 'Original FDR',
      documentName: input.documentName || `${input.fdrNumber}_Certificate.pdf`,
      documentUrl: input.documentUrl || `/vault/fdr/${fdrId}.pdf`,
      remarks: input.remarks || 'Submitted via 4-Step FDR Submission Wizard.',
      observations: [
        {
          id: `obs_${Date.now()}`,
          authorName: profile?.displayName || 'Institution Representative',
          authorRole: profile?.role || 'INSTITUTION_ADMIN',
          timestamp: nowIso,
          note: input.remarks || 'Initial FDR submission completed.',
        },
      ],
      ownerUid: sanitizeId(firebaseUser?.uid || profile?.uid || 'demo_user'),
      orgId: 'AICTE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const uploadedDocs: PortalDocument[] = (
      input.uploadedFiles && input.uploadedFiles.length > 0
        ? input.uploadedFiles
        : [{ name: newFdr.documentName, type: 'PDF' as const, size: '460 KB' }]
    ).map((uf, idx) => ({
      documentId: `DOC-${Date.now()}-${idx}`,
      fdrId,
      fdrNumber: newFdr.fdrNumber,
      institutionId: newFdr.institutionId,
      institutionName: newFdr.institutionName,
      category: idx === 0 ? 'Original FDR' : 'Bank Confirmation',
      fileName: uf.name,
      fileType: uf.type,
      fileSize: uf.size,
      uploadedAt: nowIso,
      uploadedBy: profile?.displayName || newFdr.institutionName,
      verificationStatus: 'Pending',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          fileName: uf.name,
          fileSize: uf.size,
          uploadedAt: nowIso,
          uploadedBy: profile?.displayName || newFdr.institutionName,
          notes: 'Uploaded during new FDR submission.',
        },
      ],
    }));

    const newSub: WorkflowSubmission = {
      submissionId: `SUB-${Date.now()}`,
      referenceNo: newFdr.referenceNumber || `AICTE/FDR/2026/${Math.floor(10000 + Math.random() * 90000)}`,
      submissionType: 'NEW_FDR',
      fdrId,
      fdrNumber: newFdr.fdrNumber,
      institutionId: newFdr.institutionId,
      institutionName: newFdr.institutionName,
      amount: newFdr.principalAmount,
      bankName: newFdr.bankName,
      status: 'SUBMITTED',
      assignedRole: 'AICTE_SCRUTINY_OFFICER',
      notes: newFdr.remarks,
      ownerUid: newFdr.ownerUid,
      orgId: 'AICTE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          fdrs: [newFdr, ...prev.fdrs],
          documents: [...uploadedDocs, ...prev.documents],
          submissions: [newSub, ...prev.submissions],
        },
        {
          action: 'FDR_CREATED',
          module: 'FDR Submissions',
          targetId: fdrId,
          previousValue: 'Draft',
          newValue: `${newFdr.fdrNumber} (Verification Pending)`,
          summary: `Submitted new FDR ${newFdr.fdrNumber} (${newFdr.bankName}) for ₹${newFdr.principalAmount.toLocaleString('en-IN')} by ${newFdr.institutionName}.`,
        },
        {
          title: `New FDR submitted — ${newFdr.fdrNumber}`,
          message: `${newFdr.institutionName} submitted FDR ${newFdr.fdrNumber} (${newFdr.bankName}) of ₹${newFdr.principalAmount.toLocaleString('en-IN')} for verification.`,
          notificationType: 'New FDR submitted',
          severity: 'INFO',
          category: 'SCRUTINY_UPDATE',
          targetRole: 'AICTE_SCRUTINY_OFFICER',
          institutionId: newFdr.institutionId,
          relatedRecordId: fdrId,
        }
      )
    );

    showToast(
      'FDR Submitted Successfully',
      `Reference ID ${fdrId} (${newFdr.fdrNumber}) is now live in the repository.`
    );
    return fdrId;
  };

  const updateFdrStatusAndRemarks: DataContextType['updateFdrStatusAndRemarks'] = async (
    fdr,
    newStatus,
    remarks,
    adminStatusOverride,
    verificationStatusOverride
  ) => {
    const nowIso = new Date().toISOString();
    const mappedAdminStatus: FdrAdminStatus =
      adminStatusOverride ||
      (newStatus === 'VERIFIED_ACTIVE'
        ? 'Active'
        : newStatus === 'DISCREPANCY_RAISED'
        ? 'Discrepancy Found'
        : newStatus === 'UNDER_SCRUTINY'
        ? 'Under Review'
        : newStatus === 'MATURING_SOON'
        ? 'Expiring'
        : newStatus === 'MATURED'
        ? 'Matured'
        : newStatus === 'RENEWAL_INITIATED'
        ? 'Renewal Pending'
        : newStatus === 'RELEASE_REQUESTED'
        ? 'Release Requested'
        : newStatus === 'RELEASED'
        ? 'Released'
        : 'Verification Pending');

    const mappedVerifStatus: FdrVerificationStatus =
      verificationStatusOverride ||
      (newStatus === 'VERIFIED_ACTIVE' || newStatus === 'RELEASED'
        ? 'Verified'
        : newStatus === 'DISCREPANCY_RAISED'
        ? 'Discrepancy Found'
        : newStatus === 'UNDER_SCRUTINY'
        ? 'Under Scrutiny'
        : 'Verification Pending');

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          fdrs: prev.fdrs.map((item) =>
            item.fdrId === fdr.fdrId
              ? {
                  ...item,
                  status: newStatus,
                  adminStatus: mappedAdminStatus,
                  verificationStatus: mappedVerifStatus,
                  remarks,
                  observations: [
                    ...(item.observations || []),
                    {
                      id: `obs_${Date.now()}`,
                      authorName: profile?.displayName || 'AICTE Officer',
                      authorRole: profile?.role || 'AICTE_ADMIN',
                      timestamp: nowIso,
                      note: `Status updated to ${mappedAdminStatus}: ${remarks}`,
                    },
                  ],
                  updatedAt: nowIso,
                }
              : item
          ),
        },
        {
          action: 'FDR_STATUS_CHANGED',
          module: 'FDR Management',
          targetId: fdr.fdrId,
          previousValue: fdr.adminStatus || fdr.status,
          newValue: mappedAdminStatus,
          summary: `Updated ${fdr.fdrNumber} status from [${fdr.adminStatus || fdr.status}] to [${mappedAdminStatus}]: ${remarks}`,
        },
        {
          title: `FDR verification completed — ${fdr.fdrNumber}`,
          message: `Status of ${fdr.fdrNumber} (${fdr.institutionName}) updated to ${mappedAdminStatus}. Remarks: ${remarks}`,
          notificationType:
            mappedAdminStatus === 'Discrepancy Found'
              ? 'Discrepancy found'
              : 'FDR verification completed',
          severity: mappedAdminStatus === 'Discrepancy Found' ? 'CRITICAL' : 'SUCCESS',
          category: mappedAdminStatus === 'Discrepancy Found' ? 'DISCREPANCY' : 'SCRUTINY_UPDATE',
          institutionId: fdr.institutionId,
          relatedRecordId: fdr.fdrId,
        }
      )
    );

    showToast('FDR Status Updated', `${fdr.fdrNumber} is now marked as ${mappedAdminStatus}.`);
  };

  const updateFdrFields: DataContextType['updateFdrFields'] = async (fdrId, updates) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.fdrs.find((f) => f.fdrId === fdrId);
      if (!target) return prev;
      return appendAuditAndNotification(
        {
          ...prev,
          fdrs: prev.fdrs.map((f) =>
            f.fdrId === fdrId ? { ...f, ...updates, updatedAt: nowIso } : f
          ),
        },
        {
          action: 'FDR_MODIFIED',
          module: 'FDR Repository',
          targetId: fdrId,
          previousValue: `${target.fdrNumber} (₹${target.principalAmount.toLocaleString('en-IN')})`,
          newValue: `${updates.fdrNumber || target.fdrNumber} (₹${(updates.principalAmount ?? target.principalAmount).toLocaleString('en-IN')})`,
          summary: `Modified permitted instrument fields for ${target.fdrNumber}.`,
        }
      );
    });
    showToast('FDR Record Updated', `Saved changes for ${fdrId}.`);
  };

  const addFdrObservation: DataContextType['addFdrObservation'] = async (fdrId, note) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.fdrs.find((f) => f.fdrId === fdrId);
      if (!target) return prev;
      return appendAuditAndNotification(
        {
          ...prev,
          fdrs: prev.fdrs.map((f) =>
            f.fdrId === fdrId
              ? {
                  ...f,
                  remarks: note,
                  observations: [
                    ...(f.observations || []),
                    {
                      id: `obs_${Date.now()}`,
                      authorName: profile?.displayName || 'Scrutiny Officer',
                      authorRole: profile?.role || 'AICTE_SCRUTINY_OFFICER',
                      timestamp: nowIso,
                      note,
                    },
                  ],
                  updatedAt: nowIso,
                }
              : f
          ),
        },
        {
          action: 'OBSERVATION_RECORDED',
          module: 'FDR Scrutiny',
          targetId: fdrId,
          previousValue: target.remarks,
          newValue: note,
          summary: `Recorded administrative observation on ${target.fdrNumber}: "${note}"`,
        }
      );
    });
    showToast('Observation Recorded', `Added scrutiny observation to ${fdrId}.`);
  };

  const runBankVerificationSimulator: DataContextType['runBankVerificationSimulator'] = async (
    fdrId,
    forcedOutcome
  ) => {
    const target = store.fdrs.find((f) => f.fdrId === fdrId) || store.fdrs[0];
    const nowIso = new Date().toISOString();
    const rawOutcome =
      forcedOutcome ||
      (target.adminStatus === 'Discrepancy Found'
        ? 'Bank record mismatch'
        : 'Bank record matched');

    const isMatch = rawOutcome === 'Bank record matched' || rawOutcome === 'Simulated match';
    const isMismatch = rawOutcome === 'Bank record mismatch' || rawOutcome === 'Simulated mismatch';

    const outcome: BankVerificationResult['outcome'] = isMatch
      ? 'Bank record matched'
      : isMismatch
      ? 'Bank record mismatch'
      : rawOutcome;

    const result: BankVerificationResult = {
      bankName: target.bankName,
      fdrNumber: target.fdrNumber,
      depositAmount: target.principalAmount,
      issueDate: target.issueDate,
      maturityDate: target.maturityDate,
      verificationReference: `CBS-REF-${Date.now().toString().slice(-6)}`,
      timestamp: nowIso,
      outcome,
      remarks: isMatch
        ? 'Core Banking System parameters match submitted FDR number, principal amount, and AICTE joint-lien endorsement.'
        : isMismatch
        ? 'Variance detected between submitted deposit parameters and issuing bank Core Banking record.'
        : 'Physical bank confirmation endorsement required from issuing branch.',
    };

    const nextBankStatus: FdrRecord['bankVerificationStatus'] = isMatch
      ? 'CBS BANK VERIFIED'
      : isMismatch
      ? 'BANK VERIFICATION FAILED'
      : 'MANUAL CONFIRMATION REQUIRED';

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          fdrs: prev.fdrs.map((f) =>
            f.fdrId === target.fdrId
              ? {
                  ...f,
                  bankVerificationStatus: nextBankStatus,
                  bankVerificationResult: result,
                  updatedAt: nowIso,
                }
              : f
          ),
        },
        {
          action: 'BANK_CBS_VERIFIED',
          module: 'Bank CBS Verification',
          targetId: target.fdrId,
          previousValue: target.bankVerificationStatus || 'NOT VERIFIED',
          newValue: `${nextBankStatus} (${outcome})`,
          summary: `Executed Core Banking verification check for ${target.fdrNumber} (${target.bankName}): ${outcome}.`,
        }
      )
    );

    showToast(
      'Bank CBS Verification Completed',
      `${target.fdrNumber}: ${outcome} (Ref: ${result.verificationReference})`,
      isMatch ? 'success' : 'warning'
    );
    return result;
  };

  // 3. Document Actions
  const uploadPortalDocument: DataContextType['uploadPortalDocument'] = async (input) => {
    const documentId = `DOC-${3001 + store.documents.length}`;
    const nowIso = new Date().toISOString();
    const newDoc: PortalDocument = {
      documentId,
      fdrId: input.fdrId,
      fdrNumber: input.fdrNumber,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      category: input.category,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      uploadedAt: nowIso,
      uploadedBy: profile?.displayName || input.institutionName,
      verificationStatus: 'Pending',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          fileName: input.fileName,
          fileSize: input.fileSize,
          uploadedAt: nowIso,
          uploadedBy: profile?.displayName || input.institutionName,
          notes: input.notes || 'Uploaded to centralized document vault.',
        },
      ],
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          documents: [newDoc, ...prev.documents],
        },
        {
          action: 'DOCUMENT_UPLOADED',
          module: 'Document Management',
          targetId: documentId,
          previousValue: 'None',
          newValue: `${newDoc.fileName} (v1)`,
          summary: `Uploaded ${newDoc.category} (${newDoc.fileName}) for FDR ${newDoc.fdrNumber}.`,
        }
      )
    );
    showToast('Document Uploaded', `${newDoc.fileName} added to Document Vault.`);
    return documentId;
  };

  const replaceDocumentVersion: DataContextType['replaceDocumentVersion'] = async (
    documentId,
    newFileName,
    newFileSize,
    notes
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.documents.find((d) => d.documentId === documentId);
      if (!target) return prev;
      const nextVer = target.currentVersion + 1;
      return appendAuditAndNotification(
        {
          ...prev,
          documents: prev.documents.map((d) =>
            d.documentId === documentId
              ? {
                  ...d,
                  fileName: newFileName,
                  fileSize: newFileSize,
                  uploadedAt: nowIso,
                  currentVersion: nextVer,
                  verificationStatus: 'Pending',
                  versions: [
                    ...d.versions,
                    {
                      versionNumber: nextVer,
                      fileName: newFileName,
                      fileSize: newFileSize,
                      uploadedAt: nowIso,
                      uploadedBy: profile?.displayName || 'Authorized User',
                      notes,
                    },
                  ],
                }
              : d
          ),
        },
        {
          action: 'DOCUMENT_REPLACED',
          module: 'Document Management',
          targetId: documentId,
          previousValue: `${target.fileName} (v${target.currentVersion})`,
          newValue: `${newFileName} (v${nextVer})`,
          summary: `Replaced document ${documentId} with version v${nextVer} (${newFileName}).`,
        }
      );
    });
    showToast('Document Version Replaced', `Saved new version for document ${documentId}.`);
  };

  const updateDocumentVerificationStatus: DataContextType['updateDocumentVerificationStatus'] =
    async (documentId, status) => {
      setStore((prev) => {
        const target = prev.documents.find((d) => d.documentId === documentId);
        if (!target) return prev;
        return appendAuditAndNotification(
          {
            ...prev,
            documents: prev.documents.map((d) =>
              d.documentId === documentId ? { ...d, verificationStatus: status } : d
            ),
          },
          {
            action: 'DOCUMENT_VERIFICATION_UPDATED',
            module: 'Document Management',
            targetId: documentId,
            previousValue: target.verificationStatus,
            newValue: status,
            summary: `Updated verification status of ${target.fileName} to ${status}.`,
          }
        );
      });
      showToast('Document Status Updated', `Document ${documentId} marked as ${status}.`);
    };

  // 4. Discrepancy Actions
  const createDiscrepancyRecord: DataContextType['createDiscrepancyRecord'] = async (input) => {
    const discrepancyId = `DISC-2026-0${store.discrepancies.length + 1}`;
    const nowIso = new Date().toISOString();
    const newDisc: DiscrepancyRecord = {
      discrepancyId,
      fdrId: input.fdrId,
      fdrNumber: input.fdrNumber,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      discrepancyType: input.discrepancyType,
      severity: input.severity,
      detectionDate: simulatedToday,
      assignedOfficer: input.assignedOfficer || 'Shri Arvind Kumar',
      resolutionStatus: 'Open',
      description: input.description,
      expectedValue: input.expectedValue || 'Per AICTE Statutory Norms',
      actualValue: input.actualValue || 'Mismatch Detected on Instrument',
      history: [
        {
          id: `dh_${Date.now()}`,
          actor: profile?.displayName || 'Scrutiny Officer',
          role: profile?.role || 'AICTE_SCRUTINY_OFFICER',
          action: 'Discrepancy Logged',
          timestamp: nowIso,
          remarks: input.description,
        },
      ],
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          discrepancies: [newDisc, ...prev.discrepancies],
          fdrs: prev.fdrs.map((f) =>
            f.fdrId === input.fdrId
              ? {
                  ...f,
                  status: 'DISCREPANCY_RAISED',
                  adminStatus: 'Discrepancy Found',
                  verificationStatus: 'Discrepancy Found',
                  remarks: `Discrepancy [${discrepancyId}]: ${input.description}`,
                  updatedAt: nowIso,
                }
              : f
          ),
        },
        {
          action: 'DISCREPANCY_DETECTED',
          module: 'Discrepancy Management',
          targetId: discrepancyId,
          previousValue: 'Under Scrutiny',
          newValue: `${input.discrepancyType} (${input.severity})`,
          summary: `Flagged ${input.severity} discrepancy (${input.discrepancyType}) on FDR ${input.fdrNumber}.`,
        },
        {
          title: `Discrepancy found — ${input.fdrNumber}`,
          message: `${input.discrepancyType} (${input.severity}) detected on ${input.fdrNumber} (${input.institutionName}). Immediate clarification required.`,
          notificationType: 'Discrepancy found',
          severity: 'CRITICAL',
          category: 'DISCREPANCY',
          institutionId: input.institutionId,
          relatedRecordId: input.fdrId,
        }
      )
    );

    showToast(
      'Discrepancy Flagged',
      `Created ${discrepancyId} (${input.discrepancyType}) and updated FDR status.`,
      'warning'
    );
    return discrepancyId;
  };

  const updateDiscrepancyStatus: DataContextType['updateDiscrepancyStatus'] = async (
    discrepancyId,
    nextStatus,
    remarks,
    assignedOfficer
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.discrepancies.find((d) => d.discrepancyId === discrepancyId);
      if (!target) return prev;

      const updatedDiscrepancies = prev.discrepancies.map((d) =>
        d.discrepancyId === discrepancyId
          ? {
              ...d,
              resolutionStatus: nextStatus,
              assignedOfficer: assignedOfficer || d.assignedOfficer,
              history: [
                ...d.history,
                {
                  id: `dh_${Date.now()}`,
                  actor: profile?.displayName || 'AICTE Officer',
                  role: profile?.role || 'AICTE_SCRUTINY_OFFICER',
                  action: `Status -> ${nextStatus}`,
                  timestamp: nowIso,
                  remarks,
                },
              ],
            }
          : d
      );

      // Synchronize associated FDR status when discrepancy is resolved or rejected
      const updatedFdrs = prev.fdrs.map((f) => {
        if (f.fdrId !== target.fdrId) return f;
        if (nextStatus === 'Resolved') {
          return {
            ...f,
            status: 'VERIFIED_ACTIVE' as const,
            adminStatus: 'Active' as const,
            verificationStatus: 'Verified' as const,
            remarks: `Discrepancy ${discrepancyId} resolved: ${remarks}`,
            updatedAt: nowIso,
          };
        }
        if (nextStatus === 'Submission Rejected') {
          return {
            ...f,
            status: 'DISCREPANCY_RAISED' as const,
            adminStatus: 'Rejected' as const,
            verificationStatus: 'Rejected' as const,
            remarks: `Rejected due to discrepancy ${discrepancyId}: ${remarks}`,
            updatedAt: nowIso,
          };
        }
        return f;
      });

      return appendAuditAndNotification(
        {
          ...prev,
          discrepancies: updatedDiscrepancies,
          fdrs: updatedFdrs,
        },
        {
          action:
            nextStatus === 'Resolved' ? 'DISCREPANCY_RESOLVED' : 'DISCREPANCY_STATUS_UPDATED',
          module: 'Discrepancy Management',
          targetId: discrepancyId,
          previousValue: target.resolutionStatus,
          newValue: nextStatus,
          summary: `Updated discrepancy ${discrepancyId} (${target.fdrNumber}) to [${nextStatus}]: ${remarks}`,
        },
        nextStatus === 'Clarification Requested'
          ? {
              title: `Additional documents requested — ${target.fdrNumber}`,
              message: `Clarification requested for discrepancy ${discrepancyId} on ${target.fdrNumber}: ${remarks}`,
              notificationType: 'Additional documents requested',
              severity: 'WARNING',
              category: 'DISCREPANCY',
              institutionId: target.institutionId,
              relatedRecordId: target.fdrId,
            }
          : undefined
      );
    });

    showToast('Discrepancy Updated', `Case ${discrepancyId} updated to ${nextStatus}.`);
  };

  // 5. Maturity Actions (With Duplicate Notification Prevention)
  const triggerMaturityReminders: DataContextType['triggerMaturityReminders'] = async (
    specificFdrId
  ) => {
    let createdCount = 0;
    const nowIso = new Date().toISOString();

    setStore((prev) => {
      const candidates = specificFdrId
        ? prev.fdrs.filter((f) => f.fdrId === specificFdrId)
        : prev.fdrs.filter((f) => {
            const rem = getRemainingDays(f.maturityDate);
            return rem <= prev.systemConfig.maturityAlertWindowDays && f.adminStatus !== 'Released';
          });

      const newNotifs: PortalNotification[] = [];
      for (const fdr of candidates) {
        const remDays = getRemainingDays(fdr.maturityDate);
        const eventKey = `${fdr.fdrId}_${simulatedToday}`;
        // Duplicate check: prevent duplicate reminder for the same FDR on the same simulated date
        const alreadySent = prev.notifications.some(
          (n) =>
            n.relatedRecordId === fdr.fdrId &&
            n.category === 'MATURITY_ALERT' &&
            n.message.includes(`[RefDate:${simulatedToday}]`)
        );

        if (!alreadySent) {
          createdCount += 1;
          const isMatured = remDays <= 0;
          newNotifs.push({
            notificationId: `NOTIF-MAT-${Date.now()}-${createdCount}`,
            title: isMatured
              ? `FDR matured — ${fdr.fdrNumber} (${Math.abs(remDays)}d overdue)`
              : `Maturity approaching — ${fdr.fdrNumber} (${remDays} days left)`,
            message: `${fdr.institutionName}: FDR ${fdr.fdrNumber} (${fdr.bankName}, ₹${fdr.principalAmount.toLocaleString('en-IN')}) ${
              isMatured ? `matured on ${fdr.maturityDate}` : `matures in ${remDays} days on ${fdr.maturityDate}`
            }. Submit renewal immediately. [RefDate:${simulatedToday}] (${eventKey})`,
            notificationType: isMatured ? 'FDR matured' : 'Maturity approaching',
            severity: isMatured || remDays <= 7 ? 'CRITICAL' : 'WARNING',
            category: 'MATURITY_ALERT',
            targetRole: 'INSTITUTION_ADMIN',
            institutionId: fdr.institutionId,
            relatedRecordId: fdr.fdrId,
            recipientUid: 'demo_user',
            readStatus: false,
            orgId: 'AICTE',
            createdAt: nowIso,
          });
        }
      }

      if (newNotifs.length === 0) return prev;

      return appendAuditAndNotification(
        {
          ...prev,
          notifications: [...newNotifs, ...prev.notifications],
        },
        {
          action: 'MATURITY_REMINDERS_DISPATCHED',
          module: 'Maturity Monitoring',
          targetId: specificFdrId || 'BATCH_SCHEDULE',
          previousValue: `${prev.notifications.length} alerts`,
          newValue: `${prev.notifications.length + newNotifs.length} alerts`,
          summary: `Triggered ${newNotifs.length} non-duplicate maturity/overdue reminder notification(s) for evaluation date ${simulatedToday}.`,
        }
      );
    });

    if (createdCount > 0) {
      showToast(
        'Maturity Reminders Dispatched',
        `Generated ${createdCount} new maturity alert notification(s).`
      );
    } else {
      showToast(
        'Duplicate Prevention Active',
        `Reminders for this maturity event on ${simulatedToday} have already been dispatched.`,
        'info'
      );
    }
    return createdCount;
  };

  // 6. Renewal & Replacement Actions
  const submitRenewalOrReplacement: DataContextType['submitRenewalOrReplacement'] = async (
    input
  ) => {
    const orig = store.fdrs.find((f) => f.fdrId === input.originalFdrId) || store.fdrs[0];
    const renewalId = `REN-2026-0${store.renewals.length + 1}`;
    const newFdrId = `FDR-${2026001 + store.fdrs.length}`;
    const nowIso = new Date().toISOString();

    const newFdrRecord: FdrRecord = {
      ...orig,
      fdrId: newFdrId,
      fdrNumber: input.newFdrNumber,
      bankName: input.bankName || orig.bankName,
      branchName: input.branchName || orig.branchName,
      ifscCode: input.ifscCode || orig.ifscCode,
      principalAmount: Number(input.newAmount) || orig.principalAmount,
      maturityAmount: Math.round((Number(input.newAmount) || orig.principalAmount) * 1.68),
      issueDate: simulatedToday,
      maturityDate: input.newMaturityDate,
      status: 'RENEWAL_INITIATED',
      adminStatus: 'Renewal Pending',
      verificationStatus: 'Under Scrutiny',
      bankVerificationStatus: 'NOT VERIFIED',
      previousFdrId: orig.fdrId,
      lineageStage: input.requestType === 'Replacement' ? 'Replacement FDR' : 'Renewal 1',
      documentName: input.documentName || `Renewal_${input.newFdrNumber}.pdf`,
      remarks: `${input.requestType} linked to original ${orig.fdrId} (${orig.fdrNumber}): ${input.observations}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newRenewal: RenewalRecord = {
      renewalId,
      originalFdrId: orig.fdrId,
      originalFdrNumber: orig.fdrNumber,
      newFdrId,
      newFdrNumber: input.newFdrNumber,
      institutionId: orig.institutionId,
      institutionName: orig.institutionName,
      bankName: input.bankName || orig.bankName,
      previousAmount: orig.principalAmount,
      newAmount: Number(input.newAmount) || orig.principalAmount,
      previousMaturityDate: orig.maturityDate,
      newMaturityDate: input.newMaturityDate,
      requestType: input.requestType,
      status: 'Submitted',
      submittedAt: simulatedToday,
      observations: input.observations,
      documentName: input.documentName || `Renewal_${input.newFdrNumber}.pdf`,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          renewals: [newRenewal, ...prev.renewals],
          fdrs: [
            newFdrRecord,
            ...prev.fdrs.map((f) =>
              f.fdrId === orig.fdrId
                ? {
                    ...f,
                    replacedByFdrId: newFdrId,
                    adminStatus: 'Renewal Pending' as const,
                    status: 'RENEWAL_INITIATED' as const,
                    updatedAt: nowIso,
                  }
                : f
            ),
          ],
        },
        {
          action: 'RENEWAL_SUBMITTED',
          module: 'Renewal & Replacement',
          targetId: renewalId,
          previousValue: `${orig.fdrNumber} (${orig.maturityDate})`,
          newValue: `${input.newFdrNumber} (${input.newMaturityDate})`,
          summary: `Submitted ${input.requestType} ${renewalId} linking original ${orig.fdrNumber} to new instrument ${input.newFdrNumber}.`,
        },
        {
          title: `Renewal submitted — ${input.newFdrNumber}`,
          message: `${orig.institutionName} submitted ${input.requestType.toLowerCase()} instrument ${input.newFdrNumber} replacing ${orig.fdrNumber}.`,
          notificationType: 'Renewal submitted',
          severity: 'INFO',
          category: 'MATURITY_ALERT',
          institutionId: orig.institutionId,
          relatedRecordId: newFdrId,
        }
      )
    );

    showToast(
      `${input.requestType} Submitted`,
      `Linked ${orig.fdrNumber} -> ${input.newFdrNumber} (${renewalId}).`
    );
    return renewalId;
  };

  const reviewRenewalRecord: DataContextType['reviewRenewalRecord'] = async (
    renewalId,
    decision,
    observations
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.renewals.find((r) => r.renewalId === renewalId);
      if (!target) return prev;

      const updatedRenewals = prev.renewals.map((r) =>
        r.renewalId === renewalId
          ? {
              ...r,
              status: decision,
              reviewedBy: profile?.displayName || 'AICTE Officer',
              observations,
            }
          : r
      );

      // Update both original FDR (marked 'Renewed') and new FDR (marked 'Active') on approval
      const updatedFdrs = prev.fdrs.map((f) => {
        if (decision === 'Approved') {
          if (f.fdrId === target.originalFdrId) {
            return {
              ...f,
              adminStatus: 'Renewed' as const,
              verificationStatus: 'Verified' as const,
              remarks: `Superseded by approved ${target.requestType} instrument ${target.newFdrNumber}.`,
              updatedAt: nowIso,
            };
          }
          if (f.fdrId === target.newFdrId) {
            return {
              ...f,
              status: 'VERIFIED_ACTIVE' as const,
              adminStatus: 'Active' as const,
              verificationStatus: 'Verified' as const,
              lineageStage: 'Current Active Instrument' as const,
              remarks: `Approved ${target.requestType} instrument: ${observations}`,
              updatedAt: nowIso,
            };
          }
        } else if (decision === 'Rejected' && f.fdrId === target.newFdrId) {
          return {
            ...f,
            adminStatus: 'Rejected' as const,
            verificationStatus: 'Rejected' as const,
            remarks: `Renewal rejected: ${observations}`,
            updatedAt: nowIso,
          };
        }
        return f;
      });

      return appendAuditAndNotification(
        {
          ...prev,
          renewals: updatedRenewals,
          fdrs: updatedFdrs,
        },
        {
          action: decision === 'Approved' ? 'RENEWAL_APPROVED' : `RENEWAL_${decision.toUpperCase()}`,
          module: 'Renewal & Replacement',
          targetId: renewalId,
          previousValue: target.status,
          newValue: decision,
          summary: `${decision} ${target.requestType} ${renewalId} (${target.originalFdrNumber} -> ${target.newFdrNumber}): ${observations}`,
        }
      );
    });

    showToast('Renewal Review Recorded', `Updated ${renewalId} to ${decision}.`);
  };

  // 7. Release & Refund Actions
  const submitReleaseRequest: DataContextType['submitReleaseRequest'] = async (input) => {
    const fdr = store.fdrs.find((f) => f.fdrId === input.fdrId) || store.fdrs[0];
    const requestId = `REL-2026-0${store.releases.length + 1}`;
    const referenceNo = `AICTE/NOC/2026/${801 + store.releases.length}`;
    const nowIso = new Date().toISOString();

    const newReq: ReleaseRefundRequest = {
      requestId,
      referenceNo,
      fdrId: fdr.fdrId,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      aictePermanentId: fdr.aictePermanentId,
      bankName: fdr.bankName,
      depositAmount: fdr.principalAmount,
      issueDate: fdr.issueDate,
      maturityDate: fdr.maturityDate,
      reason: input.reason,
      supportingDocument: input.supportingDocument || `Release_NOC_Request_${fdr.fdrNumber}.pdf`,
      stage: 'SUBMITTED',
      submittedAt: simulatedToday,
      updatedAt: simulatedToday,
      eligibilityCheck: {
        lockInCompleted: true,
        noActiveDiscrepancy: fdr.adminStatus !== 'Discrepancy Found',
        jointLienVerified: fdr.jointHolderStatus === 'JOINT_WITH_AICTE',
      },
      timeline: [
        {
          id: `rel_step_${Date.now()}`,
          stage: 'SUBMITTED',
          officerName: profile?.displayName || 'Institution Nodal Officer',
          officerRole: profile?.role || 'INSTITUTION_ADMIN',
          timestamp: nowIso,
          action: 'Release/Refund Request Submitted',
          remarks: input.reason,
        },
      ],
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          releases: [newReq, ...prev.releases],
          fdrs: prev.fdrs.map((item) =>
            item.fdrId === fdr.fdrId
              ? {
                  ...item,
                  status: 'RELEASE_REQUESTED',
                  adminStatus: 'Release Requested',
                  updatedAt: nowIso,
                }
              : item
          ),
        },
        {
          action: 'RELEASE_REQUEST_SUBMITTED',
          module: 'Release & Refund',
          targetId: requestId,
          previousValue: fdr.adminStatus || 'Active',
          newValue: 'SUBMITTED (Release Requested)',
          summary: `Submitted release/refund request ${referenceNo} for ${fdr.fdrNumber} (${fdr.institutionName}).`,
        },
        {
          title: `Refund request submitted — ${fdr.fdrNumber}`,
          message: `${fdr.institutionName} submitted release/refund request ${referenceNo} for ₹${fdr.principalAmount.toLocaleString('en-IN')}.`,
          notificationType: 'Refund request submitted',
          severity: 'INFO',
          category: 'RELEASE_APPROVAL',
          institutionId: fdr.institutionId,
          relatedRecordId: fdr.fdrId,
        }
      )
    );

    showToast('Release Request Submitted', `Created dossier ${referenceNo} for ${fdr.fdrNumber}.`);
    return requestId;
  };

  const advanceReleaseWorkflow: DataContextType['advanceReleaseWorkflow'] = async (
    requestId,
    nextStage,
    actionLabel,
    remarks,
    reason
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const target = prev.releases.find((r) => r.requestId === requestId);
      if (!target) return prev;

      const updatedReleases = prev.releases.map((r) =>
        r.requestId === requestId
          ? {
              ...r,
              stage: nextStage,
              updatedAt: simulatedToday,
              timeline: [
                ...r.timeline,
                {
                  id: `rel_step_${Date.now()}`,
                  stage: nextStage,
                  officerName: profile?.displayName || 'AICTE Authority',
                  officerRole: profile?.role || 'SENIOR_APPROVING_OFFICER',
                  timestamp: nowIso,
                  action: actionLabel,
                  remarks,
                  reason,
                },
              ],
            }
          : r
      );

      const isFinalReleased =
        nextStage === 'APPROVED' || nextStage === 'RELEASED' || nextStage === 'COMPLETED';

      const updatedFdrs = prev.fdrs.map((f) => {
        if (f.fdrId !== target.fdrId) return f;
        if (isFinalReleased) {
          return {
            ...f,
            status: 'RELEASED' as const,
            adminStatus: 'Released' as const,
            remarks: `Release ${nextStage}: ${remarks}`,
            updatedAt: nowIso,
          };
        }
        return f;
      });

      return appendAuditAndNotification(
        {
          ...prev,
          releases: updatedReleases,
          fdrs: updatedFdrs,
        },
        {
          action: `RELEASE_${nextStage}`,
          module: 'Release & Refund',
          targetId: requestId,
          previousValue: target.stage,
          newValue: nextStage,
          summary: `Release dossier ${target.referenceNo} (${target.fdrNumber}) moved to [${nextStage}]: ${remarks}`,
        },
        nextStage === 'APPROVED' || nextStage === 'RELEASED' || nextStage === 'REJECTED'
          ? {
              title:
                nextStage === 'REJECTED'
                  ? `Refund request rejected — ${target.fdrNumber}`
                  : `Refund request approved — ${target.fdrNumber}`,
              message: `Release request ${target.referenceNo} for ${target.institutionName} moved to ${nextStage}. Remarks: ${remarks}`,
              notificationType:
                nextStage === 'REJECTED' ? 'Refund request rejected' : 'Refund request approved',
              severity: nextStage === 'REJECTED' ? 'CRITICAL' : 'SUCCESS',
              category: 'RELEASE_APPROVAL',
              institutionId: target.institutionId,
              relatedRecordId: target.fdrId,
            }
          : undefined
      );
    });

    showToast('Release Workflow Updated', `Request ${requestId} transitioned to ${nextStage}.`);
  };

  // 8. Legacy Workflow Submission Actions
  const createWorkflowSubmission: DataContextType['createWorkflowSubmission'] = async (input) => {
    const submissionId = `SUB-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const referenceNo = `AICTE/FDR/2026/${Math.floor(10000 + Math.random() * 90000)}`;
    const newSub: WorkflowSubmission = {
      submissionId,
      referenceNo,
      submissionType: input.submissionType,
      fdrId: input.fdrId,
      fdrNumber: input.fdrNumber,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      amount: input.amount,
      bankName: input.bankName,
      status: 'SUBMITTED',
      assignedRole: input.assignedRole || 'AICTE_SCRUTINY_OFFICER',
      notes: input.notes,
      ownerUid: profile?.uid || 'demo_user',
      orgId: 'AICTE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          submissions: [newSub, ...prev.submissions],
        },
        {
          action: `WORKFLOW_${input.submissionType}`,
          module: 'Workflow Submissions',
          targetId: submissionId,
          previousValue: 'None',
          newValue: 'SUBMITTED',
          summary: `Submitted ${input.submissionType} dossier ${referenceNo} for ${input.fdrNumber}.`,
        }
      )
    );
    showToast('Workflow Dossier Submitted', `Reference ${referenceNo} created.`);
    return submissionId;
  };

  const updateSubmissionStatus: DataContextType['updateSubmissionStatus'] = async (
    submission,
    newStatus,
    notes,
    assignedRole
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          submissions: prev.submissions.map((s) =>
            s.submissionId === submission.submissionId
              ? {
                  ...s,
                  status: newStatus,
                  notes,
                  assignedRole: assignedRole || s.assignedRole,
                  updatedAt: nowIso,
                }
              : s
          ),
        },
        {
          action: `SUBMISSION_${newStatus}`,
          module: 'FDR Verification',
          targetId: submission.submissionId,
          previousValue: submission.status,
          newValue: newStatus,
          summary: `Dossier ${submission.referenceNo} updated to ${newStatus}: ${notes}`,
        }
      )
    );
    showToast('Dossier Updated', `${submission.referenceNo} moved to ${newStatus}.`);
  };

  // 9. Notifications
  const markNotificationRead: DataContextType['markNotificationRead'] = async (notification) => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.notificationId === notification.notificationId ? { ...n, readStatus: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = async () => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, readStatus: true })),
    }));
    showToast('Notifications Cleared', 'All notifications have been marked as read.', 'info');
  };

  const createAlertNotification: DataContextType['createAlertNotification'] = async (input) => {
    const nowIso = new Date().toISOString();
    const notif: PortalNotification = {
      notificationId: `NOTIF-${Date.now()}`,
      title: input.title,
      message: input.message,
      notificationType: input.notificationType || 'Pending officer action',
      severity: input.severity,
      category: input.category,
      targetRole: input.targetRole,
      institutionId: input.institutionId,
      relatedRecordId: input.relatedRecordId,
      recipientUid: profile?.uid || 'demo_user',
      readStatus: false,
      orgId: 'AICTE',
      createdAt: nowIso,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          notifications: [notif, ...prev.notifications],
        },
        {
          action: 'ALERT_DISPATCHED',
          module: 'Notification Centre',
          targetId: notif.notificationId,
          previousValue: 'None',
          newValue: input.severity,
          summary: `Dispatched ${input.severity} notification: ${input.title}`,
        }
      )
    );
    showToast('Notification Dispatched', input.title);
  };

  // 10. Users & Roles
  const createDemoUser: DataContextType['createDemoUser'] = async (input) => {
    const nowIso = new Date().toISOString();
    const newUser: UserProfile = {
      uid: `demo_user_${Date.now()}`,
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      department: input.department,
      status: 'ACTIVE',
      lastActivity: nowIso,
      orgId: 'AICTE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          users: [newUser, ...prev.users],
        },
        {
          action: 'USER_CREATED',
          module: 'User & Role Management',
          targetId: newUser.uid,
          previousValue: 'None',
          newValue: `${newUser.email} (${newUser.role})`,
          summary: `Created user account ${newUser.displayName} (${newUser.email}) with role ${newUser.role}.`,
        }
      )
    );
    showToast('Portal User Created', `${newUser.displayName} assigned as ${newUser.role}.`);
  };

  const updateUserRoleAndStatus: DataContextType['updateUserRoleAndStatus'] = async (
    targetUser,
    role,
    status,
    institutionId,
    institutionName
  ) => {
    const nowIso = new Date().toISOString();
    setStore((prev) =>
      appendAuditAndNotification(
        {
          ...prev,
          users: prev.users.map((u) =>
            u.uid === targetUser.uid
              ? {
                  ...u,
                  role,
                  status,
                  institutionId: institutionId ?? u.institutionId,
                  institutionName: institutionName ?? u.institutionName,
                  updatedAt: nowIso,
                }
              : u
          ),
        },
        {
          action: 'USER_ROLE_STATUS_UPDATED',
          module: 'User & Role Management',
          targetId: targetUser.uid,
          previousValue: `${targetUser.role} (${targetUser.status})`,
          newValue: `${role} (${status})`,
          summary: `Updated user ${targetUser.email} to role [${role}] and status [${status}].`,
        }
      )
    );
    showToast('User Permissions Updated', `${targetUser.displayName}: ${role} (${status})`);
  };

  // 11. System Settings & Demo Simulation Controls
  const saveSystemConfiguration: DataContextType['saveSystemConfiguration'] = async (input) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => {
      const updatedConfig: SystemConfiguration = {
        ...prev.systemConfig,
        ...input,
        updatedAt: nowIso,
      };
      return appendAuditAndNotification(
        {
          ...prev,
          systemConfig: updatedConfig,
        },
        {
          action: 'SYSTEM_SETTINGS_UPDATED',
          module: 'System Settings',
          targetId: 'global',
          previousValue: `Alert Window: ${prev.systemConfig.maturityAlertWindowDays}d`,
          newValue: `Alert Window: ${updatedConfig.maturityAlertWindowDays}d`,
          summary: `Updated system settings (Maturity Window: ${updatedConfig.maturityAlertWindowDays}d, Lock-in: ${updatedConfig.defaultLockInYears}y).`,
        }
      );
    });

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'systemConfig', 'global'), {
          ...store.systemConfig,
          ...input,
          updatedAt: nowIso,
        });
      } catch {
        // ignore
      }
    }
    showToast('System Settings Saved', 'Maturity reminder intervals and policy parameters updated.');
  };

  const resetDemoDataToSeed = async () => {
    setIsSeeding(true);
    try {
      const fresh = generateDeterministicSeedData();
      setStore(fresh);
      localStorage.setItem(CENTRAL_STORE_KEY, JSON.stringify(fresh));
      setSimulatedTodayState('2026-10-30');
      showToast(
        'Statutory Baseline Registry Restored',
        'Synchronized 20 institutions, 50 FDRs, 8 banks, 8 discrepancies, 8 renewals, 5 releases, 20 notifications, and 30 audit events.'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const seedInitialStatutoryRecords = resetDemoDataToSeed;

  const simulateSampleDiscrepancy = async () => {
    const candidate =
      store.fdrs.find((f) => f.adminStatus === 'Verification Pending' || f.adminStatus === 'Active') ||
      store.fdrs[0];
    await createDiscrepancyRecord({
      fdrId: candidate.fdrId,
      fdrNumber: candidate.fdrNumber,
      institutionId: candidate.institutionId,
      institutionName: candidate.institutionName,
      discrepancyType: 'Amount mismatch',
      severity: 'High',
      assignedOfficer: 'Shri Arvind Kumar (Scrutiny Officer)',
      description: `Automated OCR scrutiny detected principal variance on ${candidate.fdrNumber}.`,
      expectedValue: `₹${candidate.principalAmount.toLocaleString('en-IN')}`,
      actualValue: `₹${(candidate.principalAmount - 500000).toLocaleString('en-IN')}`,
    });
  };

  const simulateMaturityAlert = async () => {
    const expiring = store.fdrs.find((f) => f.adminStatus === 'Expiring') || store.fdrs[18];
    await triggerMaturityReminders(expiring.fdrId);
  };

  const simulateRenewalCase = async () => {
    const expiring = store.fdrs.find((f) => f.adminStatus === 'Expiring') || store.fdrs[19];
    await submitRenewalOrReplacement({
      originalFdrId: expiring.fdrId,
      newFdrNumber: `${expiring.fdrNumber}-R1`,
      bankName: expiring.bankName,
      branchName: expiring.branchName,
      ifscCode: expiring.ifscCode,
      newAmount: expiring.principalAmount + 500000,
      newMaturityDate: '2034-11-30',
      requestType: 'Renewal',
      observations: 'Statutory 8-year renewal endorsement submitted for expiring FDR.',
      documentName: `Statutory_Renewal_${expiring.fdrNumber}.pdf`,
    });
  };

  const simulateReleaseWorkflowCase = async () => {
    const active = store.fdrs.find((f) => f.adminStatus === 'Active') || store.fdrs[45];
    await submitReleaseRequest({
      fdrId: active.fdrId,
      reason: 'Completed mandatory 8-year lock-in period with zero pending statutory liabilities.',
      supportingDocument: `NOC_Release_Application_${active.fdrNumber}.pdf`,
    });
  };

  return (
    <DataContext.Provider
      value={{
        institutions: store.institutions,
        fdrs: store.fdrs,
        documents: store.documents,
        discrepancies: store.discrepancies,
        renewals: store.renewals,
        releases: store.releases,
        submissions: store.submissions,
        auditLogs: store.auditLogs,
        notifications: store.notifications,
        users: store.users,
        systemConfig: store.systemConfig,
        simulatedToday,
        setSimulatedToday,
        getRemainingDays,
        isLoadingData,
        isSeeding,
        toasts,
        showToast,
        dismissToast,
        selectedFdrForDrawer,
        setSelectedFdrForDrawer,
        createInstitution,
        updateInstitutionDetails,
        toggleInstitutionActivation,
        createFdrDeposit,
        updateFdrStatusAndRemarks,
        updateFdrFields,
        addFdrObservation,
        runBankVerificationSimulator,
        uploadPortalDocument,
        replaceDocumentVersion,
        updateDocumentVerificationStatus,
        createDiscrepancyRecord,
        updateDiscrepancyStatus,
        triggerMaturityReminders,
        submitRenewalOrReplacement,
        reviewRenewalRecord,
        submitReleaseRequest,
        advanceReleaseWorkflow,
        createWorkflowSubmission,
        updateSubmissionStatus,
        markNotificationRead,
        markAllNotificationsRead,
        createAlertNotification,
        createDemoUser,
        updateUserRoleAndStatus,
        saveSystemConfiguration,
        seedInitialStatutoryRecords,
        resetDemoDataToSeed,
        simulateSampleDiscrepancy,
        simulateMaturityAlert,
        simulateRenewalCase,
        simulateReleaseWorkflowCase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
}
