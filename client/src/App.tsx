import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TicketsPage from "@/pages/tickets";
import TicketDetailPage from "@/pages/ticket-detail";
import NewTicketPage from "@/pages/ticket-new";
import ServiceNowPage from "@/pages/servicenow";
import HelpPage from "@/pages/help";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tickets" component={TicketsPage} />
      <Route path="/tickets/new" component={NewTicketPage} />
      <Route path="/tickets/:id" component={TicketDetailPage} />
      <Route path="/servicenow" component={ServiceNowPage} />
      <Route path="/help" component={HelpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="smart-it-copilot-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
