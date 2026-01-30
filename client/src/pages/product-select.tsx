import { useState } from "react";
import { useLocation } from "wouter";
import { Package, ShoppingBag, ArrowRight, Printer, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuote, type ProductType, type PrintingMethod } from "@/lib/quote-store";

const products = [
  {
    id: "box" as const,
    name: "礼盒",
    nameEn: "Gift Box",
    description: "高端礼品包装盒，适用于各类精美礼品",
    icon: Package,
  },
  {
    id: "pouch" as const,
    name: "包装袋",
    nameEn: "Pouch",
    description: "灵活便捷的软包装袋，适用于食品、日用品等",
    icon: ShoppingBag,
  },
];

const printingMethods = [
  {
    id: "gravure" as const,
    name: "凹版印刷",
    nameEn: "Gravure Printing",
    description: "适合大批量生产，印刷质量高，色彩饱满",
    icon: Printer,
  },
  {
    id: "digital" as const,
    name: "数码印刷",
    nameEn: "Digital Printing",
    description: "适合小批量、个性化定制，起订量低",
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
      if (selectedProduct === "pouch") {
        setPrintingMethod(selectedPrinting);
      }
      navigate("/survey");
    }
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
                1
              </div>
              <span className="text-sm text-muted-foreground">第 1 步，共 3 步</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              选择产品类型
            </h2>
            <p className="text-muted-foreground">
              请选择您需要报价的产品类型，我们将根据您的选择提供定制化报价方案
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => {
              const Icon = product.icon;
              const isSelected = selectedProduct === product.id;
              return (
                <Card
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className={`cursor-pointer transition-all duration-200 hover-elevate ${
                    isSelected
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-md ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {product.name}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {product.nameEn}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedProduct === "pouch" && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                选择印刷方式
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {printingMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPrinting === method.id;
                  return (
                    <Card
                      key={method.id}
                      data-testid={`card-printing-${method.id}`}
                      className={`cursor-pointer transition-all duration-200 hover-elevate ${
                        isSelected
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => handlePrintingSelect(method.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-md ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-foreground">
                                {method.name}
                              </h3>
                              <span className="text-sm text-muted-foreground">
                                {method.nameEn}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              data-testid="button-next"
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
