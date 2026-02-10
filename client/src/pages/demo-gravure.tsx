import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { QuoteProvider, useQuote } from "@/lib/quote-store";
import SurveyPage from "@/pages/survey";
import QuotePage from "@/pages/quote";

function DemoInit({ children }: { children: React.ReactNode }) {
  const { state, setProductType, setPrintingMethod } = useQuote();

  useEffect(() => {
    if (!state.productType) {
      setProductType("pouch");
      setPrintingMethod("gravure");
    }
  }, []);

  if (!state.productType) {
    return null;
  }

  return <>{children}</>;
}

function DemoSurvey() {
  return <SurveyPage backPath="/demo/gravure" nextPath="/demo/gravure/quote" hideBack />;
}

function DemoQuote() {
  return <QuotePage surveyPath="/demo/gravure" homePath="/demo/gravure" hideRestart />;
}

function DemoRouter() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/demo/gravure/quote" component={DemoQuote} />
      <Route path="/demo/gravure" component={DemoSurvey} />
    </Switch>
  );
}

export default function DemoGravurePage() {
  return (
    <QuoteProvider>
      <DemoInit>
        <DemoRouter />
      </DemoInit>
    </QuoteProvider>
  );
}
