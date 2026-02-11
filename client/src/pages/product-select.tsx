import { useState } from "react";
import { useLocation } from "wouter";
import { Package, ShoppingBag, ArrowRight, Printer, Cpu, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuote, type ProductType, type PrintingMethod } from "@/lib/quote-store";

const products = [
  {
    id: "box" as const,
    name: "礼盒",
    icon: Package,
  },
  {
    id: "pouch" as const,
    name: "包装袋",
    icon: ShoppingBag,
  },
];

const printingMethods = [
  {
    id: "gravure" as const,
    name: "凹版印刷",
    icon: Printer,
  },
  {
    id: "digital" as const,
    name: "数码印刷",
    icon: Cpu,
  },
];

export default function ProductSelectPage() {
  const [, navigate] = useLocation();
  const { state, setProductType, setPrintingMethod } = useQuote();
  const [selectedProduct, setSelectedProduct] = useState<ProductType>(state.productType);
  const [selectedPrinting, setSelectedPrinting] = useState<PrintingMethod>(state.printingMethod);

  const handleProductSelect = (productId: ProductType) => {
    setSelectedProduct(productId);
    if (productId !== "pouch") {
      setSelectedPrinting(null);
    }
  };

  const handlePrintingSelect = (printingId: PrintingMethod) => {
    setSelectedPrinting(printingId);
  };

  const canProceed = selectedProduct === "box" || (selectedProduct === "pouch" && selectedPrinting);

  const handleNext = () => {
    if (canProceed) {
      setProductType(selectedProduct);
      if (selectedProduct === "box") {
        setPrintingMethod(null);
        navigate("/giftbox/survey");
      } else {
        setPrintingMethod(selectedPrinting);
        navigate("/survey");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-app-title">
            报价器生成器
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-page-title">
              请选择您生产的产品类型
            </h2>
            <p className="text-sm text-muted-foreground">
              我们将根据您的选择生成定制化报价器
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => {
              const Icon = product.icon;
              const isSelected = selectedProduct === product.id;
              return (
                <button
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className={`relative group rounded-md p-6 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer border-2 ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-card hover:border-primary/30"
                  } shadow-sm hover:shadow-md`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-center w-16 h-16 rounded-md transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <span
                    className={`text-lg font-semibold transition-colors ${
                      isSelected
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {product.name}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedProduct === "pouch" && (
            <div className="space-y-4">
              <h3 className="text-center text-base font-semibold text-foreground" data-testid="text-printing-title">
                选择印刷方式
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {printingMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPrinting === method.id;
                  return (
                    <button
                      key={method.id}
                      data-testid={`card-printing-${method.id}`}
                      className={`relative group rounded-md p-5 flex flex-col items-center gap-3 transition-all duration-200 cursor-pointer border-2 ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-card hover:border-primary/30"
                      } shadow-sm hover:shadow-md`}
                      onClick={() => handlePrintingSelect(method.id)}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-md transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-base font-semibold transition-colors ${
                          isSelected
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {method.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              data-testid="button-next"
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2 px-8"
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
