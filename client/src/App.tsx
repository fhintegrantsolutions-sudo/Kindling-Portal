import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EntityProvider } from "@/contexts/entity-context";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import NotesPage from "@/pages/notes-page";
import NoteDetailPage from "@/pages/note-detail-page";
import OpportunitiesPage from "@/pages/opportunities-page";
import ProfilePage from "@/pages/profile-page";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();

  // Simple mock auth guard
  useEffect(() => {
    // In a real app, check auth token.
    // For mockup, we start at auth if path is /auth, otherwise we assume logged in for simplicity 
    // or redirect to /auth if accessing protected routes without "session" (mocked)
    if (location === "/" && !localStorage.getItem("mock_auth")) {
      // For demo purposes, let's just allow access to everything, but start at auth if fresh
      // setLocation("/auth");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={DashboardPage} />
      <Route path="/notes" component={NotesPage} />
      <Route path="/notes/:id" component={NoteDetailPage} />
      <Route path="/opportunities" component={OpportunitiesPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EntityProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </EntityProvider>
    </QueryClientProvider>
  );
}

export default App;
