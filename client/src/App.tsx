import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteProvider } from "@/lib/quote-store";
import ProductSelectPage from "@/pages/product-select";
import SurveyPage from "@/pages/survey";
import QuotePage from "@/pages/quote";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProductSelectPage} />
      <Route path="/survey" component={SurveyPage} />
      <Route path="/quote" component={QuotePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <QuoteProvider>
          <Toaster />
          <Router />
        </QuoteProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
