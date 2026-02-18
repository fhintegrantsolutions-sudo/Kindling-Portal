import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AboutPage from "@/pages/about-page";
import LoginPage from "@/pages/login-page";
import RequestAccessPage from "@/pages/request-access-page";
import DashboardPage from "@/pages/dashboard-page";
import NotesPage from "@/pages/notes-page";
import NoteDetailPage from "@/pages/note-detail-page";
import OpportunitiesPage from "@/pages/opportunities-page";
import ProfilePage from "@/pages/profile-page";
import AdminOverviewPage from "@/pages/admin/admin-overview-page";
import AdminRegistrationsPage from "@/pages/admin/admin-registrations-page";
import AdminPaymentsPage from "@/pages/admin/admin-payments-page";
import AdminNotesPage from "@/pages/admin/admin-notes-page";
import AdminBorrowersPage from "@/pages/admin/admin-borrowers-page";
import AdminEntitiesPage from "@/pages/admin/admin-entities-page";
import AdminRolesPage from "@/pages/admin/admin-roles-page";
import AdminInvestorWorkflowPage from "@/pages/admin/admin-investor-workflow-page";
import AdminLendersPage from "@/pages/admin/admin-lenders-page";
import AdminUsersPage from "@/pages/admin/admin-users-page";
import AdminReferralsPage from "@/pages/admin/admin-referrals-page";
import AdminAccessRequestsPage from "@/pages/admin/admin-access-requests-page";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  const [, setLocation] = useLocation();

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/request-access" component={RequestAccessPage} />

      {/* Backward Compatibility Redirects */}
      <Route path="/auth">
        {() => { setLocation("/login"); return null; }}
      </Route>
      <Route path="/notes">
        {() => { setLocation("/portal/notes"); return null; }}
      </Route>
      <Route path="/opportunities">
        {() => { setLocation("/portal/opportunities"); return null; }}
      </Route>
      <Route path="/profile">
        {() => { setLocation("/portal/profile"); return null; }}
      </Route>
      <Route path="/admin">
        {() => { setLocation("/portal/admin"); return null; }}
      </Route>
      <Route path="/admin/investor-workflow">
        {() => { setLocation("/portal/admin/investor-workflow"); return null; }}
      </Route>
      <Route path="/admin/registrations">
        {() => { setLocation("/portal/admin/registrations"); return null; }}
      </Route>
      <Route path="/admin/payments">
        {() => { setLocation("/portal/admin/payments"); return null; }}
      </Route>
      <Route path="/admin/notes">
        {() => { setLocation("/portal/admin/notes"); return null; }}
      </Route>
      <Route path="/admin/borrowers">
        {() => { setLocation("/portal/admin/borrowers"); return null; }}
      </Route>
      <Route path="/admin/entities">
        {() => { setLocation("/portal/admin/entities"); return null; }}
      </Route>
      <Route path="/admin/roles">
        {() => { setLocation("/portal/admin/roles"); return null; }}
      </Route>
      <Route path="/admin/lenders">
        {() => { setLocation("/portal/admin/lenders"); return null; }}
      </Route>
      <Route path="/admin/users">
        {() => { setLocation("/portal/admin/users"); return null; }}
      </Route>
      <Route path="/admin/referrals">
        {() => { setLocation("/portal/admin/referrals"); return null; }}
      </Route>

      {/* Protected Routes */}
      <Route path="/portal">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/portal/notes">
        {() => <ProtectedRoute component={NotesPage} />}
      </Route>
      <Route path="/portal/notes/:id">
        {() => <ProtectedRoute component={NoteDetailPage} />}
      </Route>
      <Route path="/portal/opportunities">
        {() => <ProtectedRoute component={OpportunitiesPage} />}
      </Route>
      <Route path="/portal/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* Admin Routes */}
      <Route path="/portal/admin">
        {() => <ProtectedRoute component={AdminOverviewPage} />}
      </Route>
      <Route path="/portal/admin/investor-workflow">
        {() => <ProtectedRoute component={AdminInvestorWorkflowPage} />}
      </Route>
      <Route path="/portal/admin/registrations">
        {() => <ProtectedRoute component={AdminRegistrationsPage} />}
      </Route>
      <Route path="/portal/admin/payments">
        {() => <ProtectedRoute component={AdminPaymentsPage} />}
      </Route>
      <Route path="/portal/admin/notes">
        {() => <ProtectedRoute component={AdminNotesPage} />}
      </Route>
      <Route path="/portal/admin/borrowers">
        {() => <ProtectedRoute component={AdminBorrowersPage} />}
      </Route>
      <Route path="/portal/admin/entities">
        {() => <ProtectedRoute component={AdminEntitiesPage} />}
      </Route>
      <Route path="/portal/admin/roles">
        {() => <ProtectedRoute component={AdminRolesPage} />}
      </Route>
      <Route path="/portal/admin/lenders">
        {() => <ProtectedRoute component={AdminLendersPage} />}
      </Route>
      <Route path="/portal/admin/users">
        {() => <ProtectedRoute component={AdminUsersPage} />}
      </Route>
      <Route path="/portal/admin/referrals">
        {() => <ProtectedRoute component={AdminReferralsPage} />}
      </Route>
      <Route path="/portal/admin/access-requests">
        {() => <ProtectedRoute component={AdminAccessRequestsPage} />}
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
