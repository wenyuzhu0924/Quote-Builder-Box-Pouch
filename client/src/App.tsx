import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteProvider } from "@/lib/quote-store";
import { GiftBoxProvider } from "@/lib/giftbox-store";
import { SoftBoxProvider } from "@/lib/softbox-store";
import ProductSelectPage from "@/pages/product-select";
import SurveyPage from "@/pages/survey";
import QuotePage from "@/pages/quote";
import GiftBoxSurveyPage from "@/pages/giftbox-survey";
import GiftBoxQuotePage from "@/pages/giftbox-quote";
import SoftBoxSurveyPage from "@/pages/softbox-survey";
import SoftBoxQuotePage from "@/pages/softbox-quote";
import DemoGravurePage from "@/pages/demo-gravure";
import DemoGiftBoxPage from "@/pages/demo-giftbox";
import DemoDigitalPage from "@/pages/demo-digital";
import SharedQuotePage from "@/pages/shared-quote";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const [location] = useLocation();

  if (location.startsWith("/demo/gravure")) {
    return <DemoGravurePage />;
  }

  if (location.startsWith("/demo/giftbox")) {
    return <DemoGiftBoxPage />;
  }

  if (location.startsWith("/demo/digital")) {
    return <DemoDigitalPage />;
  }

  if (location.startsWith("/s/")) {
    return <SharedQuotePage />;
  }

  if (location.startsWith("/softbox")) {
    return (
      <SoftBoxProvider>
        <Switch>
          <Route path="/softbox/survey">{() => <SoftBoxSurveyPage />}</Route>
          <Route path="/softbox/quote">{() => <SoftBoxQuotePage />}</Route>
          <Route component={NotFound} />
        </Switch>
      </SoftBoxProvider>
    );
  }

  if (location.startsWith("/giftbox")) {
    return (
      <GiftBoxProvider>
        <Switch>
          <Route path="/giftbox/survey">{() => <GiftBoxSurveyPage />}</Route>
          <Route path="/giftbox/quote">{() => <GiftBoxQuotePage />}</Route>
          <Route component={NotFound} />
        </Switch>
      </GiftBoxProvider>
    );
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
