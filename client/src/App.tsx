import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Swipes from "./pages/Swipes";
import Favorites from "./pages/Favorites";
import Collections from "./pages/Collections";
import Mailboxes from "./pages/Mailboxes";
import Settings from "./pages/Settings";
import SwipeDetail from "./pages/SwipeDetail";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <DashboardLayout>
          <Swipes />
        </DashboardLayout>
      </Route>
      <Route path={"/favorites"}>
        <DashboardLayout>
          <Favorites />
        </DashboardLayout>
      </Route>
      <Route path={"/collections"}>
        <DashboardLayout>
          <Collections />
        </DashboardLayout>
      </Route>
      <Route path={"/mailboxes"}>
        <DashboardLayout>
          <Mailboxes />
        </DashboardLayout>
      </Route>
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path={"/swipes/:id"}>
        {(params) => (
          <DashboardLayout>
            <SwipeDetail id={params.id} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

