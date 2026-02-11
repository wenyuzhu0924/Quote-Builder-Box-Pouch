import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { QuoteProvider, useQuote } from "@/lib/quote-store";
import { GiftBoxProvider } from "@/lib/giftbox-store";
import QuotePage from "@/pages/quote";
import GiftBoxQuotePage from "@/pages/giftbox-quote";

interface SharedQuoteData {
  id: string;
  quoteType: "gravure" | "digital" | "giftbox";
  customerName: string;
  configData: unknown;
}

function SharedGravureLoader({ data }: { data: SharedQuoteData }) {
  const { setProductType, setPrintingMethod, setConfig } = useQuote();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProductType("pouch");
    setPrintingMethod("gravure");
    setConfig(data.configData as any);
    if (data.customerName) {
      localStorage.setItem("customerName", data.customerName);
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return <QuotePage surveyPath="" homePath="" hideRestart />;
}

function SharedDigitalLoader({ data }: { data: SharedQuoteData }) {
  const { setProductType, setPrintingMethod, setDigitalConfig } = useQuote();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProductType("pouch");
    setPrintingMethod("digital");
    setDigitalConfig(data.configData as any);
    if (data.customerName) {
      localStorage.setItem("customerName", data.customerName);
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return <QuotePage surveyPath="" homePath="" hideRestart />;
}

export default function SharedQuotePage() {
  const [, params] = useRoute("/s/:id");
  const [data, setData] = useState<SharedQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/shared-quotes/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(d => {
        setData(d);
        if (d.customerName) {
          localStorage.setItem("customerName", d.customerName);
        }
      })
      .catch(() => setError("报价器链接无效或已过期"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-shared-quote">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="error-shared-quote">
        <p className="text-lg text-muted-foreground">{error || "加载失败"}</p>
      </div>
    );
  }

  if (data.quoteType === "giftbox") {
    return (
      <GiftBoxProvider initial={data.configData as any}>
        <GiftBoxQuotePage surveyPath="" homePath="" hideRestart />
      </GiftBoxProvider>
    );
  }

  if (data.quoteType === "gravure") {
    return (
      <QuoteProvider>
        <SharedGravureLoader data={data} />
      </QuoteProvider>
    );
  }

  if (data.quoteType === "digital") {
    return (
      <QuoteProvider>
        <SharedDigitalLoader data={data} />
      </QuoteProvider>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">不支持的报价类型</p>
    </div>
  );
}
