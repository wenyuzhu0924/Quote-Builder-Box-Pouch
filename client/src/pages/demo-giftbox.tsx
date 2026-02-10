import { Switch, Route, useLocation } from "wouter";
import { GiftBoxProvider } from "@/lib/giftbox-store";
import GiftBoxSurveyPage from "@/pages/giftbox-survey";
import GiftBoxQuotePage from "@/pages/giftbox-quote";

function DemoSurvey() {
  return <GiftBoxSurveyPage backPath="/demo/giftbox" nextPath="/demo/giftbox/quote" hideBack />;
}

function DemoQuote() {
  return <GiftBoxQuotePage surveyPath="/demo/giftbox" homePath="/demo/giftbox" hideRestart />;
}

function DemoRouter() {
  return (
    <Switch>
      <Route path="/demo/giftbox/quote" component={DemoQuote} />
      <Route path="/demo/giftbox" component={DemoSurvey} />
    </Switch>
  );
}

export default function DemoGiftBoxPage() {
  return (
    <GiftBoxProvider>
      <DemoRouter />
    </GiftBoxProvider>
  );
}
