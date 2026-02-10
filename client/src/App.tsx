import { Switch, Route } from "wouter";
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

function MainApp() {
  return (
    <QuoteProvider>
      <Switch>
        <Route path="/" component={ProductSelectPage} />
        <Route path="/survey">{() => <SurveyPage />}</Route>
        <Route path="/quote">{() => <QuotePage />}</Route>
      </Switch>
    </QuoteProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/demo/gravure/:rest*" component={DemoGravurePage} />
      <Route path="/demo/gravure" component={DemoGravurePage} />
      <Route path="/:rest*">
        <MainApp />
      </Route>
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
