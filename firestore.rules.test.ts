/**
 * Security Rules Dirty Dozen Verification Suite (Phase 0 TDD)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected by the Firestore security rules invariants.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'delete' | 'get';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on users',
    collection: 'users',
    docId: 'user_101',
    operation: 'create',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      uid: 'user_101',
      email: 'inst@college.edu.in',
      displayName: 'Principal',
      role: 'INSTITUTION_ADMIN',
      institutionId: 'inst_1',
      institutionName: 'NIT Delhi',
      department: 'Administration',
      status: 'ACTIVE',
      orgId: 'AICTE',
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
      isSuperUser: true, // Shadow field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Privilege Escalation on users',
    collection: 'users',
    docId: 'user_102',
    operation: 'create',
    authUid: 'user_102',
    emailVerified: true,
    payload: {
      uid: 'user_102',
      email: 'attacker@example.com',
      displayName: 'Attacker',
      role: 'SUPER_ADMIN',
      institutionId: 'inst_1',
      institutionName: 'Test Inst',
      department: 'IT',
      status: 'ACTIVE',
      orgId: 'AICTE',
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Spoofing on systemConfig',
    collection: 'systemConfig',
    docId: 'global',
    operation: 'update',
    authUid: 'spoof_admin',
    emailVerified: false,
    payload: {
      configId: 'global',
      maturityAlertWindowDays: 90,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'ID Poisoning on fdrs',
    collection: 'fdrs',
    docId: 'invalid id with spaces and $pecial chars!',
    operation: 'create',
    authUid: 'user_101',
    emailVerified: true,
    payload: { fdrId: 'invalid id with spaces and $pecial chars!' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner Spoofing on fdrs',
    collection: 'fdrs',
    docId: 'fdr_900',
    operation: 'create',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      fdrId: 'fdr_900',
      ownerUid: 'other_user_999',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Denial-of-Wallet String Bomb on submissions',
    collection: 'submissions',
    docId: 'sub_500',
    operation: 'create',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      submissionId: 'sub_500',
      notes: 'X'.repeat(5000),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Update-Gap Type Poisoning on fdrs',
    collection: 'fdrs',
    docId: 'fdr_101',
    operation: 'update',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      principalAmount: '1500000_NOT_A_NUMBER',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Tampering on institutions',
    collection: 'institutions',
    docId: 'inst_101',
    operation: 'update',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      ownerUid: 'hijacked_uid',
      createdAt: '2099-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Mutation on RELEASED fdr',
    collection: 'fdrs',
    docId: 'fdr_released_1',
    operation: 'update',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      status: 'VERIFIED_ACTIVE',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Tampering (Delete Attempt)',
    collection: 'auditLogs',
    docId: 'log_101',
    operation: 'delete',
    authUid: 'user_101',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'PII Blanket Read on another user profile',
    collection: 'users',
    docId: 'other_user_202',
    operation: 'get',
    authUid: 'user_101',
    emailVerified: true,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized System Config Mutation',
    collection: 'systemConfig',
    docId: 'global',
    operation: 'update',
    authUid: 'user_101',
    emailVerified: true,
    payload: {
      escalationSlaHours: 1,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
