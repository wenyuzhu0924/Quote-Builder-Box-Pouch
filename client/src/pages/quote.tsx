import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Calculator, Copy, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuote } from "@/lib/quote-store";
import { BAG_TYPES, MATERIALS, PRINT_COVERAGE, LAMINATION_TYPES, SPOUT_PRICES } from "@/lib/gravure-config";

interface CalculatorInputs {
  bagType: string;
  width: number;
  height: number;
  bottomInsert: number;
  sideExpansion: number;
  backSeal: number;
  layers: { material: string; thickness: number; density: number; price: number }[];
  printCoverage: number;
  laminationType: string;
  laminationPrice: number;
  postProcessing: {
    zipper: boolean;
    zipperType: string;
    punchHole: boolean;
    laserTear: boolean;
    hotStamp: boolean;
    hotStampArea: number;
    spout: string;
    matteOil: boolean;
  };
  plateColorCount: number;
  quantity: number;
  profitRate: number;
}

export default function QuotePage() {
  const [, navigate] = useLocation();
  const { state, generateConfig, resetQuote } = useQuote();
  const [copied, setCopied] = useState(false);

  const params = state.selectedParams;
  const defaults = state.backendDefaults;

  const [inputs, setInputs] = useState<CalculatorInputs>({
    bagType: "standup",
    width: 100,
    height: 150,
    bottomInsert: 40,
    sideExpansion: 30,
    backSeal: 10,
    layers: [
      { material: "PET", thickness: 12, density: 1.4, price: 8 },
      { material: "PE", thickness: 70, density: 0.92, price: 9.5 },
    ],
    printCoverage: 100,
    laminationType: "dry",
    laminationPrice: defaults.laminationPrices.dry || 1200,
    postProcessing: {
      zipper: false,
      zipperType: "normal",
      punchHole: false,
      laserTear: false,
      hotStamp: false,
      hotStampArea: 10,
      spout: "",
      matteOil: false,
    },
    plateColorCount: 6,
    quantity: 30000,
    profitRate: defaults.profitRate || 15,
  });

  useEffect(() => {
    if (!state.productType) {
      navigate("/");
    } else {
      generateConfig();
    }
  }, []);

  const updateInput = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const updateLayer = (index: number, field: string, value: string | number) => {
    setInputs((prev) => {
      const layers = [...prev.layers];
      layers[index] = { ...layers[index], [field]: value };
      return { ...prev, layers };
    });
  };

  const updatePostProcessing = (field: string, value: boolean | string | number) => {
    setInputs((prev) => ({
      ...prev,
      postProcessing: { ...prev.postProcessing, [field]: value },
    }));
  };

  const quotation = useMemo(() => {
    const bagConfig = BAG_TYPES[inputs.bagType as keyof typeof BAG_TYPES] || BAG_TYPES.standup;
    
    const area = (inputs.width + inputs.height + (inputs.bottomInsert || 0)) * 2 / 10000;
    
    let materialCost = 0;
    inputs.layers.forEach((layer) => {
      const thickness = layer.thickness / 1000;
      const volume = area * thickness;
      const weight = volume * layer.density * 1000;
      materialCost += weight * layer.price;
    });

    const printPrice = defaults.printPrices[inputs.printCoverage as keyof typeof defaults.printPrices] || 2800;
    const printCost = area * printPrice / 1000;

    const laminationCost = inputs.layers.length > 1 ? area * inputs.laminationPrice / 1000 * (inputs.layers.length - 1) : 0;

    let postProcessingCost = 0;
    if (inputs.postProcessing.zipper) {
      postProcessingCost += inputs.width / 1000 * 0.5;
    }
    if (inputs.postProcessing.punchHole) {
      postProcessingCost += 0.01;
    }
    if (inputs.postProcessing.laserTear) {
      postProcessingCost += 0.02;
    }
    if (inputs.postProcessing.hotStamp) {
      postProcessingCost += inputs.postProcessing.hotStampArea * 0.1;
    }
    if (inputs.postProcessing.spout && SPOUT_PRICES[inputs.postProcessing.spout as keyof typeof SPOUT_PRICES]) {
      postProcessingCost += SPOUT_PRICES[inputs.postProcessing.spout as keyof typeof SPOUT_PRICES];
    }
    if (inputs.postProcessing.matteOil) {
      postProcessingCost += area * 500 / 1000;
    }

    const wasteCoeff = bagConfig.wasteCoefficient || 1.08;
    const wasteCost = (materialCost + printCost + laminationCost) * (wasteCoeff - 1);

    const bagMakingCost = 0.02;

    const subtotal = materialCost + printCost + laminationCost + postProcessingCost + wasteCost + bagMakingCost;

    let discountCoeff = 1;
    for (const tier of defaults.quantityDiscounts) {
      if (inputs.quantity >= tier.min) {
        discountCoeff = tier.coefficient;
      }
    }

    const discountedCost = subtotal * discountCoeff;
    const profit = discountedCost * (inputs.profitRate / 100);
    const unitPrice = discountedCost + profit;
    const totalPrice = unitPrice * inputs.quantity;

    return {
      materialCost: materialCost.toFixed(4),
      printCost: printCost.toFixed(4),
      laminationCost: laminationCost.toFixed(4),
      postProcessingCost: postProcessingCost.toFixed(4),
      wasteCost: wasteCost.toFixed(4),
      bagMakingCost: bagMakingCost.toFixed(4),
      subtotal: subtotal.toFixed(4),
      discountCoeff,
      discountedCost: discountedCost.toFixed(4),
      profit: profit.toFixed(4),
      unitPrice: unitPrice.toFixed(4),
      totalPrice: totalPrice.toFixed(2),
    };
  }, [inputs, defaults]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    resetQuote();
    navigate("/");
  };

  if (!state.productType) {
    return null;
  }

  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";

  if (!isGravure) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-foreground">报价器</h1>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">该产品类型的报价器（待实现）</p>
            <Button onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              重新开始
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              包装袋报价器
              <Badge variant="secondary" className="ml-2">凹版印刷</Badge>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "已复制" : "复制链接"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/survey")}
              className="gap-2"
              data-testid="button-edit-params"
            >
              <ArrowLeft className="w-4 h-4" />
              编辑参数
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bag Type & Dimensions */}
            {(params.bagType || Object.values(params.dimensions).some(Boolean)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">袋型与尺寸</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {params.bagType && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">袋型</Label>
                      <Select value={inputs.bagType} onValueChange={(v) => updateInput("bagType", v)}>
                        <SelectTrigger data-testid="select-bagType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(BAG_TYPES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.nameZh}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {params.dimensions.width && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">袋宽 (mm)</Label>
                        <Input
                          type="number"
                          value={inputs.width}
                          onChange={(e) => updateInput("width", Number(e.target.value))}
                          data-testid="input-width"
                        />
                      </div>
                    )}
                    {params.dimensions.height && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">袋高 (mm)</Label>
                        <Input
                          type="number"
                          value={inputs.height}
                          onChange={(e) => updateInput("height", Number(e.target.value))}
                          data-testid="input-height"
                        />
                      </div>
                    )}
                    {params.dimensions.bottomInsert && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">底插入 (mm)</Label>
                        <Input
                          type="number"
                          value={inputs.bottomInsert}
                          onChange={(e) => updateInput("bottomInsert", Number(e.target.value))}
                          data-testid="input-bottomInsert"
                        />
                      </div>
                    )}
                    {params.dimensions.sideExpansion && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">侧面展开 (mm)</Label>
                        <Input
                          type="number"
                          value={inputs.sideExpansion}
                          onChange={(e) => updateInput("sideExpansion", Number(e.target.value))}
                          data-testid="input-sideExpansion"
                        />
                      </div>
                    )}
                    {params.dimensions.backSeal && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">背封边 (mm)</Label>
                        <Input
                          type="number"
                          value={inputs.backSeal}
                          onChange={(e) => updateInput("backSeal", Number(e.target.value))}
                          data-testid="input-backSeal"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Materials */}
            {params.materials.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">材料层结构</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inputs.layers.slice(0, params.materials.layerCount).map((layer, idx) => (
                    <div key={idx} className="p-4 rounded-md bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">第 {idx + 1} 层</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">材料</Label>
                          <Select value={layer.material} onValueChange={(v) => updateLayer(idx, "material", v)}>
                            <SelectTrigger data-testid={`select-material-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(MATERIALS).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {params.materials.showThickness && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">厚度 (μm)</Label>
                            <Input
                              type="number"
                              value={layer.thickness}
                              onChange={(e) => updateLayer(idx, "thickness", Number(e.target.value))}
                              data-testid={`input-thickness-${idx}`}
                            />
                          </div>
                        )}
                        {params.materials.showDensity && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">密度 (g/cm³)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={layer.density}
                              onChange={(e) => updateLayer(idx, "density", Number(e.target.value))}
                              data-testid={`input-density-${idx}`}
                            />
                          </div>
                        )}
                        {params.materials.showPrice && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">单价 (元/kg)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={layer.price}
                              onChange={(e) => updateLayer(idx, "price", Number(e.target.value))}
                              data-testid={`input-price-${idx}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Printing */}
            {params.printing.coverage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">印刷</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">印刷覆盖率</Label>
                    <Select value={String(inputs.printCoverage)} onValueChange={(v) => updateInput("printCoverage", Number(v))}>
                      <SelectTrigger data-testid="select-printCoverage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRINT_COVERAGE).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lamination */}
            {params.lamination.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">复合</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">复合方式</Label>
                    <Select value={inputs.laminationType} onValueChange={(v) => {
                      updateInput("laminationType", v);
                      updateInput("laminationPrice", LAMINATION_TYPES[v as keyof typeof LAMINATION_TYPES]?.price || 1200);
                    }}>
                      <SelectTrigger data-testid="select-laminationType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAMINATION_TYPES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {params.lamination.showPrice && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">复合单价 (元/吨)</Label>
                      <Input
                        type="number"
                        value={inputs.laminationPrice}
                        onChange={(e) => updateInput("laminationPrice", Number(e.target.value))}
                        data-testid="input-laminationPrice"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Post-Processing */}
            {Object.values(params.postProcessing).some(Boolean) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">后处理</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {params.postProcessing.zipper && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                        <Switch
                          checked={inputs.postProcessing.zipper}
                          onCheckedChange={(v) => updatePostProcessing("zipper", v)}
                          data-testid="switch-zipper"
                        />
                        <Label className="text-sm">拉链</Label>
                      </div>
                    )}
                    {params.postProcessing.punchHole && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                        <Switch
                          checked={inputs.postProcessing.punchHole}
                          onCheckedChange={(v) => updatePostProcessing("punchHole", v)}
                          data-testid="switch-punchHole"
                        />
                        <Label className="text-sm">打孔</Label>
                      </div>
                    )}
                    {params.postProcessing.laserTear && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                        <Switch
                          checked={inputs.postProcessing.laserTear}
                          onCheckedChange={(v) => updatePostProcessing("laserTear", v)}
                          data-testid="switch-laserTear"
                        />
                        <Label className="text-sm">激光易撕线</Label>
                      </div>
                    )}
                    {params.postProcessing.hotStamp && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                        <Switch
                          checked={inputs.postProcessing.hotStamp}
                          onCheckedChange={(v) => updatePostProcessing("hotStamp", v)}
                          data-testid="switch-hotStamp"
                        />
                        <Label className="text-sm">烫金/烫银</Label>
                      </div>
                    )}
                    {params.postProcessing.matteOil && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                        <Switch
                          checked={inputs.postProcessing.matteOil}
                          onCheckedChange={(v) => updatePostProcessing("matteOil", v)}
                          data-testid="switch-matteOil"
                        />
                        <Label className="text-sm">哑油</Label>
                      </div>
                    )}
                  </div>

                  {params.postProcessing.spout && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">吸嘴规格</Label>
                      <Select value={inputs.postProcessing.spout || "none"} onValueChange={(v) => updatePostProcessing("spout", v === "none" ? "" : v)}>
                        <SelectTrigger data-testid="select-spout">
                          <SelectValue placeholder="选择吸嘴" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不使用</SelectItem>
                          {Object.entries(SPOUT_PRICES).map(([size, price]) => (
                            <SelectItem key={size} value={size}>{size} - {price}元/个</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {inputs.postProcessing.hotStamp && params.postProcessing.hotStamp && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">烫印面积 (cm²)</Label>
                      <Input
                        type="number"
                        value={inputs.postProcessing.hotStampArea}
                        onChange={(e) => updatePostProcessing("hotStampArea", Number(e.target.value))}
                        data-testid="input-hotStampArea"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Plate */}
            {params.plate.enabled && params.plate.showColorCount && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">制版</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">印刷色数</Label>
                    <Input
                      type="number"
                      value={inputs.plateColorCount}
                      onChange={(e) => updateInput("plateColorCount", Number(e.target.value))}
                      data-testid="input-plateColorCount"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quantity & Profit */}
            {(params.quantity || params.profitRate) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">数量与利润</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {params.quantity && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">订购数量</Label>
                      <Input
                        type="number"
                        value={inputs.quantity}
                        onChange={(e) => updateInput("quantity", Number(e.target.value))}
                        data-testid="input-quantity"
                      />
                    </div>
                  )}
                  {params.profitRate && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">利润率 (%)</Label>
                      <Input
                        type="number"
                        value={inputs.profitRate}
                        onChange={(e) => updateInput("profitRate", Number(e.target.value))}
                        data-testid="input-profitRate"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quote Result Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  报价结果
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">材料成本</span>
                    <span>¥{quotation.materialCost}/个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">印刷成本</span>
                    <span>¥{quotation.printCost}/个</span>
                  </div>
                  {params.lamination.enabled && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">复合成本</span>
                      <span>¥{quotation.laminationCost}/个</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">后处理成本</span>
                    <span>¥{quotation.postProcessingCost}/个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">废料成本</span>
                    <span>¥{quotation.wasteCost}/个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">制袋成本</span>
                    <span>¥{quotation.bagMakingCost}/个</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">小计</span>
                  <span>¥{quotation.subtotal}/个</span>
                </div>

                {quotation.discountCoeff < 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">数量折扣</span>
                    <span className="text-green-600">-{((1 - quotation.discountCoeff) * 100).toFixed(0)}%</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">利润 ({inputs.profitRate}%)</span>
                  <span>¥{quotation.profit}/个</span>
                </div>

                <Separator />

                <div className="flex justify-between font-medium">
                  <span>单价</span>
                  <span className="text-primary text-lg">¥{quotation.unitPrice}/个</span>
                </div>

                <div className="flex justify-between font-medium">
                  <span>总价 ({inputs.quantity.toLocaleString()}个)</span>
                  <span className="text-primary text-xl">¥{Number(quotation.totalPrice).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
