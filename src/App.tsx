/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/ui/EnterpriseComponents';
import { PortalLayout } from './components/layout/PortalLayout';
import { LoginPage } from './pages/LoginPage';
import {
  InstitutionDashboardPage,
  InstitutionDocumentUploadsPage,
  InstitutionFdrSubmissionsPage,
  InstitutionNotificationsPage,
  InstitutionProfilePage,
  InstitutionReleaseRequestsPage,
  InstitutionRenewalSubmissionsPage,
  InstitutionReplacementFdrsPage,
  InstitutionStatusTrackingPage,
  InstitutionSubmissionHistoryPage,
} from './pages/InstitutionPortalPages';
import {
  AdminAlertsEscalationPage,
  AdminAuditLogsPage,
  AdminAuthenticityEnginePage,
  AdminCrossInstitutionFraudGraphPage,
  AdminDashboardPage,
  AdminDiscrepanciesPage,
  AdminFdrRepositoryPage,
  AdminInstitutionRiskRadarPage,
  AdminInstitutionsPage,
  AdminMaturityMonitoringPage,
  AdminReleaseProcessingPage,
  AdminRenewalMonitoringPage,
  AdminReportsPage,
  AdminSmartEscalationLadderPage,
  AdminSystemConfigPage,
  AdminTamperProofLedgerPage,
  AdminUserRoleManagementPage,
  AdminVerificationPage,
  DocumentManagementPage,
  NewFdrSubmissionWizardPage,
} from './pages/AdminPortalPages';
import { UserRole } from './types/fdr';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, profile, isAuthReady } = useAuth();

  if (!isAuthReady && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded bg-slate-900 text-teal-400 flex items-center justify-center">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Verifying AICTE Statutory Session
          </div>
          <p className="text-xs text-slate-500">
            Synchronizing role permissions and security deposit workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !profile) {
    return <Navigate to="/login" replace />;
  }

  return <PortalLayout>{children}</PortalLayout>;
};

const RootRedirect: React.FC = () => {
  const { firebaseUser, profile, isAuthReady } = useAuth();

  if (!isAuthReady && !profile) {
    return null;
  }

  if (!firebaseUser && !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === UserRole.INSTITUTION_ADMIN) {
    return <Navigate to="/institution/dashboard" replace />;
  }

  return <Navigate to="/admin/dashboard" replace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              {/* A. PUBLIC LOGIN */}
              <Route path="/login" element={<LoginPage />} />

              {/* B. INSTITUTION PORTAL (10 Modules) */}
              <Route
                path="/institution/dashboard"
                element={
                  <AuthGuard>
                    <InstitutionDashboardPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/profile"
                element={
                  <AuthGuard>
                    <InstitutionProfilePage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/fdr-submissions"
                element={
                  <AuthGuard>
                    <InstitutionFdrSubmissionsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/documents"
                element={
                  <AuthGuard>
                    <InstitutionDocumentUploadsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/status-tracking"
                element={
                  <AuthGuard>
                    <InstitutionStatusTrackingPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/renewals"
                element={
                  <AuthGuard>
                    <InstitutionRenewalSubmissionsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/replacements"
                element={
                  <AuthGuard>
                    <InstitutionReplacementFdrsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/releases"
                element={
                  <AuthGuard>
                    <InstitutionReleaseRequestsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/notifications"
                element={
                  <AuthGuard>
                    <InstitutionNotificationsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/institution/history"
                element={
                  <AuthGuard>
                    <InstitutionSubmissionHistoryPage />
                  </AuthGuard>
                }
              />

              {/* C. AICTE ADMIN PORTAL (Core + Advanced AI Forensics, Risk & Ledger Modules) */}
              <Route
                path="/admin/dashboard"
                element={
                  <AuthGuard>
                    <AdminDashboardPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/authenticity-engine"
                element={
                  <AuthGuard>
                    <AdminAuthenticityEnginePage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/risk-radar"
                element={
                  <AuthGuard>
                    <AdminInstitutionRiskRadarPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/escalation-ladder"
                element={
                  <AuthGuard>
                    <AdminSmartEscalationLadderPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/tamper-ledger"
                element={
                  <AuthGuard>
                    <AdminTamperProofLedgerPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/fraud-graph"
                element={
                  <AuthGuard>
                    <AdminCrossInstitutionFraudGraphPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/institutions"
                element={
                  <AuthGuard>
                    <AdminInstitutionsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/fdr-repository"
                element={
                  <AuthGuard>
                    <AdminFdrRepositoryPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/new-fdr"
                element={
                  <AuthGuard>
                    <NewFdrSubmissionWizardPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <AuthGuard>
                    <DocumentManagementPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/verification"
                element={
                  <AuthGuard>
                    <AdminVerificationPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/discrepancies"
                element={
                  <AuthGuard>
                    <AdminDiscrepanciesPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/maturity"
                element={
                  <AuthGuard>
                    <AdminMaturityMonitoringPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/renewals"
                element={
                  <AuthGuard>
                    <AdminRenewalMonitoringPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/releases"
                element={
                  <AuthGuard>
                    <AdminReleaseProcessingPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/alerts"
                element={
                  <AuthGuard>
                    <AdminAlertsEscalationPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AuthGuard>
                    <AdminReportsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <AuthGuard>
                    <AdminAuditLogsPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AuthGuard>
                    <AdminUserRoleManagementPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/config"
                element={
                  <AuthGuard>
                    <AdminSystemConfigPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AuthGuard>
                    <AdminSystemConfigPage />
                  </AuthGuard>
                }
              />

              {/* Fallback & Root Redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
