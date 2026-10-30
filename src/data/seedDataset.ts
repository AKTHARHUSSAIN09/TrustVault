import {
  AICTERegion,
  AuditLogEntry,
  DiscrepancyRecord,
  DiscrepancySeverity,
  DiscrepancyType,
  FdrAdminStatus,
  FdrRecord,
  FdrStatus,
  FdrVerificationStatus,
  Institution,
  InstitutionCategory,
  InstitutionType,
  NotificationType,
  PortalDocument,
  PortalNotification,
  ReleaseRefundRequest,
  RenewalRecord,
  SystemConfiguration,
  UserProfile,
  UserRole,
  WorkflowSubmission,
} from '../types/fdr';

const BASE_REF_DATE = '2026-10-30';

function addDays(baseDateStr: string, days: number): string {
  const d = new Date(`${baseDateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const EIGHT_ISSUING_BANKS = [
  {
    name: 'State Bank of India',
    short: 'SBI',
    ifscPrefix: 'SBIN000',
    branchSuffix: 'Commercial Corporate Branch',
  },
  {
    name: 'Punjab National Bank',
    short: 'PNB',
    ifscPrefix: 'PUNB039',
    branchSuffix: 'Large Corporate Branch',
  },
  {
    name: 'Bank of Baroda',
    short: 'BOB',
    ifscPrefix: 'BARB0CO',
    branchSuffix: 'Institutional Banking Branch',
  },
  {
    name: 'Canara Bank',
    short: 'CNRB',
    ifscPrefix: 'CNRB000',
    branchSuffix: 'Prime Corporate Branch',
  },
  {
    name: 'Union Bank of India',
    short: 'UBIN',
    ifscPrefix: 'UBIN053',
    branchSuffix: 'Zonal Treasury Branch',
  },
  {
    name: 'Indian Bank',
    short: 'IDIB',
    ifscPrefix: 'IDIB000',
    branchSuffix: 'Main Treasury Branch',
  },
  {
    name: 'Bank of India',
    short: 'BKID',
    ifscPrefix: 'BKID000',
    branchSuffix: 'Mid-Corporate Branch',
  },
  {
    name: 'Central Bank of India',
    short: 'CBIN',
    ifscPrefix: 'CBIN028',
    branchSuffix: 'Regional Main Branch',
  },
] as const;

export interface CompleteSeedDataset {
  institutions: Institution[];
  fdrs: FdrRecord[];
  documents: PortalDocument[];
  discrepancies: DiscrepancyRecord[];
  renewals: RenewalRecord[];
  releases: ReleaseRefundRequest[];
  submissions: WorkflowSubmission[];
  notifications: PortalNotification[];
  auditLogs: AuditLogEntry[];
  users: UserProfile[];
  systemConfig: SystemConfiguration;
}

export function generateDeterministicSeedData(): CompleteSeedDataset {
  // 1. 20 Realistic Indian Technical Institutions
  const rawInstitutions: Array<{
    id: string;
    permId: string;
    name: string;
    state: string;
    district: string;
    region: AICTERegion;
    cat: InstitutionCategory;
    type: InstitutionType;
    person: string;
    email: string;
    phone: string;
    regStatus: 'Active' | 'Pending' | 'Deactivated';
    compStatus: Institution['complianceStatus'];
  }> = [
    {
      id: 'INST-1001',
      permId: '1-418290311',
      name: 'Vidarbha Institute of Engineering & Technology',
      state: 'Maharashtra',
      district: 'Nagpur',
      region: 'WEST',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Rajeshwar Deshmukh',
      email: 'registrar@vietnagpur.edu.in',
      phone: '+91-712-2801400',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1002',
      permId: '1-772910455',
      name: 'Karnataka College of Pharmacy & Research',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      region: 'SOUTH_WEST',
      cat: 'PHARMACY',
      type: 'AUTONOMOUS',
      person: 'Prof. Anitha Murthy',
      email: 'principal@kcprbengaluru.ac.in',
      phone: '+91-80-26591220',
      regStatus: 'Active',
      compStatus: 'AT_RISK',
    },
    {
      id: 'INST-1003',
      permId: '1-903811209',
      name: 'Northern School of Management & Computer Applications',
      state: 'Uttar Pradesh',
      district: 'Gautam Buddha Nagar',
      region: 'NORTH',
      cat: 'MANAGEMENT',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Vivek Srivastava',
      email: 'nodal.aicte@nsmca.edu.in',
      phone: '+91-120-4510900',
      regStatus: 'Active',
      compStatus: 'NON_COMPLIANT',
    },
    {
      id: 'INST-1004',
      permId: '1-334918201',
      name: 'Chennai Institute of Aeronautical & Mechanical Sciences',
      state: 'Tamil Nadu',
      district: 'Chengalpattu',
      region: 'SOUTH',
      cat: 'ENGINEERING',
      type: 'AUTONOMOUS',
      person: 'Dr. S. Subramanian',
      email: 'dean@ciamschennai.edu.in',
      phone: '+91-44-27451900',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1005',
      permId: '1-552019482',
      name: 'Deccan College of Architecture & Town Planning',
      state: 'Maharashtra',
      district: 'Pune',
      region: 'WEST',
      cat: 'ARCHITECTURE',
      type: 'GOVT_AIDED',
      person: 'Ar. Milind Kulkarni',
      email: 'director@dcatppune.org.in',
      phone: '+91-20-25531800',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1006',
      permId: '1-618293044',
      name: 'Kakatiya Institute of Technology & Applied Sciences',
      state: 'Telangana',
      district: 'Hanamkonda',
      region: 'SOUTH_CENTRAL',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. K. Venkat Reddy',
      email: 'principal@kitaswarangal.ac.in',
      phone: '+91-870-2564810',
      regStatus: 'Active',
      compStatus: 'PENDING_SCRUTINY',
    },
    {
      id: 'INST-1007',
      permId: '1-219048571',
      name: 'Sabarmati School of Business & Informatics',
      state: 'Gujarat',
      district: 'Ahmedabad',
      region: 'CENTRAL',
      cat: 'MANAGEMENT',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Hitesh Patel',
      email: 'registrar@ssbiahmedabad.edu.in',
      phone: '+91-79-26309122',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1008',
      permId: '1-819204756',
      name: 'Hooghly Technical Campus of Engineering & MCA',
      state: 'West Bengal',
      district: 'Hooghly',
      region: 'EAST',
      cat: 'MCA',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Prof. Debashis Chatterjee',
      email: 'admin@htcewb.ac.in',
      phone: '+91-33-26804119',
      regStatus: 'Active',
      compStatus: 'AT_RISK',
    },
    {
      id: 'INST-1009',
      permId: '1-109283745',
      name: 'Aravalli College of Engineering & Robotics',
      state: 'Rajasthan',
      district: 'Jaipur',
      region: 'NORTH_WEST',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Mahendra Rathore',
      email: 'nodal@aravallieng.edu.in',
      phone: '+91-141-2781920',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1010',
      permId: '1-492018374',
      name: 'Malabar Institute of Pharmaceutical Sciences',
      state: 'Kerala',
      district: 'Kozhikode',
      region: 'SOUTH_WEST',
      cat: 'PHARMACY',
      type: 'AUTONOMOUS',
      person: 'Dr. Thomas Mathew',
      email: 'office@malabarpharma.ac.in',
      phone: '+91-495-2356100',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1011',
      permId: '1-738291045',
      name: 'Malwa Institute of Science & Technology',
      state: 'Madhya Pradesh',
      district: 'Indore',
      region: 'CENTRAL',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Prakash Joshi',
      email: 'registrar@malwaist.edu.in',
      phone: '+91-731-4029180',
      regStatus: 'Active',
      compStatus: 'PENDING_SCRUTINY',
    },
    {
      id: 'INST-1012',
      permId: '1-583920192',
      name: 'Sutlej Institute of Hotel Management & Catering Technology',
      state: 'Punjab',
      district: 'Ludhiana',
      region: 'NORTH_WEST',
      cat: 'HOTEL_MANAGEMENT',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Prof. Gurpreet Singh Gill',
      email: 'director@sutlejihm.edu.in',
      phone: '+91-161-2459812',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1013',
      permId: '1-664738291',
      name: 'Kalinga College of Computer & Management Studies',
      state: 'Odisha',
      district: 'Khordha',
      region: 'EAST',
      cat: 'MCA',
      type: 'DEEMED_UNIVERSITY',
      person: 'Dr. Bijay Kumar Mohanty',
      email: 'registrar@kalingaccms.ac.in',
      phone: '+91-674-2725110',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1014',
      permId: '1-992837461',
      name: 'Indraprastha Academy of Technical Education',
      state: 'Delhi',
      district: 'New Delhi',
      region: 'NORTH_WEST',
      cat: 'ENGINEERING',
      type: 'GOVT_AIDED',
      person: 'Dr. Ritu Verma',
      email: 'principal@iate-delhi.ac.in',
      phone: '+91-11-26589100',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1015',
      permId: '1-309182736',
      name: 'Coimbatore School of Advanced Manufacturing',
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      region: 'SOUTH',
      cat: 'ENGINEERING',
      type: 'AUTONOMOUS',
      person: 'Dr. R. Karthikeyan',
      email: 'admin@csamcoimbatore.edu.in',
      phone: '+91-422-2578190',
      regStatus: 'Active',
      compStatus: 'AT_RISK',
    },
    {
      id: 'INST-1016',
      permId: '1-847362519',
      name: 'Brahmaputra Valley College of Engineering',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      region: 'EAST',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Nabajyoti Bora',
      email: 'principal@bvceguwahati.ac.in',
      phone: '+91-361-2540911',
      regStatus: 'Pending',
      compStatus: 'PENDING_SCRUTINY',
    },
    {
      id: 'INST-1017',
      permId: '1-293847561',
      name: 'Magadh Institute of Pharmacy & Life Sciences',
      state: 'Bihar',
      district: 'Patna',
      region: 'NORTH',
      cat: 'PHARMACY',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Sanjay Kumar Sinha',
      email: 'director@miplspatna.org.in',
      phone: '+91-612-2284910',
      regStatus: 'Active',
      compStatus: 'NON_COMPLIANT',
    },
    {
      id: 'INST-1018',
      permId: '1-475869302',
      name: 'Sahyadri School of Architecture & Urban Design',
      state: 'Karnataka',
      district: 'Dakshina Kannada',
      region: 'SOUTH_WEST',
      cat: 'ARCHITECTURE',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Ar. Deepak Shetty',
      email: 'dean@sahyadriarch.edu.in',
      phone: '+91-824-2274900',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1019',
      permId: '1-516273849',
      name: 'Godavari Institute of Management & Technology',
      state: 'Andhra Pradesh',
      district: 'East Godavari',
      region: 'SOUTH_CENTRAL',
      cat: 'MANAGEMENT',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. P. Srinivas Rao',
      email: 'registrar@gimtrajahmundry.ac.in',
      phone: '+91-883-2471920',
      regStatus: 'Active',
      compStatus: 'COMPLIANT',
    },
    {
      id: 'INST-1020',
      permId: '1-627384950',
      name: 'Shivalik College of Technical & Applied Studies',
      state: 'Uttarakhand',
      district: 'Dehradun',
      region: 'NORTH',
      cat: 'ENGINEERING',
      type: 'PRIVATE_SELF_FINANCED',
      person: 'Dr. Alok Nautiyal',
      email: 'info@shivalikctas.edu.in',
      phone: '+91-135-2771940',
      regStatus: 'Deactivated',
      compStatus: 'NON_COMPLIANT',
    },
  ];

  const institutions: Institution[] = rawInstitutions.map((item, idx) => ({
    institutionId: item.id,
    aictePermanentId: item.permId,
    name: item.name,
    state: item.state,
    district: item.district,
    region: item.region,
    category: item.cat,
    institutionType: item.type,
    contactPerson: item.person,
    contactEmail: item.email,
    contactPhone: item.phone,
    address: `Plot ${12 + idx}, Institutional Sector, ${item.district}, ${item.state}`,
    registrationStatus: item.regStatus,
    complianceStatus: item.compStatus,
    ownerUid: 'demo_seed_user',
    orgId: 'AICTE',
    createdAt: `2025-0${(idx % 9) + 1}-15T09:00:00Z`,
    updatedAt: `2026-10-${10 + (idx % 18)}T11:30:00Z`,
  }));

  // 2. 50 Coherent FDR Records across 8 Issuing Banks
  // Distribution across the 50 FDRs:
  // - Indices 0..9 (10 records): Pending Verifications ('Verification Pending' / 'Under Review')
  // - Indices 10..17 (8 records): Discrepancy Found (linked to 8 Discrepancy records)
  // - Indices 18..25 (8 records): Expiring within 30 / 15 / 7 days
  // - Indices 26..31 (6 records): Matured FDRs
  // - Indices 32..39 (8 records): Renewal Pending / Renewed (linked to 8 Renewal records)
  // - Indices 40..44 (5 records): Release Requested / Released (linked to 5 Release/Refund requests)
  // - Indices 45..49 (5 records): Verified Active standard instruments
  const depositAmounts = [1500000, 3500000, 5000000, 2000000, 1000000, 4000000];
  const programCategories = [
    'B.Tech Engineering & Technology (New Intake)',
    'MBA Post Graduate Programme Security Deposit',
    'B.Pharm Statutory Security Deposit',
    'M.Tech AI & Data Science Additional Intake',
    'MCA Computer Applications Statutory Deposit',
    'B.Arch Statutory Council Security Deposit',
  ];

  const fdrs: FdrRecord[] = [];
  const documents: PortalDocument[] = [];

  for (let i = 0; i < 50; i++) {
    const inst = institutions[i % institutions.length];
    const bank = EIGHT_ISSUING_BANKS[i % EIGHT_ISSUING_BANKS.length];
    const principal = depositAmounts[i % depositAmounts.length];
    const rate = 6.75 + (i % 5) * 0.15;
    const maturityAmt = Math.round(principal * 1.68);
    const fdrId = `FDR-${2026001 + i}`;
    const fdrNumber = `${bank.short}-FD-${39810200 + i * 137}`;
    const ifscCode = `${bank.ifscPrefix}${1000 + i}`;

    let issueDate = '2020-06-15';
    let maturityDate = '2028-06-15';
    let adminStatus: FdrAdminStatus = 'Active';
    let verificationStatus: FdrVerificationStatus = 'Verified';
    let legacyStatus: FdrStatus = 'VERIFIED_ACTIVE';
    let bankVerifStatus: FdrRecord['bankVerificationStatus'] = 'BANK CONFIRMED';
    let jointStatus: FdrRecord['jointHolderStatus'] = 'JOINT_WITH_AICTE';
    let remarks = 'Verified joint lien with Regional Officer, AICTE.';

    if (i < 10) {
      // 10 Pending Verifications
      issueDate = addDays(BASE_REF_DATE, -(20 + i * 3));
      maturityDate = addDays(BASE_REF_DATE, 365 * 8 - (20 + i * 3));
      adminStatus = i % 2 === 0 ? 'Verification Pending' : 'Under Review';
      verificationStatus = i % 2 === 0 ? 'Verification Pending' : 'Under Scrutiny';
      legacyStatus = i % 2 === 0 ? 'SUBMITTED' : 'UNDER_SCRUTINY';
      bankVerifStatus = i % 3 === 0 ? 'CBS BANK VERIFIED' : 'NOT VERIFIED';
      remarks = 'Submitted by institution; queued for Scrutiny Officer verification.';
    } else if (i < 18) {
      // 8 Discrepancies
      issueDate = addDays(BASE_REF_DATE, -(45 + i * 2));
      maturityDate = addDays(BASE_REF_DATE, 365 * 8);
      adminStatus = 'Discrepancy Found';
      verificationStatus = 'Discrepancy Found';
      legacyStatus = 'DISCREPANCY_RAISED';
      bankVerifStatus = 'MANUAL CONFIRMATION REQUIRED';
      jointStatus = i % 2 === 0 ? 'SOLE_INSTITUTION' : 'UNDER_LIEN_VERIFICATION';
      remarks = 'Discrepancy flagged during document & joint-holder scrutiny.';
    } else if (i < 26) {
      // 8 Expiring FDRs (within 30, 15, and 7 days from BASE_REF_DATE)
      const expOffsets = [4, 6, 7, 11, 14, 19, 24, 28];
      const daysRemaining = expOffsets[i - 18];
      issueDate = addDays(BASE_REF_DATE, -(365 * 8 - daysRemaining));
      maturityDate = addDays(BASE_REF_DATE, daysRemaining);
      adminStatus = 'Expiring';
      verificationStatus = 'Verified';
      legacyStatus = 'MATURING_SOON';
      bankVerifStatus = 'BANK CONFIRMED';
      remarks = `Expiring in ${daysRemaining} days. Statutory renewal alert triggered.`;
    } else if (i < 32) {
      // 6 Matured FDRs
      const pastDays = [5, 12, 18, 25, 40, 62][i - 26];
      issueDate = addDays(BASE_REF_DATE, -(365 * 8 + pastDays));
      maturityDate = addDays(BASE_REF_DATE, -pastDays);
      adminStatus = 'Matured';
      verificationStatus = 'Verified';
      legacyStatus = 'MATURED';
      bankVerifStatus = 'BANK CONFIRMED';
      remarks = `Matured ${pastDays} days ago. Overdue renewal action required.`;
    } else if (i < 40) {
      // 8 Renewal Pending / Renewed
      const isAlreadyRenewed = (i - 32) >= 4;
      issueDate = isAlreadyRenewed ? '2026-09-01' : '2018-11-10';
      maturityDate = isAlreadyRenewed ? '2034-09-01' : addDays(BASE_REF_DATE, 10 + (i - 32));
      adminStatus = isAlreadyRenewed ? 'Renewed' : 'Renewal Pending';
      verificationStatus = isAlreadyRenewed ? 'Verified' : 'Under Scrutiny';
      legacyStatus = 'RENEWAL_INITIATED';
      bankVerifStatus = 'BANK CONFIRMED';
      remarks = isAlreadyRenewed
        ? 'Renewal approved; linked to predecessor FDR instrument.'
        : 'Renewal endorsement submitted by institution; awaiting AICTE approval.';
    } else if (i < 45) {
      // 5 Release Requested / Released
      const isReleased = i === 44;
      issueDate = '2017-07-01';
      maturityDate = '2025-07-01';
      adminStatus = isReleased ? 'Released' : 'Release Requested';
      verificationStatus = 'Verified';
      legacyStatus = isReleased ? 'RELEASED' : 'RELEASE_REQUESTED';
      bankVerifStatus = 'BANK CONFIRMED';
      remarks = isReleased
        ? 'Statutory lock-in completed; NOC issued and security deposit released.'
        : 'Release/refund request under statutory authority review.';
    } else {
      // 5 Active Verified
      issueDate = `202${1 + (i % 4)}-0${(i % 8) + 1}-12`;
      maturityDate = `203${(i % 4)}-0${(i % 8) + 1}-12`;
      adminStatus = 'Active';
      verificationStatus = 'Verified';
      legacyStatus = 'VERIFIED_ACTIVE';
      bankVerifStatus = 'BANK CONFIRMED';
    }

    const docName = `${bank.short}_FDR_${2026001 + i}_Certificate.pdf`;

    fdrs.push({
      fdrId,
      fdrNumber,
      referenceNumber: `AICTE/SD/2026/${1000 + i}`,
      institutionId: inst.institutionId,
      institutionName: inst.name,
      aictePermanentId: inst.aictePermanentId,
      bankName: bank.name,
      branchName: `${bank.branchSuffix}, ${inst.district}`,
      ifscCode,
      principalAmount: principal,
      maturityAmount: maturityAmt,
      interestRate: Number(rate.toFixed(2)),
      issueDate,
      maturityDate,
      beneficiaryName: `Jointly: Principal ${inst.name} & Regional Officer AICTE (${inst.region})`,
      programCategory: programCategories[i % programCategories.length],
      depositCategory: i % 2 === 0 ? 'New Institution Security Deposit' : 'Additional Intake Deposit',
      jointHolderStatus: jointStatus,
      status: legacyStatus,
      adminStatus,
      verificationStatus,
      bankVerificationStatus: bankVerifStatus,
      assignedOfficer: i % 2 === 0 ? 'Shri Arvind Kumar (Scrutiny Officer)' : 'Smt. Meenakshi Iyer (Scrutiny Officer)',
      lineageStage:
        i >= 32 && i < 36
          ? 'Renewal 1'
          : i >= 36 && i < 40
          ? 'Current Active Instrument'
          : 'Original FDR',
      previousFdrId: i >= 32 && i < 40 ? `FDR-${2026001 + (i - 16)}` : undefined,
      documentName: docName,
      documentUrl: `/vault/fdr/${docName}`,
      remarks,
      observations: [
        {
          id: `obs_${i}_1`,
          authorName: 'Shri Arvind Kumar',
          authorRole: 'Scrutiny Officer',
          timestamp: '2026-10-22T10:15:00Z',
          note: remarks,
        },
      ],
      ownerUid: 'demo_seed_user',
      orgId: 'AICTE',
      createdAt: `${issueDate}T10:00:00Z`,
      updatedAt: '2026-10-29T14:30:00Z',
    });

    const docCategories: PortalDocument['category'][] = [
      'Original FDR',
      'Bank Confirmation',
      'Deposit Certificate',
      'Renewal Document',
      'Replacement FDR',
      'Release Supporting Document',
      'Other Supporting Document',
    ];

    documents.push({
      documentId: `DOC-${3001 + i}`,
      fdrId,
      fdrNumber,
      institutionId: inst.institutionId,
      institutionName: inst.name,
      category: docCategories[i % docCategories.length],
      fileName: docName,
      fileType: i % 5 === 0 ? 'PNG' : 'PDF',
      fileSize: `${420 + (i % 9) * 65} KB`,
      uploadedAt: '2026-10-18T11:20:00Z',
      uploadedBy: inst.contactPerson || inst.contactEmail,
      verificationStatus:
        adminStatus === 'Discrepancy Found'
          ? 'Discrepancy Flagged'
          : adminStatus === 'Verification Pending'
          ? 'Pending'
          : 'Verified',
      currentVersion: i % 6 === 0 ? 2 : 1,
      versions:
        i % 6 === 0
          ? [
              {
                versionNumber: 1,
                fileName: `v1_${docName}`,
                fileSize: '390 KB',
                uploadedAt: '2026-10-10T09:00:00Z',
                uploadedBy: inst.contactPerson || inst.contactEmail,
                notes: 'Initial scanned copy uploaded.',
              },
              {
                versionNumber: 2,
                fileName: docName,
                fileSize: '485 KB',
                uploadedAt: '2026-10-18T11:20:00Z',
                uploadedBy: inst.contactPerson || inst.contactEmail,
                notes: 'High-resolution bank-stamped endorsement re-uploaded.',
              },
            ]
          : [
              {
                versionNumber: 1,
                fileName: docName,
                fileSize: '420 KB',
                uploadedAt: '2026-10-18T11:20:00Z',
                uploadedBy: inst.contactPerson || inst.contactEmail,
                notes: 'Original bank-stamped FDR certificate.',
              },
            ],
    });
  }

  // 3. 8 Discrepancy Records linked to FDR indices 10..17
  const discrepancyTypes: DiscrepancyType[] = [
    'Amount mismatch',
    'FDR number mismatch',
    'Bank mismatch',
    'Maturity date mismatch',
    'Missing information',
    'Duplicate instrument',
    'Document unreadable',
    'Potential document anomaly',
  ];
  const severities: DiscrepancySeverity[] = [
    'Critical',
    'High',
    'Medium',
    'High',
    'Medium',
    'Critical',
    'Low',
    'Critical',
  ];

  const discrepancies: DiscrepancyRecord[] = fdrs.slice(10, 18).map((fdr, idx) => ({
    discrepancyId: `DISC-2026-0${idx + 1}`,
    fdrId: fdr.fdrId,
    fdrNumber: fdr.fdrNumber,
    institutionId: fdr.institutionId,
    institutionName: fdr.institutionName,
    discrepancyType: discrepancyTypes[idx],
    severity: severities[idx],
    detectionDate: addDays(BASE_REF_DATE, -(12 - idx)),
    assignedOfficer: idx % 2 === 0 ? 'Shri Arvind Kumar' : 'Smt. Meenakshi Iyer',
    resolutionStatus: idx === 7 ? 'Under Investigation' : idx === 6 ? 'Clarification Requested' : 'Open',
    description: `Scrutiny comparison detected ${discrepancyTypes[idx].toLowerCase()} on ${fdr.fdrNumber} (${fdr.bankName}). Institutional clarification and bank confirmation letter required.`,
    expectedValue:
      idx === 0
        ? '₹35,00,000'
        : idx === 1
        ? fdr.fdrNumber
        : 'Joint Holder: Regional Officer AICTE',
    actualValue:
      idx === 0
        ? '₹30,00,000 (on scanned receipt)'
        : idx === 1
        ? `${fdr.fdrNumber}-ERR`
        : 'Sole Holder: Institution Trust Only',
    history: [
      {
        id: `dh_${idx}_1`,
        actor: 'Shri Arvind Kumar',
        role: 'Scrutiny Officer',
        action: 'Discrepancy Detected',
        timestamp: `${addDays(BASE_REF_DATE, -(12 - idx))}T10:30:00Z`,
        remarks: `Flagged ${discrepancyTypes[idx]} during AI & manual verification.`,
      },
    ],
  }));

  // 4. 8 Renewal Records linked to FDR indices 32..39
  const renewals: RenewalRecord[] = fdrs.slice(32, 40).map((fdr, idx) => {
    const origFdr = fdrs[18 + idx];
    const isApproved = idx >= 4;
    return {
      renewalId: `REN-2026-0${idx + 1}`,
      originalFdrId: origFdr.fdrId,
      originalFdrNumber: origFdr.fdrNumber,
      newFdrId: fdr.fdrId,
      newFdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      bankName: fdr.bankName,
      previousAmount: origFdr.principalAmount,
      newAmount: fdr.principalAmount + 250000,
      previousMaturityDate: origFdr.maturityDate,
      newMaturityDate: '2034-10-30',
      requestType: idx % 3 === 0 ? 'Replacement' : 'Renewal',
      status: isApproved
        ? 'Approved'
        : idx === 2
        ? 'Additional Documents Requested'
        : 'Under Scrutiny',
      submittedAt: addDays(BASE_REF_DATE, -(15 - idx)),
      reviewedBy: isApproved ? 'Dr. R. K. Chauhan (Senior Approving Officer)' : 'Shri Arvind Kumar',
      observations: isApproved
        ? 'Continuity of 8-year lock-in verified; joint lien preserved on renewed receipt.'
        : 'Verifying renewed maturity value and bank manager endorsement seal.',
      documentName: `Renewal_Endorsement_${fdr.fdrNumber}.pdf`,
    };
  });

  // 5. 5 Release / Refund Requests linked to FDR indices 40..44
  const releaseStages: ReleaseRefundRequest['stage'][] = [
    'SUBMITTED',
    'UNDER_DOCUMENT_REVIEW',
    'ELIGIBILITY_SCRUTINY',
    'PENDING_AUTHORITY_APPROVAL',
    'RELEASED',
  ];

  const releases: ReleaseRefundRequest[] = fdrs.slice(40, 45).map((fdr, idx) => ({
    requestId: `REL-2026-0${idx + 1}`,
    referenceNo: `AICTE/NOC/2026/80${idx + 1}`,
    fdrId: fdr.fdrId,
    fdrNumber: fdr.fdrNumber,
    institutionId: fdr.institutionId,
    institutionName: fdr.institutionName,
    aictePermanentId: fdr.aictePermanentId,
    bankName: fdr.bankName,
    depositAmount: fdr.principalAmount,
    issueDate: fdr.issueDate,
    maturityDate: fdr.maturityDate,
    reason:
      'Mandatory 8-year statutory lock-in period completed with zero pending court/fee liabilities.',
    supportingDocument: `NOC_Application_${fdr.fdrNumber}.pdf`,
    stage: releaseStages[idx],
    submittedAt: addDays(BASE_REF_DATE, -(20 - idx * 2)),
    updatedAt: addDays(BASE_REF_DATE, -(5 - idx)),
    eligibilityCheck: {
      lockInCompleted: true,
      noActiveDiscrepancy: true,
      jointLienVerified: true,
    },
    timeline: [
      {
        id: `rel_step_${idx}_1`,
        stage: 'SUBMITTED',
        officerName: 'Institutional Nodal Officer',
        officerRole: 'INSTITUTION_ADMIN',
        timestamp: `${addDays(BASE_REF_DATE, -(20 - idx * 2))}T09:30:00Z`,
        action: 'Release Request Submitted',
        remarks: 'Uploaded governing body resolution and bank maturity certificate.',
      },
      ...(idx >= 1
        ? [
            {
              id: `rel_step_${idx}_2`,
              stage: 'UNDER_DOCUMENT_REVIEW' as const,
              officerName: 'Shri Arvind Kumar',
              officerRole: 'AICTE_SCRUTINY_OFFICER',
              timestamp: `${addDays(BASE_REF_DATE, -(14 - idx))}T14:10:00Z`,
              action: 'Document Verification Completed',
              remarks: 'Verified original approval letter and 8-year tenure completion.',
            },
          ]
        : []),
      ...(idx === 4
        ? [
            {
              id: `rel_step_${idx}_3`,
              stage: 'RELEASED' as const,
              officerName: 'Dr. R. K. Chauhan',
              officerRole: 'SENIOR_APPROVING_OFFICER',
              timestamp: `${addDays(BASE_REF_DATE, -2)}T16:45:00Z`,
              action: 'Statutory Release Sanctioned',
              remarks: 'NOC issued to Scheduled Bank for joint-lien release.',
            },
          ]
        : []),
    ],
  }));

  // 6. Workflow Submissions (Mirroring active cases for existing views)
  const submissions: WorkflowSubmission[] = fdrs.slice(0, 15).map((fdr, idx) => ({
    submissionId: `SUB-2026-${101 + idx}`,
    referenceNo: `AICTE/FDR/2026/${40100 + idx}`,
    submissionType:
      idx < 6
        ? 'NEW_FDR'
        : idx < 9
        ? 'DISCREPANCY_RESPONSE'
        : idx < 12
        ? 'RENEWAL'
        : 'RELEASE_REFUND',
    fdrId: fdr.fdrId,
    fdrNumber: fdr.fdrNumber,
    institutionId: fdr.institutionId,
    institutionName: fdr.institutionName,
    amount: fdr.principalAmount,
    bankName: fdr.bankName,
    status:
      idx < 4
        ? 'SUBMITTED'
        : idx < 8
        ? 'SCRUTINY_IN_PROGRESS'
        : idx < 11
        ? 'DISCREPANCY_FLAGGED'
        : idx < 13
        ? 'FORWARDED_TO_SENIOR'
        : 'APPROVED',
    assignedRole:
      idx >= 11 ? 'SENIOR_APPROVING_OFFICER' : 'AICTE_SCRUTINY_OFFICER',
    notes: fdr.remarks,
    ownerUid: 'demo_seed_user',
    orgId: 'AICTE',
    createdAt: `${addDays(BASE_REF_DATE, -(25 - idx))}T10:00:00Z`,
    updatedAt: `${addDays(BASE_REF_DATE, -(5 - (idx % 5)))}T15:00:00Z`,
  }));

  // 7. 20 Notifications covering all 13 Notification Types
  const allNotifTypes: NotificationType[] = [
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

  const notifications: PortalNotification[] = Array.from({ length: 20 }).map((_, idx) => {
    const fdr = fdrs[idx % fdrs.length];
    const nType = allNotifTypes[idx % allNotifTypes.length];
    const severity: PortalNotification['severity'] =
      nType === 'Discrepancy found' || nType === 'FDR matured' || nType === 'Overdue case'
        ? 'CRITICAL'
        : nType === 'Maturity approaching' ||
          nType === 'Renewal required' ||
          nType === 'Pending officer action'
        ? 'WARNING'
        : nType === 'FDR verification completed' || nType === 'Refund request approved'
        ? 'SUCCESS'
        : 'INFO';

    return {
      notificationId: `NOTIF-${5001 + idx}`,
      title: `${nType} — ${fdr.fdrNumber}`,
      message: `${nType} for ${fdr.institutionName} (${fdr.bankName}, ₹${fdr.principalAmount.toLocaleString('en-IN')}). Click to inspect record ${fdr.fdrId}.`,
      notificationType: nType,
      severity,
      category:
        nType.includes('Maturity') || nType.includes('matured') || nType.includes('Renewal')
          ? 'MATURITY_ALERT'
          : nType.includes('Discrepancy')
          ? 'DISCREPANCY'
          : nType.includes('Refund')
          ? 'RELEASE_APPROVAL'
          : 'SCRUTINY_UPDATE',
      targetRole: idx % 3 === 0 ? 'INSTITUTION_ADMIN' : 'ALL',
      institutionId: fdr.institutionId,
      relatedRecordId: fdr.fdrId,
      relatedPath: '/admin/fdr-repository',
      recipientUid: 'demo_seed_user',
      readStatus: idx >= 8,
      orgId: 'AICTE',
      createdAt: `${addDays(BASE_REF_DATE, -(19 - idx))}T09:${10 + idx}:00Z`,
    };
  });

  // 8. 30 Audit Events covering all statutory actions with previous/new values
  const auditActions = [
    { action: 'FDR_CREATED', mod: 'FDR Submissions', prev: 'None', next: 'Submitted' },
    { action: 'DOCUMENT_UPLOADED', mod: 'Document Vault', prev: 'None', next: 'v1 Uploaded' },
    { action: 'BANK_CBS_VERIFIED', mod: 'Bank Verification', prev: 'NOT VERIFIED', next: 'CBS BANK VERIFIED' },
    { action: 'DISCREPANCY_DETECTED', mod: 'Discrepancy Centre', prev: 'Under Scrutiny', next: 'Discrepancy Found' },
    { action: 'DISCREPANCY_RESOLVED', mod: 'Discrepancy Centre', prev: 'Open', next: 'Resolved' },
    { action: 'RENEWAL_SUBMITTED', mod: 'Renewal Module', prev: 'Expiring', next: 'Renewal Pending' },
    { action: 'RENEWAL_APPROVED', mod: 'Renewal Module', prev: 'Renewal Pending', next: 'Renewed' },
    { action: 'RELEASE_REQUEST_SUBMITTED', mod: 'Release & Refund', prev: 'Active', next: 'SUBMITTED' },
    { action: 'RELEASE_APPROVED', mod: 'Release & Refund', prev: 'PENDING_AUTHORITY_APPROVAL', next: 'RELEASED' },
    { action: 'FDR_STATUS_UPDATED', mod: 'FDR Verification', prev: 'Verification Pending', next: 'Verified' },
  ];

  const auditActors = [
    { name: 'Dr. Anil Sahasrabudhe (Super Admin)', email: 'akthar0109@gmail.com', role: 'SUPER_ADMIN' },
    { name: 'Smt. Vandana Sharma (AICTE Admin)', email: 'admin.fdr@aicte-india.org', role: 'AICTE_ADMIN' },
    { name: 'Shri Arvind Kumar (Scrutiny Officer)', email: 'scrutiny.north@aicte-india.org', role: 'AICTE_SCRUTINY_OFFICER' },
    { name: 'Dr. R. K. Chauhan (Senior Approving Officer)', email: 'approvals.hq@aicte-india.org', role: 'SENIOR_APPROVING_OFFICER' },
    { name: 'Dr. Rajeshwar Deshmukh (Institution Admin)', email: 'registrar@vietnagpur.edu.in', role: 'INSTITUTION_ADMIN' },
  ];

  const auditLogs: AuditLogEntry[] = Array.from({ length: 30 }).map((_, idx) => {
    const fdr = fdrs[idx % fdrs.length];
    const act = auditActions[idx % auditActions.length];
    const actor = auditActors[idx % auditActors.length];
    return {
      logId: `AUDIT-${7001 + idx}`,
      actorUid: `user_${idx % 5}`,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: act.action,
      module: act.mod,
      targetId: fdr.fdrId,
      previousValue: act.prev,
      newValue: act.next,
      summary: `${act.action} on ${fdr.fdrNumber} (${fdr.institutionName}) — Transitioned from [${act.prev}] to [${act.next}].`,
      orgId: 'AICTE',
      createdAt: `${addDays(BASE_REF_DATE, -(29 - idx))}T11:${(10 + idx) % 59}:00Z`,
    };
  });

  // 9. Demo Users across all 5 roles
  const users: UserProfile[] = [
    {
      uid: 'demo_super_admin',
      email: 'akthar0109@gmail.com',
      displayName: 'Director General (Super Admin)',
      role: UserRole.SUPER_ADMIN,
      institutionId: 'AICTE_HQ_DELHI',
      institutionName: 'All India Council for Technical Education (HQ)',
      department: 'Finance & Statutory Deposit Bureau',
      status: 'ACTIVE',
      lastActivity: '2026-10-30T11:40:00Z',
      orgId: 'AICTE',
      createdAt: '2025-01-10T09:00:00Z',
      updatedAt: '2026-10-30T11:40:00Z',
    },
    {
      uid: 'demo_aicte_admin',
      email: 'admin.fdr@aicte-india.org',
      displayName: 'Smt. Vandana Sharma',
      role: UserRole.AICTE_ADMIN,
      institutionId: 'AICTE_HQ_DELHI',
      institutionName: 'AICTE Headquarters, Nelson Mandela Marg',
      department: 'Institutional Compliance & FDR Division',
      status: 'ACTIVE',
      lastActivity: '2026-10-30T10:15:00Z',
      orgId: 'AICTE',
      createdAt: '2025-02-14T09:00:00Z',
      updatedAt: '2026-10-30T10:15:00Z',
    },
    {
      uid: 'demo_scrutiny_officer',
      email: 'scrutiny.north@aicte-india.org',
      displayName: 'Shri Arvind Kumar',
      role: UserRole.AICTE_SCRUTINY_OFFICER,
      institutionId: 'AICTE_RO_WEST',
      institutionName: 'AICTE Scrutiny Cell',
      department: 'Document Verification & Discrepancy Desk',
      status: 'ACTIVE',
      lastActivity: '2026-10-30T09:50:00Z',
      orgId: 'AICTE',
      createdAt: '2025-03-01T09:00:00Z',
      updatedAt: '2026-10-30T09:50:00Z',
    },
    {
      uid: 'demo_senior_officer',
      email: 'approvals.hq@aicte-india.org',
      displayName: 'Dr. R. K. Chauhan',
      role: UserRole.SENIOR_APPROVING_OFFICER,
      institutionId: 'AICTE_HQ_DELHI',
      institutionName: 'AICTE Executive Approval Authority',
      department: 'Statutory Approvals & NOC Sanctioning',
      status: 'ACTIVE',
      lastActivity: '2026-10-29T17:30:00Z',
      orgId: 'AICTE',
      createdAt: '2025-03-10T09:00:00Z',
      updatedAt: '2026-10-29T17:30:00Z',
    },
    {
      uid: 'demo_inst_admin_1',
      email: 'registrar@vietnagpur.edu.in',
      displayName: 'Dr. Rajeshwar Deshmukh',
      role: UserRole.INSTITUTION_ADMIN,
      institutionId: 'INST-1001',
      institutionName: 'Vidarbha Institute of Engineering & Technology',
      department: 'Office of the Principal & Registrar',
      status: 'ACTIVE',
      lastActivity: '2026-10-30T08:45:00Z',
      orgId: 'AICTE',
      createdAt: '2025-04-05T09:00:00Z',
      updatedAt: '2026-10-30T08:45:00Z',
    },
    {
      uid: 'demo_inst_admin_2',
      email: 'principal@kcprbengaluru.ac.in',
      displayName: 'Prof. Anitha Murthy',
      role: UserRole.INSTITUTION_ADMIN,
      institutionId: 'INST-1002',
      institutionName: 'Karnataka College of Pharmacy & Research',
      department: 'Office of the Principal',
      status: 'ACTIVE',
      lastActivity: '2026-10-28T14:20:00Z',
      orgId: 'AICTE',
      createdAt: '2025-04-12T09:00:00Z',
      updatedAt: '2026-10-28T14:20:00Z',
    },
  ];

  const systemConfig: SystemConfiguration = {
    configId: 'global',
    organizationName: 'All India Council for Technical Education (AICTE)',
    bureauName: 'Finance & Statutory Security Deposit Management Bureau',
    headquartersAddress: 'Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070',
    supportEmail: 'helpdesk-fdr@aicte-india.org',
    maturityAlertWindowDays: 30,
    reminderInterval15Days: 15,
    reminderInterval7Days: 7,
    defaultLockInYears: 8,
    requireJointLienVerification: true,
    enableAutoDiscrepancyDetection: true,
    enableEmailNotifications: true,
    enableSmsAlerts: true,
    allowedBankCategories:
      'Scheduled Public Sector & Nationalized Banks (SBI, PNB, BoB, Canara, Union Bank, Indian Bank, BoI, Central Bank)',
    documentCategories: [
      'Original FDR',
      'Bank Confirmation',
      'Deposit Certificate',
      'Renewal Document',
      'Replacement FDR',
      'Release Supporting Document',
      'Other Supporting Document',
    ],
    depositCategories: [
      'New Institution Security Deposit',
      'Additional Intake Deposit',
      'New Programme Statutory Deposit',
      'Renewal Lock-In Extension',
    ],
    escalationSlaHours: 72,
    portalMaintenanceBanner:
      'AICTE Statutory Security Deposit & FDR Lifecycle Management Portal — AY 2026-27 Active',
    updatedByUid: 'demo_super_admin',
    orgId: 'AICTE',
    updatedAt: '2026-10-30T09:00:00Z',
  };

  return {
    institutions,
    fdrs,
    documents,
    discrepancies,
    renewals,
    releases,
    submissions,
    notifications,
    auditLogs,
    users,
    systemConfig,
  };
}
