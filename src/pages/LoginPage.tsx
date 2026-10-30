import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Landmark,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, UserRole } from '../types/fdr';
import { ModalDialog } from '../components/ui/EnterpriseComponents';

export const LoginPage: React.FC = () => {
  const {
    firebaseUser,
    profile,
    isAuthReady,
    isSigningIn,
    authError,
    loginWithGoogle,
    enterDemoSession,
    sendPasswordReset,
    clearAuthError,
  } = useAuth();
  const { institutions } = useData();
  const navigate = useNavigate();

  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('INST-1001');

  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Redirect if Firebase Google user is authenticated
  useEffect(() => {
    if (isAuthReady && firebaseUser && profile) {
      if (profile.role === UserRole.INSTITUTION_ADMIN) {
        navigate('/institution/dashboard', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAuthReady, firebaseUser, profile, navigate]);

  const handleGoogleSignIn = async () => {
    clearAuthError();
    try {
      await loginWithGoogle();
    } catch {
      // Handled in AuthContext state
    }
  };

  const handleEnterDemoPortal = (roleOverride?: UserRole) => {
    const roleToUse = roleOverride || selectedDemoRole;
    const targetInst =
      institutions.find((i) => i.institutionId === selectedInstitutionId) ||
      institutions[0];
    enterDemoSession(
      roleToUse,
      targetInst?.institutionId || 'INST-1001',
      targetInst?.name || 'Vidarbha Institute of Engineering & Technology'
    );
    if (roleToUse === UserRole.INSTITUTION_ADMIN) {
      navigate('/institution/dashboard', { replace: true });
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  };

  const handlePasswordRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setIsSendingReset(true);
    setRecoveryStatus(null);
    try {
      await sendPasswordReset(recoveryEmail);
      setRecoveryStatus({
        type: 'success',
        message: `Statutory credential recovery dispatch initiated for ${recoveryEmail.trim()}. Please check your registered institutional or AICTE inbox.`,
      });
    } catch (err) {
      setRecoveryStatus({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to dispatch password reset instructions. Verify the registered email address.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top 3-Zone Statutory Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight block">
              AICTE FDR Management System
            </span>
            <span className="text-[11px] text-slate-400 block">
              All India Council for Technical Education · Finance & Statutory Deposit Bureau
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <a
            href="#statutory-mandate"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Statutory Mandate
          </a>
          <a
            href="#role-hierarchy"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Role Governance (5 Tiers)
          </a>
          <a
            href="#security-norms"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Joint-Lien Norms
          </a>
          <button
            type="button"
            onClick={() => {
              setRecoveryStatus(null);
              setForgotModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Credential Recovery
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleEnterDemoPortal(UserRole.SUPER_ADMIN)}
            className="px-3.5 py-2 text-xs font-medium text-teal-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            Direct Portal Access
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isSigningIn ? 'Authenticating...' : 'Official Google Sign In'}
          </button>
        </div>
      </header>

      {/* Main Split Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Statutory Mandate & Interactive Role Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div id="statutory-mandate" className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
              <span>GOVERNMENT OF INDIA · STATUTORY FDR LIFECYCLE PORTAL</span>
            </div>
            <h1
              className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Centralized Security Deposit & Fixed Deposit Receipt (FDR) Lifecycle Portal
            </h1>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed max-w-2xl">
              Unified digital repository for 20+ AICTE-approved technical institutions and statutory scrutiny cells. Manage joint-holder FDR submissions, Gemini AI document extraction, Core Banking System verification, discrepancy resolution, maturity tracking, renewals, and lien releases with complete auditability.
            </p>
          </div>

          {/* Interactive Role Governance Matrix */}
          <div
            id="role-hierarchy"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-900">
                  01. Role-Based Access Control (RBAC) — Click Any Role to Launch Workspace
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Each role has tailored permissions, operational dashboards, and audit visibility
                </p>
              </div>
              <span className="text-xs text-teal-700 font-mono font-semibold">
                5 Statutory Roles
              </span>
            </div>
            <div className="divide-y divide-slate-200">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((roleKey, index) => {
                const isSelected = selectedDemoRole === roleKey;
                return (
                  <div
                    key={roleKey}
                    onClick={() => setSelectedDemoRole(roleKey)}
                    className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          0{index + 1}. {ROLE_LABELS[roleKey]}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          ({roleKey})
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {ROLE_DESCRIPTIONS[roleKey]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-teal-700">
                        {roleKey === UserRole.INSTITUTION_ADMIN
                          ? 'Institution Portal'
                          : 'AICTE Admin Portal'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterDemoPortal(roleKey);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Enter as {ROLE_LABELS[roleKey].split(' ')[0]}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statutory Security Deposit Norms */}
          <div
            id="security-norms"
            className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-4 gap-5"
          >
            <div>
              <div className="text-xs font-medium text-slate-500">Seeded Institutions</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                20 Institutes
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Engineering, Pharmacy, MBA, MCA & Polytechnics
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Repository Volume</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                50 FDRs
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Across 8 Nationalized & Scheduled Banks
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Joint-Lien Mandate</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                Clause 4.2
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Jointly held by Institution & Regional Officer, AICTE
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Maturity Alert Window</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-teal-700">
                30 / 15 / 7 Days
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Configurable automated reminder & escalation SLA
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Official Authentication + Role Workspace Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Statutory Role & Institution Workspace Launcher */}
          <div className="bg-white border-2 border-teal-600 rounded-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>STATUTORY ROLE GATEWAY · DIRECT WORKSPACE ENTRY</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  Launch Official Role Workspace
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Select any statutory role (and institution for Institution Admin) to access all 22 interconnected modules directly.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Active Statutory Role
                </label>
                <select
                  value={selectedDemoRole}
                  onChange={(e) => setSelectedDemoRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-slate-500"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]} ({r})
                    </option>
                  ))}
                </select>
              </div>

              {selectedDemoRole === UserRole.INSTITUTION_ADMIN && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select AICTE-Approved Technical Institution
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedInstitutionId}
                      onChange={(e) => setSelectedInstitutionId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-slate-500"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.institutionId} value={inst.institutionId}>
                          {inst.aictePermanentId} — {inst.name} ({inst.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleEnterDemoPortal()}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <span>Enter Portal as {ROLE_LABELS[selectedDemoRole]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Official Google Workspace Authentication Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="space-y-1 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-teal-700" />
                <span>Firebase Cloud Identity Gateway</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Official Google Account Sign-In
              </h3>
              <p className="text-xs text-slate-600">
                Authenticate with your Google account to persist profile records in Cloud Firestore. Role switching remains available inside the sidebar at any time.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Authentication Alert</div>
                  <div className="mt-0.5">{authError}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>
                  {isSigningIn
                    ? 'Verifying Google Credentials...'
                    : 'Sign In with Verified Google Account'}
                </span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStatus(null);
                    setForgotModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot Password / Credential Recovery</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  TLS 1.3 · RBAC v2.4
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            All India Council for Technical Education (AICTE) · Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Centralized Security Deposit & FDR Lifecycle Management Portal
          </div>
        </div>
      </footer>

      {/* Forgot Password / Credential Recovery Modal */}
      <ModalDialog
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Statutory Credential Recovery"
        subtitle="Dispatch password reset instructions to your registered institutional or AICTE official email."
      >
        <form onSubmit={handlePasswordRecoverySubmit} className="space-y-4">
          <div>
            <label
              htmlFor="recovery-email"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Registered Official Email Address
            </label>
            <input
              id="recovery-email"
              type="email"
              required
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="nodal.officer@institution.ac.in"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-slate-500"
            />
          </div>

          {recoveryStatus && (
            <div
              className={`p-3 rounded-md border text-xs flex items-start gap-2 ${
                recoveryStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {recoveryStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{recoveryStatus.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSendingReset}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-50"
            >
              {isSendingReset ? 'Dispatching...' : 'Dispatch Recovery Link'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
