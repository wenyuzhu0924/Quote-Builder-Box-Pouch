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
      setPrintingMethod("digital");
    }
  }, []);

  if (!state.productType) {
    return null;
  }

  return <>{children}</>;
}

function DemoSurvey() {
  return <SurveyPage backPath="/demo/digital" nextPath="/demo/digital/quote" hideBack />;
}

function DemoQuote() {
  return <QuotePage surveyPath="/demo/digital" homePath="/demo/digital" hideRestart />;
}

function DemoRouter() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/demo/digital/quote" component={DemoQuote} />
      <Route path="/demo/digital" component={DemoSurvey} />
    </Switch>
  );
}

export default function DemoDigitalPage() {
  return (
    <QuoteProvider>
      <DemoInit>
        <DemoRouter />
      </DemoInit>
    </QuoteProvider>
  );
}
