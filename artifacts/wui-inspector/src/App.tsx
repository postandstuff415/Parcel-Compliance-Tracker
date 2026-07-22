import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import NotFound from '@/pages/not-found';
import InspectorDashboard from '@/pages/inspector-dashboard';
import InspectorLogin from '@/pages/inspector-login';
import ResidentPortal from '@/pages/resident-portal';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function AuthGuardedDashboard() {
  const { inspector } = useAuth();
  if (!inspector) return <InspectorLogin />;
  return <InspectorDashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthGuardedDashboard} />
      <Route path="/resident-portal" component={ResidentPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="wui-theme">
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
