import { useLocation } from "wouter";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuote } from "@/lib/quote-store";

export default function QuotePage() {
  const [, navigate] = useLocation();
  const { state, resetQuote } = useQuote();

  if (!state.productType) {
    navigate("/");
    return null;
  }

  const handleBack = () => {
    navigate("/survey");
  };

  const handleReset = () => {
    resetQuote();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">自动报价器</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <span className="text-sm text-muted-foreground">第 3 步，共 3 步</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              您的报价结果
            </h2>
            <p className="text-muted-foreground">
              产品类型：
              <span className="font-medium text-foreground ml-1">
                {state.productType === "box" ? "礼盒" : "包装袋"}
              </span>
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Quote 页面（待实现）</p>
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              data-testid="button-back"
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              data-testid="button-reset"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新报价
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
