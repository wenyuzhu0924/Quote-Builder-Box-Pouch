import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Settings, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuote, type SelectedParameters } from "@/lib/quote-store";

interface ParameterOption {
  id: string;
  label: string;
  tooltip: string;
  isUserInput: boolean;
}

const DIMENSION_OPTIONS: ParameterOption[] = [
  { id: "width", label: "袋宽", tooltip: "包装袋的宽度", isUserInput: true },
  { id: "height", label: "袋高", tooltip: "包装袋的高度", isUserInput: true },
  { id: "bottomInsert", label: "底插入", tooltip: "站立袋底部插入深度", isUserInput: true },
  { id: "sideExpansion", label: "侧面展开", tooltip: "侧面展开宽度", isUserInput: true },
  { id: "backSeal", label: "背封边", tooltip: "背封边宽度", isUserInput: true },
];

const MATERIAL_OPTIONS: ParameterOption[] = [
  { id: "showThickness", label: "显示厚度", tooltip: "让用户输入材料厚度", isUserInput: true },
  { id: "showDensity", label: "显示密度", tooltip: "让用户查看/修改材料密度", isUserInput: false },
  { id: "showPrice", label: "显示单价", tooltip: "让用户查看/修改材料单价", isUserInput: false },
];

const POST_PROCESSING_OPTIONS: ParameterOption[] = [
  { id: "zipper", label: "拉链", tooltip: "添加拉链选项", isUserInput: true },
  { id: "punchHole", label: "打孔", tooltip: "添加挂孔选项", isUserInput: true },
  { id: "laserTear", label: "激光易撕线", tooltip: "添加激光易撕线选项", isUserInput: true },
  { id: "hotStamp", label: "烫金/烫银", tooltip: "添加烫印选项", isUserInput: true },
  { id: "spout", label: "吸嘴", tooltip: "添加吸嘴选项", isUserInput: true },
  { id: "matteOil", label: "哑油", tooltip: "添加哑油处理选项", isUserInput: true },
];

const PLATE_OPTIONS: ParameterOption[] = [
  { id: "showLength", label: "版长", tooltip: "制版长度", isUserInput: false },
  { id: "showCircumference", label: "版周长", tooltip: "制版周长", isUserInput: false },
  { id: "showColorCount", label: "色数", tooltip: "印刷色数", isUserInput: true },
  { id: "showUnitPrice", label: "版费单价", tooltip: "每色版费单价", isUserInput: false },
];

export default function SurveyPage() {
  const [, navigate] = useLocation();
  const { state, setSelectedParams, setBackendDefaults } = useQuote();

  const [params, setParams] = useState<SelectedParameters>(state.selectedParams);
  const [layerCount, setLayerCount] = useState(state.selectedParams.materials.layerCount);
  const [profitRate, setProfitRate] = useState(state.backendDefaults.profitRate);

  useEffect(() => {
    setSelectedParams(params);
  }, [params, setSelectedParams]);

  useEffect(() => {
    setBackendDefaults({ ...state.backendDefaults, profitRate });
  }, [profitRate]);

  if (!state.productType) {
    navigate("/");
    return null;
  }

  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";

  const handleBack = () => {
    navigate("/");
  };

  const handleNext = () => {
    navigate("/quote");
  };

  const updateDimension = (key: keyof typeof params.dimensions, value: boolean) => {
    setParams((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value },
    }));
  };

  const updateMaterial = (key: keyof typeof params.materials, value: boolean | number) => {
    setParams((prev) => ({
      ...prev,
      materials: { ...prev.materials, [key]: value },
    }));
  };

  const updatePostProcessing = (key: keyof typeof params.postProcessing, value: boolean) => {
    setParams((prev) => ({
      ...prev,
      postProcessing: { ...prev.postProcessing, [key]: value },
    }));
  };

  const updatePlate = (key: keyof typeof params.plate, value: boolean) => {
    setParams((prev) => ({
      ...prev,
      plate: { ...prev.plate, [key]: value },
    }));
  };

  if (!isGravure) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-foreground">报价器生成器</h1>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-muted-foreground">第 2 步，共 3 步</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                选择报价器参数
              </h2>
              <p className="text-muted-foreground">
                您选择的产品类型：
                <span className="font-medium text-foreground ml-1">
                  {state.productType === "box" ? "礼盒" : "包装袋"}
                  {state.printingMethod === "digital" && " - 数码印刷"}
                </span>
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">该印刷方式的参数配置页面（待实现）</p>
            </div>

            <div className="mt-8 flex justify-between">
              <Button
                data-testid="button-back"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <Button
                data-testid="button-next"
                onClick={handleNext}
                className="gap-2"
              >
                生成报价器
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">报价器生成器</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <span className="text-sm text-muted-foreground">第 2 步，共 3 步</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              选择报价器包含的参数
            </h2>
            <p className="text-muted-foreground mb-4">
              勾选您希望在报价器中显示的参数字段。
              <span className="font-medium text-foreground ml-1">凹版印刷 - 包装袋</span>
            </p>
            
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">用户输入字段</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">后台配置字段</span>
              </div>
            </div>
          </div>

          <Accordion type="multiple" defaultValue={["dimensions", "materials", "printing"]} className="space-y-4">
            {/* Module 1: Bag Type & Dimensions */}
            <AccordionItem value="dimensions" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-dimensions">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    1
                  </div>
                  <span className="font-medium">袋型与尺寸</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="bagType"
                      checked={params.bagType}
                      onCheckedChange={(checked) => setParams((p) => ({ ...p, bagType: !!checked }))}
                      data-testid="checkbox-bagType"
                    />
                    <User className="w-4 h-4 text-primary" />
                    <Label htmlFor="bagType" className="flex-1 cursor-pointer">袋型选择</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>让用户选择袋型（站立袋、三边封等）</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="pl-4 space-y-2">
                    <Label className="text-sm text-muted-foreground">尺寸字段</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DIMENSION_OPTIONS.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                          <Checkbox
                            id={`dim-${opt.id}`}
                            checked={params.dimensions[opt.id as keyof typeof params.dimensions]}
                            onCheckedChange={(checked) => updateDimension(opt.id as keyof typeof params.dimensions, !!checked)}
                            data-testid={`checkbox-dim-${opt.id}`}
                          />
                          {opt.isUserInput ? (
                            <User className="w-4 h-4 text-primary" />
                          ) : (
                            <Settings className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Label htmlFor={`dim-${opt.id}`} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 2: Materials */}
            <AccordionItem value="materials" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-materials">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    2
                  </div>
                  <span className="font-medium">材料层结构</span>
                  {params.materials.enabled && (
                    <Badge variant="secondary">{layerCount}层</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="materials-enabled"
                      checked={params.materials.enabled}
                      onCheckedChange={(checked) => updateMaterial("enabled", !!checked)}
                      data-testid="checkbox-materials-enabled"
                    />
                    <User className="w-4 h-4 text-primary" />
                    <Label htmlFor="materials-enabled" className="flex-1 cursor-pointer">启用材料配置</Label>
                  </div>

                  {params.materials.enabled && (
                    <>
                      <div className="flex items-center gap-4 p-3 rounded-md bg-muted/30">
                        <Label className="text-sm">材料层数</Label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4].map((n) => (
                            <Button
                              key={n}
                              size="sm"
                              variant={layerCount === n ? "default" : "outline"}
                              onClick={() => {
                                setLayerCount(n);
                                updateMaterial("layerCount", n);
                              }}
                              data-testid={`button-layer-${n}`}
                            >
                              {n}层
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="pl-4 space-y-2">
                        <Label className="text-sm text-muted-foreground">显示字段</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {MATERIAL_OPTIONS.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                              <Checkbox
                                id={`mat-${opt.id}`}
                                checked={params.materials[opt.id as keyof typeof params.materials] as boolean}
                                onCheckedChange={(checked) => updateMaterial(opt.id as keyof typeof params.materials, !!checked)}
                                data-testid={`checkbox-mat-${opt.id}`}
                              />
                              {opt.isUserInput ? (
                                <User className="w-4 h-4 text-primary" />
                              ) : (
                                <Settings className="w-4 h-4 text-muted-foreground" />
                              )}
                              <Label htmlFor={`mat-${opt.id}`} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 3: Printing */}
            <AccordionItem value="printing" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-printing">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    3
                  </div>
                  <span className="font-medium">印刷</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Checkbox
                    id="printing-coverage"
                    checked={params.printing.coverage}
                    onCheckedChange={(checked) => setParams((p) => ({ ...p, printing: { ...p.printing, coverage: !!checked } }))}
                    data-testid="checkbox-printing-coverage"
                  />
                  <User className="w-4 h-4 text-primary" />
                  <Label htmlFor="printing-coverage" className="flex-1 cursor-pointer">印刷覆盖率</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>让用户选择印刷覆盖率（25%-300%）</TooltipContent>
                  </Tooltip>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 4: Lamination */}
            <AccordionItem value="lamination" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-lamination">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    4
                  </div>
                  <span className="font-medium">复合</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="lamination-enabled"
                      checked={params.lamination.enabled}
                      onCheckedChange={(checked) => setParams((p) => ({ ...p, lamination: { ...p.lamination, enabled: !!checked } }))}
                      data-testid="checkbox-lamination-enabled"
                    />
                    <User className="w-4 h-4 text-primary" />
                    <Label htmlFor="lamination-enabled" className="flex-1 cursor-pointer">启用复合配置</Label>
                  </div>

                  {params.lamination.enabled && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 ml-4">
                      <Checkbox
                        id="lamination-price"
                        checked={params.lamination.showPrice}
                        onCheckedChange={(checked) => setParams((p) => ({ ...p, lamination: { ...p.lamination, showPrice: !!checked } }))}
                        data-testid="checkbox-lamination-price"
                      />
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="lamination-price" className="flex-1 cursor-pointer text-sm">显示复合单价</Label>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 5: Post-Processing */}
            <AccordionItem value="post-processing" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-post-processing">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    5
                  </div>
                  <span className="font-medium">后处理</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {POST_PROCESSING_OPTIONS.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                      <Checkbox
                        id={`pp-${opt.id}`}
                        checked={params.postProcessing[opt.id as keyof typeof params.postProcessing]}
                        onCheckedChange={(checked) => updatePostProcessing(opt.id as keyof typeof params.postProcessing, !!checked)}
                        data-testid={`checkbox-pp-${opt.id}`}
                      />
                      {opt.isUserInput ? (
                        <User className="w-4 h-4 text-primary" />
                      ) : (
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Label htmlFor={`pp-${opt.id}`} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 6: Plate */}
            <AccordionItem value="plate" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-plate">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    6
                  </div>
                  <span className="font-medium">制版</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="plate-enabled"
                      checked={params.plate.enabled}
                      onCheckedChange={(checked) => updatePlate("enabled", !!checked)}
                      data-testid="checkbox-plate-enabled"
                    />
                    <User className="w-4 h-4 text-primary" />
                    <Label htmlFor="plate-enabled" className="flex-1 cursor-pointer">启用制版配置</Label>
                  </div>

                  {params.plate.enabled && (
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {PLATE_OPTIONS.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                          <Checkbox
                            id={`plate-${opt.id}`}
                            checked={params.plate[opt.id as keyof typeof params.plate] as boolean}
                            onCheckedChange={(checked) => updatePlate(opt.id as keyof typeof params.plate, !!checked)}
                            data-testid={`checkbox-plate-${opt.id}`}
                          />
                          {opt.isUserInput ? (
                            <User className="w-4 h-4 text-primary" />
                          ) : (
                            <Settings className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Label htmlFor={`plate-${opt.id}`} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 7: Quantity & Profit */}
            <AccordionItem value="quantity-profit" className="border rounded-md bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-quantity-profit">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    7
                  </div>
                  <span className="font-medium">数量与利润</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="quantity"
                      checked={params.quantity}
                      onCheckedChange={(checked) => setParams((p) => ({ ...p, quantity: !!checked }))}
                      data-testid="checkbox-quantity"
                    />
                    <User className="w-4 h-4 text-primary" />
                    <Label htmlFor="quantity" className="flex-1 cursor-pointer">订购数量</Label>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Checkbox
                      id="profitRate"
                      checked={params.profitRate}
                      onCheckedChange={(checked) => setParams((p) => ({ ...p, profitRate: !!checked }))}
                      data-testid="checkbox-profitRate"
                    />
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="profitRate" className="flex-1 cursor-pointer">利润率设置</Label>
                  </div>

                  {!params.profitRate && (
                    <div className="flex items-center gap-4 p-3 rounded-md bg-muted/30 ml-4">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">默认利润率</Label>
                      <Input
                        type="number"
                        value={profitRate}
                        onChange={(e) => setProfitRate(Number(e.target.value))}
                        className="w-24"
                        data-testid="input-default-profit"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 flex justify-between">
            <Button
              data-testid="button-back"
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <Button
              data-testid="button-next"
              onClick={handleNext}
              className="gap-2"
            >
              生成报价器
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
