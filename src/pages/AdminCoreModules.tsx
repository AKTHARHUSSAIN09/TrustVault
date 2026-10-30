import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  Power,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  AICTERegion,
  ComplianceStatus,
  DocumentCategory,
  FdrStatus,
  Institution,
  InstitutionCategory,
  InstitutionType,
  JointHolderStatus,
  PortalDocument,
  RegistrationStatus,
  UserRole,
} from '../types/fdr';
import {
  EmptyStateView,
  FilterBar,
  ModalDialog,
  PageHeader,
  SemanticStatusText,
  StatStrip,
  TableLoadingSkeleton,
  formatDateShort,
  formatINR,
} from '../components/ui/EnterpriseComponents';

const ALL_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Original FDR',
  'Bank Confirmation',
  'Deposit Certificate',
  'Renewal Document',
  'Replacement FDR',
  'Release Supporting Document',
  'Other Supporting Document',
];

const ALL_INSTITUTION_TYPES: InstitutionType[] = [
  'PRIVATE_SELF_FINANCED',
  'DEEMED_UNIVERSITY',
  'GOVT_AIDED',
  'AUTONOMOUS',
];

const ALL_INSTITUTION_CATEGORIES: InstitutionCategory[] = [
  'ENGINEERING',
  'MANAGEMENT',
  'PHARMACY',
  'ARCHITECTURE',
  'MCA',
  'HOTEL_MANAGEMENT',
];

const ALL_FDR_STATUSES: FdrStatus[] = [
  'SUBMITTED',
  'UNDER_SCRUTINY',
  'VERIFIED_ACTIVE',
  'DISCREPANCY_RAISED',
  'MATURING_SOON',
  'MATURED',
  'RENEWAL_INITIATED',
  'RELEASE_REQUESTED',
  'RELEASED',
];

// ============================================================================
// 1. SECTION 3 — INSTITUTION MANAGEMENT PAGE
// ============================================================================
export const AdminInstitutionsPage: React.FC = () => {
  const {
    institutions,
    fdrs,
    documents,
    renewals,
    releases,
    notifications,
    auditLogs,
    isLoadingData,
    createInstitution,
    updateInstitutionDetails,
    toggleInstitutionActivation,
    setSelectedFdrForDrawer,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'state' | 'activeFdrs' | 'depositValue'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [selectedInstitutionProfile, setSelectedInstitutionProfile] =
    useState<Institution | null>(null);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [formState, setFormState] = useState({
    aictePermanentId: '1-9845120901',
    name: '',
    institutionType: 'PRIVATE_SELF_FINANCED' as InstitutionType,
    category: 'ENGINEERING' as InstitutionCategory,
    state: 'Maharashtra',
    district: 'Pune',
    region: 'WEST' as AICTERegion,
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    registrationStatus: 'Active' as RegistrationStatus,
    complianceStatus: 'COMPLIANT' as ComplianceStatus,
  });

  const enrichedInstitutions = useMemo(() => {
    return institutions.map((inst) => {
      const instFdrs = fdrs.filter((f) => f.institutionId === inst.institutionId);
      const activeCount = instFdrs.filter((f) => f.status !== 'RELEASED').length;
      const totalVal = instFdrs.reduce(
        (sum, f) => sum + (Number(f.principalAmount) || 0),
        0
      );
      return {
        ...inst,
        computedActiveFdrs: activeCount,
        computedTotalDeposit: totalVal,
      };
    });
  }, [institutions, fdrs]);

  const uniqueStates = useMemo(
    () => Array.from(new Set(institutions.map((i) => i.state))).sort(),
    [institutions]
  );

  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = enrichedInstitutions.filter((inst) => {
      const matchesSearch =
        !q ||
        inst.name.toLowerCase().includes(q) ||
        inst.aictePermanentId.toLowerCase().includes(q) ||
        inst.contactEmail.toLowerCase().includes(q) ||
        inst.contactPhone.toLowerCase().includes(q) ||
        (inst.district || '').toLowerCase().includes(q);
      const matchesState = stateFilter === 'ALL' || inst.state === stateFilter;
      const matchesType =
        typeFilter === 'ALL' || inst.institutionType === typeFilter || inst.category === typeFilter;
      const matchesStatus =
        statusFilter === 'ALL' || (inst.registrationStatus || 'Active') === statusFilter;
      return matchesSearch && matchesState && matchesType && matchesStatus;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'state') cmp = a.state.localeCompare(b.state);
      else if (sortBy === 'activeFdrs') cmp = a.computedActiveFdrs - b.computedActiveFdrs;
      else if (sortBy === 'depositValue')
        cmp = a.computedTotalDeposit - b.computedTotalDeposit;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [
    enrichedInstitutions,
    searchQuery,
    stateFilter,
    typeFilter,
    statusFilter,
    sortBy,
    sortAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / pageSize));
  const paginatedInstitutions = filteredInstitutions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const openEditModal = (inst: Institution) => {
    setEditingInstitution(inst);
    setFormState({
      aictePermanentId: inst.aictePermanentId,
      name: inst.name,
      institutionType: inst.institutionType || 'PRIVATE_SELF_FINANCED',
      category: inst.category || 'ENGINEERING',
      state: inst.state,
      district: inst.district || inst.state,
      region: inst.region,
      contactPerson: inst.contactPerson || 'Dr. S. K. Deshmukh',
      contactEmail: inst.contactEmail,
      contactPhone: inst.contactPhone,
      address: inst.address,
      registrationStatus: inst.registrationStatus || 'Active',
      complianceStatus: inst.complianceStatus,
    });
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstitution) {
      await updateInstitutionDetails(editingInstitution.institutionId, {
        aictePermanentId: formState.aictePermanentId,
        name: formState.name,
        institutionType: formState.institutionType,
        category: formState.category,
        state: formState.state,
        district: formState.district,
        region: formState.region,
        contactPerson: formState.contactPerson,
        contactEmail: formState.contactEmail,
        contactPhone: formState.contactPhone,
        address: formState.address,
        registrationStatus: formState.registrationStatus,
        complianceStatus: formState.complianceStatus,
      });
      setEditingInstitution(null);
    } else {
      await createInstitution(formState);
      setCreateModalOpen(false);
    }
  };

  const totalCorpus = enrichedInstitutions.reduce(
    (sum, i) => sum + i.computedTotalDeposit,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 3 · AICTE Institutional Registry"
        title="Approved Technical Institutions Directory"
        subtitle="Manage AICTE-approved technical institutions, permanent IDs, nodal contacts, registration status, and linked security deposit profiles."
        primaryActionLabel="Register New Institution"
        onPrimaryAction={() => {
          setEditingInstitution(null);
          setFormState({
            aictePermanentId: `1-${Math.floor(1000000000 + Math.random() * 8999999999)}`,
            name: '',
            institutionType: 'PRIVATE_SELF_FINANCED',
            category: 'ENGINEERING',
            state: 'Maharashtra',
            district: 'Nagpur',
            region: 'WEST',
            contactPerson: '',
            contactEmail: '',
            contactPhone: '',
            address: '',
            registrationStatus: 'Active',
            complianceStatus: 'COMPLIANT',
          });
          setCreateModalOpen(true);
        }}
      />

      <StatStrip
        isLoading={isLoadingData}
        metrics={[
          {
            label: 'Registered Institutions',
            value: institutions.length,
            subtext: `${institutions.filter((i) => i.registrationStatus === 'Active').length} Active Registrations`,
          },
          {
            label: 'Compliant Institutions',
            value: institutions.filter((i) => i.complianceStatus === 'COMPLIANT').length,
            subtext: 'Joint-lien norms satisfied',
            tone: 'emerald',
          },
          {
            label: 'At Risk / Non-Compliant',
            value: institutions.filter((i) => i.complianceStatus !== 'COMPLIANT').length,
            subtext: 'Discrepancy or renewal overdue',
            tone: 'amber',
          },
          {
            label: 'Total Linked FDR Corpus',
            value: formatINR(totalCorpus),
            subtext: `Across ${fdrs.length} deposit instruments`,
            tone: 'teal',
          },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        searchPlaceholder="Search by Institution Name, AICTE Permanent ID, Nodal Email, Phone, or District..."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All States ({uniqueStates.length})</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All Institution Categories</option>
              {ALL_INSTITUTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All Registration Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        }
      />

      {isLoadingData ? (
        <TableLoadingSkeleton rows={6} columns={8} />
      ) : filteredInstitutions.length === 0 ? (
        <EmptyStateView
          title="No Matching Technical Institutions"
          description="Adjust your search query or state/type filters to view registered institutions."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-3.5">AICTE Permanent ID</th>
                  <th className="py-3 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Institution Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3.5">Category & Type</th>
                  <th className="py-3 px-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('state')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>State / District</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3.5">Contact Person</th>
                  <th className="py-3 px-3.5">Email & Phone</th>
                  <th className="py-3 px-3.5">Reg. Status</th>
                  <th className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('activeFdrs')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Active FDRs</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('depositValue')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Total Deposit</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {paginatedInstitutions.map((inst) => (
                  <tr
                    key={inst.institutionId}
                    onClick={() => setSelectedInstitutionProfile(inst)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono font-semibold text-teal-700 whitespace-nowrap">
                      {inst.aictePermanentId}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900 max-w-[230px]">
                      <div className="truncate">{inst.name}</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Region: {inst.region}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                      <div>{inst.category}</div>
                      <div className="text-[11px] text-slate-500">
                        {inst.institutionType}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                      <div>{inst.state}</div>
                      <div className="text-[11px] text-slate-500">
                        {inst.district || inst.state}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                      {inst.contactPerson || 'Dr. R. K. Deshmukh'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <div className="truncate max-w-[160px]">{inst.contactEmail}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {inst.contactPhone}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <SemanticStatusText status={inst.registrationStatus || 'Active'} />
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">
                      {inst.computedActiveFdrs}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatINR(inst.computedTotalDeposit)}
                    </td>
                    <td
                      className="py-3 px-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInstitutionProfile(inst)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded"
                          title="View Institution Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(inst)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded"
                          title="Edit Institution Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleInstitutionActivation(inst.institutionId)}
                          className={`p-1.5 rounded ${
                            inst.registrationStatus === 'Active'
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={
                            inst.registrationStatus === 'Active'
                              ? 'Deactivate Institution'
                              : 'Activate Institution'
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filteredInstitutions.length)} of{' '}
              {filteredInstitutions.length} institutions
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="font-mono">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40 inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Institution Profile Modal (Section 3) */}
      {selectedInstitutionProfile && (
        <ModalDialog
          isOpen={Boolean(selectedInstitutionProfile)}
          onClose={() => setSelectedInstitutionProfile(null)}
          title={`${selectedInstitutionProfile.name} (${selectedInstitutionProfile.aictePermanentId})`}
          subtitle={`${selectedInstitutionProfile.category} · ${
            selectedInstitutionProfile.district || ''
          }, ${selectedInstitutionProfile.state} · Region: ${
            selectedInstitutionProfile.region
          }`}
        >
          {(() => {
            const instFdrs = fdrs.filter(
              (f) => f.institutionId === selectedInstitutionProfile.institutionId
            );
            const instDocs = documents.filter(
              (d) => d.institutionId === selectedInstitutionProfile.institutionId
            );
            const instRenewals = renewals.filter(
              (r) => r.institutionId === selectedInstitutionProfile.institutionId
            );
            const instReleases = releases.filter(
              (r) => r.institutionId === selectedInstitutionProfile.institutionId
            );
            const instNotifications = notifications
              .filter(
                (n) => n.institutionId === selectedInstitutionProfile.institutionId
              )
              .slice(0, 5);
            const instLogs = auditLogs
              .filter(
                (l) =>
                  l.targetId === selectedInstitutionProfile.institutionId ||
                  l.summary.includes(selectedInstitutionProfile.name)
              )
              .slice(0, 5);

            return (
              <div className="space-y-5 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-500">Nodal Contact Person</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {selectedInstitutionProfile.contactPerson || 'Dr. R. K. Deshmukh'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Official Email</div>
                    <div className="font-mono text-slate-900 mt-0.5">
                      {selectedInstitutionProfile.contactEmail}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Contact Phone</div>
                    <div className="font-mono text-slate-900 mt-0.5">
                      {selectedInstitutionProfile.contactPhone}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Registration Status</div>
                    <div className="mt-0.5">
                      <SemanticStatusText
                        status={selectedInstitutionProfile.registrationStatus || 'Active'}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Compliance Standing</div>
                    <div className="mt-0.5">
                      <SemanticStatusText
                        status={selectedInstitutionProfile.complianceStatus}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Campus Address</div>
                    <div className="text-slate-800 mt-0.5">
                      {selectedInstitutionProfile.address}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>Submitted Fixed Deposit Receipts ({instFdrs.length})</span>
                    <span className="font-mono text-teal-700">
                      Total:{' '}
                      {formatINR(
                        instFdrs.reduce(
                          (s, f) => s + (Number(f.principalAmount) || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                    {instFdrs.map((f) => (
                      <div
                        key={f.fdrId}
                        onClick={() => {
                          setSelectedInstitutionProfile(null);
                          setSelectedFdrForDrawer(f);
                        }}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-semibold text-teal-700">
                            {f.fdrNumber}
                          </span>{' '}
                          · {f.bankName} · {formatINR(f.principalAmount)}
                        </div>
                        <SemanticStatusText status={f.adminStatus || f.status} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-200 rounded-md space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Uploaded Documents ({instDocs.length})
                    </div>
                    {instDocs.slice(0, 4).map((d) => (
                      <div
                        key={d.documentId}
                        className="flex items-center justify-between text-[11px] text-slate-600"
                      >
                        <span className="truncate">{d.fileName}</span>
                        <span className="font-mono text-slate-500">
                          v{d.currentVersion}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border border-slate-200 rounded-md space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Pending Requests ({instRenewals.length + instReleases.length})
                    </div>
                    <div className="text-slate-600">
                      Renewal / Replacement Requests: <strong>{instRenewals.length}</strong>
                    </div>
                    <div className="text-slate-600">
                      Release / Refund Requests: <strong>{instReleases.length}</strong>
                    </div>
                    <div className="text-slate-600">
                      Dispatched Notifications: <strong>{instNotifications.length}</strong>
                    </div>
                  </div>
                </div>

                {instLogs.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-900">
                      Recent Institutional Audit Activity
                    </div>
                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                      {instLogs.map((l) => (
                        <div key={l.logId} className="p-2 text-[11px] text-slate-600">
                          <span className="font-mono font-semibold text-slate-800">
                            {l.action}
                          </span>{' '}
                          — {l.summary}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </ModalDialog>
      )}

      {/* Create / Edit Institution Modal */}
      <ModalDialog
        isOpen={createModalOpen || Boolean(editingInstitution)}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingInstitution(null);
        }}
        title={
          editingInstitution
            ? `Edit Institution — ${editingInstitution.aictePermanentId}`
            : 'Register AICTE-Approved Technical Institution'
        }
        subtitle="Maintain verified permanent ID, state, institution type, nodal contact, and compliance standing."
      >
        <form onSubmit={handleSaveInstitution} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                AICTE Permanent ID
              </label>
              <input
                type="text"
                required
                value={formState.aictePermanentId}
                onChange={(e) =>
                  setFormState({ ...formState, aictePermanentId: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Institution Category
              </label>
              <select
                value={formState.category}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    category: e.target.value as InstitutionCategory,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {ALL_INSTITUTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Official Institution Name
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Vidarbha Institute of Engineering & Technology"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                value={formState.state}
                onChange={(e) => setFormState({ ...formState, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">District</label>
              <input
                type="text"
                required
                value={formState.district}
                onChange={(e) => setFormState({ ...formState, district: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Contact Person (Principal / Registrar)
              </label>
              <input
                type="text"
                required
                value={formState.contactPerson}
                onChange={(e) =>
                  setFormState({ ...formState, contactPerson: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={formState.contactEmail}
                onChange={(e) =>
                  setFormState({ ...formState, contactEmail: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                required
                value={formState.contactPhone}
                onChange={(e) =>
                  setFormState({ ...formState, contactPhone: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Registration Status
              </label>
              <select
                value={formState.registrationStatus}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    registrationStatus: e.target.value as RegistrationStatus,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Campus Address
              </label>
              <input
                type="text"
                required
                value={formState.address}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingInstitution(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium"
            >
              {editingInstitution ? 'Save Institution Updates' : 'Register Institution'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

// ============================================================================
// 2. SECTION 4 — FDR MASTER REPOSITORY PAGE
// ============================================================================
export const AdminFdrRepositoryPage: React.FC = () => {
  const {
    fdrs,
    getRemainingDays,
    setSelectedFdrForDrawer,
    isLoadingData,
    runBankVerificationSimulator,
  } = useData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<
    'fdrNumber' | 'amount' | 'maturityDate' | 'remainingDays'
  >('remainingDays');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const uniqueBanks = useMemo(
    () => Array.from(new Set(fdrs.map((f) => f.bankName))).sort(),
    [fdrs]
  );

  const filteredFdrs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = fdrs.filter((f) => {
      const matchesSearch =
        !q ||
        f.fdrId.toLowerCase().includes(q) ||
        f.fdrNumber.toLowerCase().includes(q) ||
        f.institutionName.toLowerCase().includes(q) ||
        f.aictePermanentId.toLowerCase().includes(q) ||
        f.bankName.toLowerCase().includes(q) ||
        f.branchName.toLowerCase().includes(q) ||
        f.ifscCode.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'ALL' || f.status === statusFilter || f.adminStatus === statusFilter;
      const matchesVerification =
        verificationFilter === 'ALL' || f.verificationStatus === verificationFilter;
      const matchesBank = bankFilter === 'ALL' || f.bankName === bankFilter;
      return matchesSearch && matchesStatus && matchesVerification && matchesBank;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'fdrNumber') cmp = a.fdrNumber.localeCompare(b.fdrNumber);
      else if (sortBy === 'amount')
        cmp = (Number(a.principalAmount) || 0) - (Number(b.principalAmount) || 0);
      else if (sortBy === 'maturityDate')
        cmp = a.maturityDate.localeCompare(b.maturityDate);
      else if (sortBy === 'remainingDays')
        cmp = getRemainingDays(a.maturityDate) - getRemainingDays(b.maturityDate);
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [
    fdrs,
    searchQuery,
    statusFilter,
    verificationFilter,
    bankFilter,
    sortBy,
    sortAsc,
    getRemainingDays,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredFdrs.length / pageSize));
  const paginatedFdrs = filteredFdrs.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 4 · Statutory Instrument Registry"
        title="Centralized FDR Master Repository"
        subtitle="Complete registry of 50+ institutional Fixed Deposit Receipts across all statutory statuses. Click any row to open the 11-Section Detailed FDR Profile."
        primaryActionLabel="New FDR Submission (4-Step)"
        onPrimaryAction={() => navigate('/admin/new-fdr')}
        secondaryActionLabel="Document Vault"
        onSecondaryAction={() => navigate('/admin/documents')}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        searchPlaceholder="Search by FDR ID, FDR Number, Institution, AICTE Permanent ID, Bank, or IFSC..."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All Lifecycle Statuses</option>
              {ALL_FDR_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All Verification States</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Under Scrutiny">Under Scrutiny</option>
              <option value="Verified">Verified</option>
              <option value="Discrepancy Found">Discrepancy Found</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={bankFilter}
              onChange={(e) => {
                setBankFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All Issuing Banks ({uniqueBanks.length})</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {isLoadingData ? (
        <TableLoadingSkeleton rows={8} columns={8} />
      ) : filteredFdrs.length === 0 ? (
        <EmptyStateView
          title="No Matching FDR Instruments"
          description="No Fixed Deposit Receipts match the current search or status filters."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-3">FDR ID</th>
                  <th className="py-3 px-3">Institution</th>
                  <th className="py-3 px-3">AICTE ID</th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort('fdrNumber')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>FDR Number</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3">Issuing Bank</th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('amount')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Deposit Amount</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3">Issue Date</th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort('maturityDate')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Maturity Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('remainingDays')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Remaining Days</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3">Verification Status</th>
                  <th className="py-3 px-3">Admin Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {paginatedFdrs.map((fdr) => {
                  const remDays = getRemainingDays(fdr.maturityDate);
                  return (
                    <tr
                      key={fdr.fdrId}
                      onClick={() => setSelectedFdrForDrawer(fdr)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {fdr.fdrId}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[190px] truncate">
                        {fdr.institutionName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {fdr.aictePermanentId}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-teal-700 whitespace-nowrap">
                        {fdr.fdrNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-[160px] truncate">
                        {fdr.bankName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {formatINR(fdr.principalAmount)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateShort(fdr.issueDate)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateShort(fdr.maturityDate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold whitespace-nowrap">
                        <span
                          className={
                            remDays <= 0
                              ? 'text-rose-700'
                              : remDays <= 30
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {remDays <= 0 ? `${remDays}d (Matured)` : `${remDays}d`}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <SemanticStatusText
                          status={fdr.verificationStatus || fdr.status}
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <SemanticStatusText status={fdr.adminStatus || fdr.status} />
                      </td>
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedFdrForDrawer(fdr)}
                            className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-white rounded"
                          >
                            11-Sec Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => runBankVerificationSimulator(fdr.fdrId)}
                            className="px-2 py-1 text-[11px] font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded"
                            title="Simulate Bank Confirmation Check"
                          >
                            Verify Bank
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filteredFdrs.length)} of {filteredFdrs.length}{' '}
              FDR records
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. SECTION 5 — 4-STEP NEW FDR SUBMISSION WIZARD PAGE
// ============================================================================
export const NewFdrSubmissionWizardPage: React.FC = () => {
  const { profile } = useAuth();
  const { institutions, createFdrDeposit, fdrs, setSelectedFdrForDrawer } = useData();
  const navigate = useNavigate();

  const isInstitutionUser = profile?.role === UserRole.INSTITUTION_ADMIN;
  const defaultInst =
    institutions.find((i) => i.institutionId === profile?.institutionId) ||
    institutions[0];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    defaultInst?.institutionId || 'INST-1001'
  );

  // Step 2: Financial Instrument Info
  const [fdrNumber, setFdrNumber] = useState(
    `SBI-FDR-2026-${Math.floor(10000 + Math.random() * 89999)}`
  );
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('Parliament Street Corporate Branch');
  const [ifscCode, setIfscCode] = useState('SBIN0000691');
  const [principalAmount, setPrincipalAmount] = useState(3500000);
  const [interestRate, setInterestRate] = useState(7.25);
  const [issueDate, setIssueDate] = useState('2026-10-15');
  const [maturityDate, setMaturityDate] = useState('2034-10-15');
  const [beneficiaryName, setBeneficiaryName] = useState(
    'Jointly held by Principal & Regional Officer, AICTE'
  );
  const [depositCategory, setDepositCategory] = useState(
    'New Technical Institution Security Deposit (8-Year Lock-In)'
  );
  const [jointHolderStatus, setJointHolderStatus] =
    useState<JointHolderStatus>('JOINT_WITH_AICTE');
  const [remarks, setRemarks] = useState(
    'Original FDR physical advice and joint-holder confirmation certificate enclosed.'
  );

  // Step 3: Multi-Document Upload State
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id: string;
      name: string;
      category: DocumentCategory;
      type: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
      size: string;
      progress: number;
    }>
  >([
    {
      id: 'DOC-INIT-1',
      name: 'Original_FDR_Instrument_Scan.pdf',
      category: 'Original FDR',
      type: 'PDF',
      size: '1.4 MB',
      progress: 100,
    },
    {
      id: 'DOC-INIT-2',
      name: 'Bank_Lien_Confirmation_Letter.pdf',
      category: 'Bank Confirmation',
      type: 'PDF',
      size: '840 KB',
      progress: 100,
    },
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFdrId, setSubmittedFdrId] = useState<string | null>(null);

  const activeInst =
    institutions.find((i) => i.institutionId === selectedInstitutionId) || defaultInst;

  const calculatedMaturityAmount = useMemo(() => {
    const years = Math.max(
      1,
      (new Date(maturityDate).getTime() - new Date(issueDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    );
    return Math.round(principalAmount * Math.pow(1 + interestRate / 100, years));
  }, [principalAmount, interestRate, issueDate, maturityDate]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const additions = Array.from(files).map((file, idx) => {
      const ext = file.name.split('.').pop()?.toUpperCase();
      const validType: 'PDF' | 'JPG' | 'JPEG' | 'PNG' =
        ext === 'JPG' || ext === 'JPEG' || ext === 'PNG' ? ext : 'PDF';
      return {
        id: `UP-${Date.now()}-${idx}`,
        name: file.name,
        category: 'Other Supporting Document' as DocumentCategory,
        type: validType,
        size: `${Math.max(120, Math.round(file.size / 1024))} KB`,
        progress: 100,
      };
    });
    setUploadedFiles((prev) => [...prev, ...additions]);
  };

  const handleLoadSampleDocuments = () => {
    setUploadedFiles([
      {
        id: `DEMO-DOC-1`,
        name: `${fdrNumber}_Certified_FDR_Scan.pdf`,
        category: 'Original FDR',
        type: 'PDF',
        size: '1.6 MB',
        progress: 100,
      },
      {
        id: `DEMO-DOC-2`,
        name: `${fdrNumber}_Bank_Confirmation_Certificate.pdf`,
        category: 'Bank Confirmation',
        type: 'PDF',
        size: '920 KB',
        progress: 100,
      },
      {
        id: `DEMO-DOC-3`,
        name: `${fdrNumber}_Joint_Holder_Clause_4_2_Proof.pdf`,
        category: 'Deposit Certificate',
        type: 'PDF',
        size: '680 KB',
        progress: 100,
      },
    ]);
  };

  const validateBeforeNext = (targetStep: 1 | 2 | 3 | 4): boolean => {
    setValidationError(null);
    if (targetStep > 2) {
      if (!fdrNumber.trim() || !bankName.trim() || !ifscCode.trim()) {
        setValidationError('FDR Number, Issuing Bank, and IFSC Code are mandatory.');
        return false;
      }
      if (Number(principalAmount) <= 0) {
        setValidationError('Deposit amount must be a positive numeric value.');
        return false;
      }
      if (new Date(maturityDate).getTime() <= new Date(issueDate).getTime()) {
        setValidationError(
          'Validation Failed: Maturity Date must be strictly greater than Issue Date.'
        );
        return false;
      }
    }
    if (targetStep > 3 && uploadedFiles.length === 0) {
      setValidationError(
        'At least one supporting document (e.g., Original FDR Scan) must be uploaded.'
      );
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!validateBeforeNext(4) || !activeInst) return;
    setIsSubmitting(true);
    try {
      const createdId = await createFdrDeposit({
        fdrNumber,
        institutionId: activeInst.institutionId,
        institutionName: activeInst.name,
        aictePermanentId: activeInst.aictePermanentId,
        bankName,
        branchName,
        ifscCode,
        principalAmount: Number(principalAmount),
        maturityAmount: calculatedMaturityAmount,
        interestRate: Number(interestRate),
        issueDate,
        maturityDate,
        beneficiaryName,
        programCategory: activeInst.category || 'ENGINEERING',
        depositCategory,
        jointHolderStatus,
        documentName: uploadedFiles[0]?.name || 'FDR_Instrument.pdf',
        remarks,
        uploadedFiles: uploadedFiles.map((u) => ({
          name: u.name,
          type: u.type,
          size: u.size,
        })),
      });
      setSubmittedFdrId(createdId);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to submit FDR record.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedFdrId) {
    const createdRecord = fdrs.find((f) => f.fdrId === submittedFdrId);
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-white border-2 border-teal-600 rounded-lg p-8 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold text-teal-700 uppercase">
              Statutory Submission Confirmed
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              FDR Instrument Registered Successfully
            </h2>
            <p className="text-sm text-slate-600">
              Your Fixed Deposit Receipt has been assigned unique reference{' '}
              <span className="font-mono font-semibold text-slate-900">
                {submittedFdrId}
              </span>{' '}
              and routed to the AICTE Scrutiny & Document Intelligence queue.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-left grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-slate-500">Generated FDR ID</div>
              <div className="font-mono font-bold text-teal-700">{submittedFdrId}</div>
            </div>
            <div>
              <div className="text-slate-500">FDR Number</div>
              <div className="font-mono font-semibold text-slate-900">{fdrNumber}</div>
            </div>
            <div>
              <div className="text-slate-500">Deposit Amount</div>
              <div className="font-mono font-semibold text-slate-900">
                {formatINR(principalAmount)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Institution</div>
              <div className="font-medium text-slate-900 truncate">
                {activeInst?.name}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Issuing Bank</div>
              <div className="text-slate-900">{bankName}</div>
            </div>
            <div>
              <div className="text-slate-500">Attached Documents</div>
              <div className="font-mono text-slate-900">
                {uploadedFiles.length} verified files
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {createdRecord && (
              <button
                type="button"
                onClick={() => setSelectedFdrForDrawer(createdRecord)}
                className="px-4 py-2 text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white rounded-md"
              >
                Open 11-Section FDR Profile
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                navigate(
                  isInstitutionUser
                    ? '/institution/status-tracking'
                    : '/admin/fdr-repository'
                )
              }
              className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md"
            >
              Go to FDR Repository
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmittedFdrId(null);
                setStep(1);
                setFdrNumber(
                  `SBI-FDR-2026-${Math.floor(10000 + Math.random() * 89999)}`
                );
              }}
              className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-md"
            >
              Submit Another FDR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 5 · 4-Step Statutory Instrument Intake"
        title="New Fixed Deposit Receipt (FDR) Submission Wizard"
        subtitle="Complete all four steps to register a new security deposit instrument, attach supporting bank certificates, and route to AICTE Scrutiny."
      />

      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { num: 1, title: 'Step 1: Institution Info', desc: 'Auto-populated profile' },
          {
            num: 2,
            title: 'Step 2: Financial Instrument',
            desc: 'Bank, amount & dates',
          },
          {
            num: 3,
            title: 'Step 3: Document Upload',
            desc: 'PDF / Image certificates',
          },
          { num: 4, title: 'Step 4: Review & Submit', desc: 'Validation & confirmation' },
        ].map((item) => {
          const isCurrent = step === item.num;
          const isDone = step > item.num;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                if (validateBeforeNext(item.num as 1 | 2 | 3 | 4)) {
                  setStep(item.num as 1 | 2 | 3 | 4);
                }
              }}
              className={`p-3 rounded-md border text-left transition-colors ${
                isCurrent
                  ? 'border-teal-600 bg-teal-50/60'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">{item.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {validationError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        {step === 1 && activeInst && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Step 1 · Institution Information (Auto-Populated)
                </h2>
                <p className="text-xs text-slate-500">
                  Verified institutional metadata linked from the AICTE Permanent Directory
                </p>
              </div>
              {!isInstitutionUser && (
                <select
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
                >
                  {institutions.map((i) => (
                    <option key={i.institutionId} value={i.institutionId}>
                      {i.aictePermanentId} — {i.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">Institution Name</div>
                <div className="font-semibold text-slate-900 mt-1">{activeInst.name}</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">AICTE Permanent ID</div>
                <div className="font-mono font-bold text-teal-700 mt-1">
                  {activeInst.aictePermanentId}
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">State & District</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {activeInst.district || activeInst.state}, {activeInst.state}
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">Category & Type</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {activeInst.category} ({activeInst.institutionType})
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">Nodal Officer / Principal</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {activeInst.contactPerson || 'Dr. Rajeshwar Deshmukh'}
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-slate-500">Official Email & Phone</div>
                <div className="font-mono text-slate-900 mt-1">
                  {activeInst.contactEmail} · {activeInst.contactPhone}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Step 2 · Financial Instrument Information
              </h2>
              <p className="text-xs text-slate-500">
                Enter exact particulars as printed on the Fixed Deposit Receipt issued by the bank
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  FDR Number *
                </label>
                <input
                  type="text"
                  required
                  value={fdrNumber}
                  onChange={(e) => setFdrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Issuing Bank Name *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Union Bank of India">Union Bank of India</option>
                  <option value="Indian Bank">Indian Bank</option>
                  <option value="Bank of India">Bank of India</option>
                  <option value="Central Bank of India">Central Bank of India</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  required
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Deposit Amount (INR) *
                </label>
                <input
                  type="number"
                  required
                  min={100000}
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Interest Rate (% p.a.) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Maturity Date (Must be &gt; Issue Date) *
                </label>
                <input
                  type="date"
                  required
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Joint-Holder Lien Clause *
                </label>
                <select
                  value={jointHolderStatus}
                  onChange={(e) =>
                    setJointHolderStatus(e.target.value as JointHolderStatus)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="JOINT_WITH_AICTE">
                    JOINT_WITH_AICTE (Compliant Clause 4.2)
                  </option>
                  <option value="UNDER_LIEN_VERIFICATION">
                    UNDER_LIEN_VERIFICATION
                  </option>
                  <option value="SOLE_INSTITUTION">
                    SOLE_INSTITUTION (Mismatch)
                  </option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Beneficiary / Joint Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Deposit Category
                </label>
                <input
                  type="text"
                  value={depositCategory}
                  onChange={(e) => setDepositCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">
                  Submission Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Step 3 · Multi-Document Upload (PDF, JPG, JPEG, PNG)
                </h2>
                <p className="text-xs text-slate-500">
                  Attach certified FDR scans, bank lien confirmation letters, and joint-holder proofs
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleDocuments}
                className="px-3 py-1.5 text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-md"
              >
                Load Sample Demo Documents (3 Files)
              </button>
            </div>

            <label className="block border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50">
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-900">
                Click to Upload Supporting Documents (PDF, JPG, JPEG, PNG)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Supports multiple files with automatic version tagging
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Attached Files ({uploadedFiles.length})
              </div>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {file.category} · {file.type} · {file.size} · Upload {file.progress}%
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))
                    }
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && activeInst && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Step 4 · Review & Statutory Declaration
              </h2>
              <p className="text-xs text-slate-500">
                Verify all instrument details and attached files before submitting to AICTE
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md text-xs">
              <div>
                <div className="text-slate-500">Institution</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {activeInst.name}
                </div>
              </div>
              <div>
                <div className="text-slate-500">AICTE Permanent ID</div>
                <div className="font-mono font-semibold text-teal-700 mt-0.5">
                  {activeInst.aictePermanentId}
                </div>
              </div>
              <div>
                <div className="text-slate-500">FDR Number</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {fdrNumber}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Issuing Bank & IFSC</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {bankName} ({ifscCode})
                </div>
              </div>
              <div>
                <div className="text-slate-500">Principal Deposit</div>
                <div className="font-mono font-bold text-teal-700 mt-0.5">
                  {formatINR(principalAmount)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Projected Maturity Value</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {formatINR(calculatedMaturityAmount)} ({interestRate}%)
                </div>
              </div>
              <div>
                <div className="text-slate-500">Issue → Maturity Date</div>
                <div className="font-mono text-slate-900 mt-0.5">
                  {formatDateShort(issueDate)} → {formatDateShort(maturityDate)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Attached Documents</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {uploadedFiles.length} PDF / Image Files
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md disabled:opacity-40"
          >
            Previous Step
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                const next = (step + 1) as 1 | 2 | 3 | 4;
                if (validateBeforeNext(next)) setStep(next);
              }}
              className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
            >
              Continue to Step {step + 1} →
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="px-5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-600 rounded-md disabled:opacity-50"
            >
              {isSubmitting
                ? 'Registering FDR Instrument...'
                : 'Confirm & Submit FDR to AICTE'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. SECTION 6 — DOCUMENT MANAGEMENT VAULT PAGE
// ============================================================================
export const DocumentManagementPage: React.FC<{ institutionOnlyId?: string }> = ({
  institutionOnlyId,
}) => {
  const {
    documents,
    fdrs,
    institutions,
    uploadPortalDocument,
    replaceDocumentVersion,
    updateDocumentVerificationStatus,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [instFilter, setInstFilter] = useState(institutionOnlyId || 'ALL');

  const [previewDoc, setPreviewDoc] = useState<PortalDocument | null>(null);
  const [replaceDocTarget, setReplaceDocTarget] = useState<PortalDocument | null>(null);
  const [replaceFileName, setReplaceFileName] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState(fdrs[0]?.fdrId || 'FDR-2001');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('Original FDR');
  const [newDocFileName, setNewDocFileName] = useState('Certified_Bank_FDR_Advice.pdf');
  const [newDocNotes, setNewDocNotes] = useState('');

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (institutionOnlyId && doc.institutionId !== institutionOnlyId) return false;
      if (instFilter !== 'ALL' && doc.institutionId !== instFilter) return false;
      if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        doc.fdrId.toLowerCase().includes(q) ||
        doc.fdrNumber.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.institutionName.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q)
      );
    });
  }, [documents, searchQuery, categoryFilter, instFilter, institutionOnlyId]);

  const handleDownloadDoc = (doc: PortalDocument) => {
    const content = [
      '====================================================================',
      'ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)',
      'CERTIFIED STATUTORY DOCUMENT ARCHIVE EXTRACT',
      '====================================================================',
      `Document ID       : ${doc.documentId}`,
      `Document Category : ${doc.category}`,
      `File Name         : ${doc.fileName} (Version v${doc.currentVersion})`,
      `Linked FDR ID     : ${doc.fdrId} (${doc.fdrNumber})`,
      `Institution       : ${doc.institutionName} (${doc.institutionId})`,
      `Uploaded By       : ${doc.uploadedBy}`,
      `Uploaded Date     : ${doc.uploadedAt}`,
      `Verification State: ${doc.verificationStatus}`,
      '--------------------------------------------------------------------',
      'VERSION HISTORY:',
      ...doc.versions.map(
        (v) =>
          `  v${v.versionNumber} - ${v.fileName} (${v.uploadedAt}) by ${v.uploadedBy} — ${v.notes}`
      ),
      '====================================================================',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.fdrNumber}_v${doc.currentVersion}_${doc.fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const fdr = fdrs.find((f) => f.fdrId === selectedFdrId) || fdrs[0];
    if (!fdr) return;
    await uploadPortalDocument({
      fdrId: fdr.fdrId,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      category: newDocCategory,
      fileName: newDocFileName,
      fileType: 'PDF',
      fileSize: '1.1 MB',
      notes: newDocNotes || 'Uploaded via Document Management Vault',
    });
    setUploadModalOpen(false);
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceDocTarget) return;
    await replaceDocumentVersion(
      replaceDocTarget.documentId,
      replaceFileName ||
        `Revised_v${replaceDocTarget.currentVersion + 1}_${replaceDocTarget.fileName}`,
      '1.3 MB',
      replaceNotes || 'Updated document version uploaded'
    );
    setReplaceDocTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Section 6 · Centralized Statutory Document Vault"
        title="FDR Document Management & Version Control"
        subtitle="Manage all 7 statutory document categories with non-destructive version history (v1, v2), instant preview, download, and controlled replacement."
        primaryActionLabel="Upload New Document"
        onPrimaryAction={() => setUploadModalOpen(true)}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by FDR ID, FDR Number, Document File Name, or Institution..."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
            >
              <option value="ALL">All 7 Document Categories</option>
              {ALL_DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {!institutionOnlyId && (
              <select
                value={instFilter}
                onChange={(e) => setInstFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 max-w-[220px]"
              >
                <option value="ALL">All Institutions</option>
                {institutions.map((i) => (
                  <option key={i.institutionId} value={i.institutionId}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-3.5">Document File</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Linked FDR</th>
                <th className="py-3 px-3.5">Institution</th>
                <th className="py-3 px-3.5">Version</th>
                <th className="py-3 px-3.5">Uploaded By / Date</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDocs.map((doc) => (
                <tr key={doc.documentId} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-medium text-slate-900">
                    <div>{doc.fileName}</div>
                    <div className="text-[11px] text-slate-500">
                      {doc.fileType} · {doc.fileSize}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                    {doc.category}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-teal-700 whitespace-nowrap">
                    {doc.fdrNumber} ({doc.fdrId})
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 max-w-[180px] truncate">
                    {doc.institutionName}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-semibold text-slate-900">
                    v{doc.currentVersion} ({doc.versions.length} rev)
                  </td>
                  <td className="py-3 px-3.5 text-slate-600">
                    <div>{doc.uploadedBy}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatDateShort(doc.uploadedAt)}
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <SemanticStatusText status={doc.verificationStatus} />
                  </td>
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview & History</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(doc)}
                        className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceDocTarget(doc);
                          setReplaceFileName(
                            `v${doc.currentVersion + 1}_${doc.fileName}`
                          );
                          setReplaceNotes('');
                        }}
                        className="px-2 py-1 text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded"
                      >
                        Replace (v{doc.currentVersion + 1})
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview & Version History Modal */}
      {previewDoc && (
        <ModalDialog
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview & Version Lineage — ${previewDoc.fileName}`}
          subtitle={`${previewDoc.category} · Linked FDR: ${previewDoc.fdrNumber} · Current Version: v${previewDoc.currentVersion}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-slate-100 rounded-md font-mono space-y-1.5">
              <div className="text-teal-400 font-semibold">
                CERTIFIED DIGITAL INSTRUMENT PREVIEW (v{previewDoc.currentVersion})
              </div>
              <div>Document ID: {previewDoc.documentId}</div>
              <div>
                Linked FDR: {previewDoc.fdrNumber} ({previewDoc.fdrId})
              </div>
              <div>Institution: {previewDoc.institutionName}</div>
              <div>Category: {previewDoc.category}</div>
              <div>Verification Status: {previewDoc.verificationStatus}</div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-slate-900">
                Non-Destructive Version History ({previewDoc.versions.length} Versions)
              </div>
              <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                {previewDoc.versions.map((ver) => (
                  <div
                    key={ver.versionNumber}
                    className="p-3 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-teal-700">
                        v{ver.versionNumber}
                      </span>{' '}
                      · <span className="font-medium text-slate-900">{ver.fileName}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Uploaded by {ver.uploadedBy} on {formatDateShort(ver.uploadedAt)}{' '}
                        — {ver.notes}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {ver.fileSize}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateDocumentVerificationStatus(previewDoc.documentId, 'Verified');
                    setPreviewDoc(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded font-medium"
                >
                  Mark Document Verified
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDocumentVerificationStatus(
                      previewDoc.documentId,
                      'Discrepancy Flagged'
                    );
                    setPreviewDoc(null);
                  }}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded font-medium"
                >
                  Flag Document Issue
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadDoc(previewDoc)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded font-medium"
              >
                Download Certificate
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Controlled Document Replacement Modal */}
      {replaceDocTarget && (
        <ModalDialog
          isOpen={Boolean(replaceDocTarget)}
          onClose={() => setReplaceDocTarget(null)}
          title={`Replace Document (Creates Version v${
            replaceDocTarget.currentVersion + 1
          })`}
          subtitle={`Existing version v${replaceDocTarget.currentVersion} (${replaceDocTarget.fileName}) will be preserved in version history.`}
        >
          <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                New Replacement File Name
              </label>
              <input
                type="text"
                required
                value={replaceFileName}
                onChange={(e) => setReplaceFileName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Revision / Replacement Notes
              </label>
              <textarea
                rows={2}
                required
                value={replaceNotes}
                onChange={(e) => setReplaceNotes(e.target.value)}
                placeholder="Reason for uploading revised document version..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplaceDocTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 text-white rounded-md font-medium"
              >
                Commit Version v{replaceDocTarget.currentVersion + 1}
              </button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Upload New Document Modal */}
      <ModalDialog
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Supporting Statutory Document"
        subtitle="Attach a document to an existing Fixed Deposit Receipt."
      >
        <form onSubmit={handleUploadNewDoc} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Select Target FDR Instrument
            </label>
            <select
              value={selectedFdrId}
              onChange={(e) => setSelectedFdrId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {fdrs
                .filter((f) => !institutionOnlyId || f.institutionId === institutionOnlyId)
                .map((f) => (
                  <option key={f.fdrId} value={f.fdrId}>
                    {f.fdrNumber} — {f.institutionName}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Document Category
            </label>
            <select
              value={newDocCategory}
              onChange={(e) => setNewDocCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              {ALL_DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Document File Name
            </label>
            <input
              type="text"
              required
              value={newDocFileName}
              onChange={(e) => setNewDocFileName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Upload Remarks
            </label>
            <input
              type="text"
              value={newDocNotes}
              onChange={(e) => setNewDocNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium"
            >
              Upload Document
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
