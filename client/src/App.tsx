import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteProvider } from "@/lib/quote-store";
import ProductSelectPage from "@/pages/product-select";
import SurveyPage from "@/pages/survey";
import QuotePage from "@/pages/quote";
import DemoGravurePage from "@/pages/demo-gravure";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const [location] = useLocation();

  if (location.startsWith("/demo/gravure")) {
    return <DemoGravurePage />;
  }

  return (
    <QuoteProvider>
      <Switch>
        <Route path="/" component={ProductSelectPage} />
        <Route path="/survey">{() => <SurveyPage />}</Route>
        <Route path="/quote">{() => <QuotePage />}</Route>
        <Route component={NotFound} />
      </Switch>
    </QuoteProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
