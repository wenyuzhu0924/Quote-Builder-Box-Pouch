import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Info, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuote, type BagType, type MaterialType, type MaterialLayer, type PrintCoverage, type LaminationType, type RowCount, type GravureSurveyData } from "@/lib/quote-store";
import { BAG_TYPES, MATERIALS, PRINT_COVERAGE, LAMINATION_TYPES, QUANTITY_DISCOUNTS, POST_PROCESSING_OPTIONS, SPOUT_PRICES, DEFAULT_PLATE_CONFIG, DIMENSION_FIELDS, THREE_SIDE_ROW_RATES } from "@/lib/gravure-config";

interface FieldState {
  key: string;
  label: string;
  enabled: boolean;
  value: number;
  unit: string;
  isUserInput: boolean;
  tooltip: string;
}

export default function SurveyPage() {
  const [, navigate] = useLocation();
  const { state } = useQuote();

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

  if (!isGravure) {
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
                  2
                </div>
                <span className="text-sm text-muted-foreground">第 2 步，共 3 步</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                填写产品详情
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
                Back
              </Button>
              <Button
                data-testid="button-next"
                onClick={handleNext}
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

  return <GravureSurvey onBack={handleBack} onNext={handleNext} />;
}

interface GravureSurveyProps {
  onBack: () => void;
  onNext: () => void;
}

function GravureSurvey({ onBack, onNext }: GravureSurveyProps) {
  const { state, setGravureSurvey } = useQuote();
  const [openSections, setOpenSections] = useState<string[]>(["bag-type"]);

  const [bagType, setBagType] = useState<BagType | "">(state.gravureSurvey.bagType || "");
  const [rowCount, setRowCount] = useState<RowCount>(state.gravureSurvey.rowCount || 1);

  const [dimensionFields, setDimensionFields] = useState<FieldState[]>(
    DIMENSION_FIELDS.map(f => ({
      key: f.key,
      label: f.label,
      enabled: f.key === "width" || f.key === "height",
      value: f.defaultValue,
      unit: f.unit,
      isUserInput: f.isUserInput,
      tooltip: f.tooltip,
    }))
  );

  const [layers, setLayers] = useState<MaterialLayer[]>(
    state.gravureSurvey.layers || [
      { material: "PET", thickness: 12, density: 1.4, price: 8 },
      { material: "PE", thickness: 70, density: 0.92, price: 9.5 },
    ]
  );

  const [materialPrices, setMaterialPrices] = useState<Record<MaterialType, number>>(
    Object.fromEntries(
      Object.entries(MATERIALS).map(([key, val]) => [key, val.defaultPrice])
    ) as Record<MaterialType, number>
  );

  const [printCoverage, setPrintCoverage] = useState<PrintCoverage>(100);
  const [printPrices, setPrintPrices] = useState<Record<PrintCoverage, number>>(
    Object.fromEntries(
      Object.entries(PRINT_COVERAGE).map(([key, val]) => [Number(key), val.price])
    ) as Record<PrintCoverage, number>
  );

  const [laminationSteps, setLaminationSteps] = useState<{ type: LaminationType; price: number }[]>([
    { type: "dry", price: 0.13 },
  ]);

  const [plateConfig, setPlateConfig] = useState({
    ...DEFAULT_PLATE_CONFIG,
    enabled: true,
  });

  const [quantity, setQuantity] = useState(state.gravureSurvey.quantity || 30000);
  const [profitRate, setProfitRate] = useState(state.gravureSurvey.backendConfig?.profitRate || 15);

  const [postProcessing, setPostProcessing] = useState<Record<string, boolean>>({});
  const [zipperType, setZipperType] = useState<"normal" | "easyTear" | "eco">("normal");
  const [spoutSize, setSpoutSize] = useState<string>("");
  const [hotStampArea, setHotStampArea] = useState(10);

  const syncToGlobalState = useCallback(() => {
    const dimFieldsState = dimensionFields.map(f => ({
      key: f.key,
      enabled: f.enabled,
      value: f.value,
    }));

    const widthField = dimensionFields.find(f => f.key === "width");
    const heightField = dimensionFields.find(f => f.key === "height");
    const bottomInsertField = dimensionFields.find(f => f.key === "bottomInsert");
    const sideExpansionField = dimensionFields.find(f => f.key === "sideExpansion");
    const backSealField = dimensionFields.find(f => f.key === "backSeal");

    const wasteCoeffs = Object.fromEntries(
      Object.entries(BAG_TYPES).map(([key, config]) => [key, config.wasteCoefficient])
    ) as Record<BagType, number>;

    const wasteFees = Object.fromEntries(
      Object.entries(BAG_TYPES).map(([key, config]) => [key, config.wasteFee])
    ) as Record<BagType, number>;

    const bagMakingRates = Object.fromEntries(
      Object.entries(BAG_TYPES).map(([key, config]) => [key, config.bagMakingRate])
    ) as Record<BagType, number>;

    const laminationPricesMap = Object.fromEntries(
      laminationSteps.map(s => [s.type, s.price])
    ) as Record<LaminationType, number>;

    const data: GravureSurveyData = {
      bagType: bagType || undefined,
      dimensions: {
        width: widthField?.value || 100,
        height: heightField?.value || 150,
        bottomInsert: bottomInsertField?.enabled ? bottomInsertField.value : undefined,
        sideExpansion: sideExpansionField?.enabled ? sideExpansionField.value : undefined,
        backSeal: backSealField?.enabled ? backSealField.value : undefined,
      },
      dimensionFields: dimFieldsState,
      rowCount,
      layers,
      printing: { coverage: printCoverage },
      lamination: laminationSteps.map(s => ({ type: s.type, price: s.price })),
      plate: {
        enabled: plateConfig.enabled,
        plateLength: plateConfig.plateLength,
        plateCircumference: plateConfig.plateCircumference,
        colorCount: plateConfig.colorCount,
        unitPrice: plateConfig.unitPrice,
      },
      postProcessing: {
        zipper: postProcessing.zipper ? zipperType : undefined,
        punchHole: postProcessing.punchHole,
        laserTear: postProcessing.laserTear,
        hotStamp: postProcessing.hotStamp,
        hotStampArea: postProcessing.hotStamp ? hotStampArea : undefined,
        wire: postProcessing.wire,
        handle: postProcessing.handle,
        airValve: postProcessing.airValve,
        emboss: postProcessing.emboss,
        windowCut: postProcessing.windowCut,
        spout: spoutSize || undefined,
        matteOil: postProcessing.matteOil,
      },
      quantity,
      backendConfig: {
        materialPrices,
        printPrices,
        laminationPrices: laminationPricesMap,
        bagMakingRates,
        wasteCoefficients: wasteCoeffs,
        wasteFees,
        quantityDiscounts: QUANTITY_DISCOUNTS.map(d => ({ min: d.min, coefficient: d.coefficient })),
        profitRate,
      },
    };

    setGravureSurvey(data);
  }, [bagType, rowCount, dimensionFields, layers, printCoverage, laminationSteps, plateConfig, postProcessing, zipperType, spoutSize, hotStampArea, quantity, profitRate, materialPrices, printPrices, setGravureSurvey]);

  useEffect(() => {
    syncToGlobalState();
  }, [syncToGlobalState]);

  const updateDimensionField = (key: string, updates: Partial<FieldState>) => {
    setDimensionFields(fields =>
      fields.map(f => f.key === key ? { ...f, ...updates } : f)
    );
  };

  const handleBagTypeChange = (type: BagType) => {
    setBagType(type);
    const config = BAG_TYPES[type];
    setDimensionFields(fields =>
      fields.map(f => ({
        ...f,
        enabled: f.key === "width" || f.key === "height" || config.requiredDimensions.includes(f.key),
      }))
    );
  };

  const addLayer = () => {
    if (layers.length < 4) {
      setLayers([...layers, { material: "PE", thickness: 70, density: 0.92, price: 9.5 }]);
    }
  };

  const removeLayer = (index: number) => {
    if (layers.length > 1) {
      setLayers(layers.filter((_, i) => i !== index));
    }
  };

  const updateLayer = (index: number, updates: Partial<MaterialLayer>) => {
    setLayers(layers.map((layer, i) => {
      if (i !== index) return layer;
      const newLayer = { ...layer, ...updates };
      if (updates.material) {
        const mat = MATERIALS[updates.material];
        newLayer.density = mat.density;
        newLayer.thickness = mat.defaultThickness;
        newLayer.price = materialPrices[updates.material] || mat.defaultPrice;
        newLayer.isGsm = mat.isGsm;
      }
      return newLayer;
    }));
  };

  const addLaminationStep = () => {
    if (laminationSteps.length < 3) {
      setLaminationSteps([...laminationSteps, { type: "dry", price: 0.13 }]);
    }
  };

  const removeLaminationStep = (index: number) => {
    if (laminationSteps.length > 0) {
      setLaminationSteps(laminationSteps.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">自动报价器</h1>
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
              凹版印刷参数配置
            </h2>
            <p className="text-muted-foreground mb-4">
              请配置报价所需的各项参数
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">用户输入参数</span>
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">后台计算参数</span>
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="space-y-4"
          >
            {/* Module 1: Bag Type Selection */}
            <AccordionItem value="bag-type" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-bag-type">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">1</Badge>
                  <span className="font-semibold">袋型选择</span>
                  {bagType && (
                    <Badge variant="secondary" className="ml-2">
                      {BAG_TYPES[bagType]?.nameZh}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">选择袋型（用户选择）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(BAG_TYPES).map(([key, config]) => (
                        <Card
                          key={key}
                          data-testid={`card-bagtype-${key}`}
                          className={`cursor-pointer p-4 hover-elevate transition-all ${
                            bagType === key ? "ring-2 ring-primary border-primary" : ""
                          }`}
                          onClick={() => handleBagTypeChange(key as BagType)}
                        >
                          <div className="text-sm font-medium">{config.nameZh}</div>
                          <div className="text-xs text-muted-foreground mt-1">{config.name}</div>
                          <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{config.description}</div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {(bagType === "threeSide" || bagType === "threeSideShape") && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-primary" />
                        <Label className="text-sm font-medium">排数（用户选择）</Label>
                      </div>
                      <Select value={String(rowCount)} onValueChange={(v) => setRowCount(Number(v) as RowCount)}>
                        <SelectTrigger className="w-32" data-testid="select-row-count">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(THREE_SIDE_ROW_RATES).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">尺寸参数（用户输入）</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">勾选的参数将在报价器中要求使用者输入</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dimensionFields.map((field) => (
                        <div
                          key={field.key}
                          className={`flex items-center gap-3 p-3 rounded-md border ${
                            field.enabled ? "bg-card border-primary/30" : "bg-muted/50 opacity-60"
                          }`}
                        >
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={(checked) => updateDimensionField(field.key, { enabled: checked })}
                            data-testid={`switch-dim-${field.key}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{field.label}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>{field.tooltip}</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => updateDimensionField(field.key, { value: Number(e.target.value) })}
                              className="w-20 h-8 text-sm"
                              disabled={!field.enabled}
                              data-testid={`input-dim-${field.key}`}
                            />
                            <span className="text-xs text-muted-foreground w-8">{field.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bagType && (
                    <Card className="p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">展开面积公式（后台计算）</span>
                      </div>
                      <code className="text-xs text-muted-foreground block">
                        {BAG_TYPES[bagType].areaFormula}
                      </code>
                    </Card>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 2: Material Layers */}
            <AccordionItem value="materials" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-materials">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">2</Badge>
                  <span className="font-semibold">材料层结构</span>
                  <Badge variant="secondary" className="ml-2">{layers.length} 层</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">配置复合材料的层数和材料类型（1-4层），复合次数 = 层数 - 1</p>
                  
                  {layers.map((layer, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">第 {index + 1} 层（用户选择）</span>
                        </div>
                        {layers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLayer(index)}
                            data-testid={`button-remove-layer-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">材料类型</Label>
                          <Select
                            value={layer.material}
                            onValueChange={(v) => updateLayer(index, { material: v as MaterialType })}
                          >
                            <SelectTrigger className="mt-1" data-testid={`select-material-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(MATERIALS).map(([key, mat]) => (
                                <SelectItem key={key} value={key}>
                                  {mat.nameZh}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">
                            {MATERIALS[layer.material]?.isGsm ? "克重 (gsm)" : "厚度 (μm)"}
                          </Label>
                          <Input
                            type="number"
                            value={layer.thickness}
                            onChange={(e) => updateLayer(index, { thickness: Number(e.target.value) })}
                            className="mt-1"
                            data-testid={`input-thickness-${index}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <Settings className="w-3 h-3 text-muted-foreground" />
                            <Label className="text-xs">密度 (g/cm³)</Label>
                          </div>
                          <Input
                            type="number"
                            value={layer.density}
                            onChange={(e) => updateLayer(index, { density: Number(e.target.value) })}
                            className="mt-1"
                            disabled={MATERIALS[layer.material]?.isGsm}
                            data-testid={`input-density-${index}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <Settings className="w-3 h-3 text-muted-foreground" />
                            <Label className="text-xs">单价 (元/kg)</Label>
                          </div>
                          <Input
                            type="number"
                            value={layer.price}
                            onChange={(e) => updateLayer(index, { price: Number(e.target.value) })}
                            className="mt-1"
                            data-testid={`input-price-${index}`}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Switch
                          checked={layer.enableSplice || false}
                          onCheckedChange={(checked) => updateLayer(index, { enableSplice: checked })}
                          data-testid={`switch-splice-${index}`}
                        />
                        <span className="text-sm">启用开窗拼接</span>
                      </div>
                    </Card>
                  ))}

                  {layers.length < 4 && (
                    <Button variant="outline" onClick={addLayer} className="w-full gap-2" data-testid="button-add-layer">
                      <Plus className="w-4 h-4" />
                      添加材料层
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 3: Material Cost Calculation */}
            <AccordionItem value="material-cost" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-material-cost">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">3</Badge>
                  <span className="font-semibold">材料成本计算</span>
                  <Badge variant="secondary" className="ml-2">
                    <Settings className="w-3 h-3 mr-1" />
                    后台配置
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <Card className="p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">计算公式</span>
                    </div>
                    <code className="text-xs text-muted-foreground block mb-2">
                      薄膜: C = 展开面积(m²) × 厚度(μm) × 密度(g/cm³) × 单价(元/kg) / 1000
                    </code>
                    <code className="text-xs text-muted-foreground block">
                      纸类: C = 展开面积(m²) × 克重(gsm) / 1000 × 单价(元/kg)
                    </code>
                  </Card>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">材料单价设置（后台配置）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(MATERIALS).map(([key, mat]) => (
                        <div key={key} className="flex items-center gap-2 p-2 border rounded-md">
                          <Label className="text-xs flex-1 truncate" title={mat.nameZh}>{mat.nameZh}</Label>
                          <Input
                            type="number"
                            value={materialPrices[key as MaterialType]}
                            onChange={(e) => setMaterialPrices(prev => ({
                              ...prev,
                              [key]: Number(e.target.value)
                            }))}
                            className="w-16 h-7 text-xs"
                            data-testid={`input-mat-price-${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 4: Process Cost */}
            <AccordionItem value="process-cost" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-process-cost">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">4</Badge>
                  <span className="font-semibold">工艺成本</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Printing */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">印刷覆盖率（用户选择）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(PRINT_COVERAGE).map(([key, config]) => {
                        const coverage = Number(key) as PrintCoverage;
                        return (
                          <Card
                            key={key}
                            className={`cursor-pointer p-3 hover-elevate ${
                              printCoverage === coverage ? "ring-2 ring-primary border-primary" : ""
                            }`}
                            onClick={() => setPrintCoverage(coverage)}
                            data-testid={`card-coverage-${key}`}
                          >
                            <div className="text-sm font-medium">{config.labelShort}</div>
                            <div className="text-xs text-muted-foreground">{config.description}</div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <Settings className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">单价</span>
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                value={printPrices[coverage]}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setPrintPrices(prev => ({
                                    ...prev,
                                    [coverage]: Number(e.target.value)
                                  }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 h-6 text-xs"
                                data-testid={`input-coverage-price-${key}`}
                              />
                              <span className="text-xs text-muted-foreground">元/㎡</span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lamination */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">复合工艺（后台配置）</Label>
                      </div>
                      <span className="text-xs text-muted-foreground">复合次数 = 层数 - 1</span>
                    </div>
                    <div className="space-y-3">
                      {laminationSteps.map((step, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground w-16">第 {index + 1} 次</span>
                          <Select
                            value={step.type}
                            onValueChange={(v) => {
                              const newSteps = [...laminationSteps];
                              newSteps[index] = { type: v as LaminationType, price: LAMINATION_TYPES[v as LaminationType].price };
                              setLaminationSteps(newSteps);
                            }}
                          >
                            <SelectTrigger className="flex-1" data-testid={`select-lamination-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LAMINATION_TYPES).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div>
                                    <div>{config.label}</div>
                                    <div className="text-xs text-muted-foreground">{config.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={step.price}
                              onChange={(e) => {
                                const newSteps = [...laminationSteps];
                                newSteps[index] = { ...step, price: Number(e.target.value) };
                                setLaminationSteps(newSteps);
                              }}
                              className="w-20 h-9"
                              data-testid={`input-lamination-price-${index}`}
                            />
                            <span className="text-xs text-muted-foreground">元/㎡</span>
                          </div>
                          {laminationSteps.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => removeLaminationStep(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {laminationSteps.length < 3 && (
                        <Button variant="outline" onClick={addLaminationStep} className="w-full gap-2" data-testid="button-add-lamination">
                          <Plus className="w-4 h-4" />
                          添加复合步骤
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Post Processing */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">附加工艺（用户选择）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {POST_PROCESSING_OPTIONS.map((opt) => (
                        <div key={opt.id} className="p-3 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={postProcessing[opt.id] || false}
                              onCheckedChange={(checked) => setPostProcessing(prev => ({ ...prev, [opt.id]: checked }))}
                              data-testid={`switch-post-${opt.id}`}
                            />
                            <span className="text-sm font-medium">{opt.nameZh}</span>
                          </div>
                          {opt.priceFormula && (
                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              {opt.priceFormula}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {postProcessing.zipper && (
                      <Card className="mt-3 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-primary" />
                          <Label className="text-xs">拉链类型（用户选择）</Label>
                        </div>
                        <Select value={zipperType} onValueChange={(v) => setZipperType(v as typeof zipperType)}>
                          <SelectTrigger data-testid="select-zipper-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">普通拉链</SelectItem>
                            <SelectItem value="easyTear">易撕拉链</SelectItem>
                            <SelectItem value="eco">可降解拉链</SelectItem>
                          </SelectContent>
                        </Select>
                      </Card>
                    )}

                    {postProcessing.hotStamp && (
                      <Card className="mt-3 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-primary" />
                          <Label className="text-xs">烫金面积（用户输入）</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={hotStampArea}
                            onChange={(e) => setHotStampArea(Number(e.target.value))}
                            className="w-24"
                            data-testid="input-hotstamp-area"
                          />
                          <span className="text-sm text-muted-foreground">cm²</span>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Spout Selection */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">吸嘴规格（用户选择，可选）</Label>
                    </div>
                    <Select value={spoutSize || "none"} onValueChange={(v) => setSpoutSize(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-64" data-testid="select-spout">
                        <SelectValue placeholder="选择吸嘴规格" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不使用吸嘴</SelectItem>
                        {Object.entries(SPOUT_PRICES).map(([size, price]) => (
                          <SelectItem key={size} value={size}>
                            {size} - {price}元/个
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 5: Plate & Setup */}
            <AccordionItem value="plate-setup" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-plate-setup">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">5</Badge>
                  <span className="font-semibold">制版与上机</span>
                  <Badge variant="secondary" className="ml-2">
                    <Settings className="w-3 h-3 mr-1" />
                    后台配置
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Switch
                      checked={plateConfig.enabled}
                      onCheckedChange={(checked) => setPlateConfig(prev => ({ ...prev, enabled: checked }))}
                      data-testid="switch-plate-enabled"
                    />
                    <span className="text-sm">启用制版费计算</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <Settings className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">版长 (cm)</Label>
                      </div>
                      <Input
                        type="number"
                        value={plateConfig.plateLength}
                        onChange={(e) => setPlateConfig(prev => ({ ...prev, plateLength: Number(e.target.value) }))}
                        className="mt-1"
                        disabled={!plateConfig.enabled}
                        data-testid="input-plate-length"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Settings className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">版周 (cm)</Label>
                      </div>
                      <Input
                        type="number"
                        value={plateConfig.plateCircumference}
                        onChange={(e) => setPlateConfig(prev => ({ ...prev, plateCircumference: Number(e.target.value) }))}
                        className="mt-1"
                        disabled={!plateConfig.enabled}
                        data-testid="input-plate-circumference"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Settings className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">色数</Label>
                      </div>
                      <Input
                        type="number"
                        value={plateConfig.colorCount}
                        onChange={(e) => setPlateConfig(prev => ({ ...prev, colorCount: Number(e.target.value) }))}
                        className="mt-1"
                        disabled={!plateConfig.enabled}
                        data-testid="input-color-count"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Settings className="w-3 h-3 text-muted-foreground" />
                        <Label className="text-xs">单价 (元/cm²)</Label>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        value={plateConfig.unitPrice}
                        onChange={(e) => setPlateConfig(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                        className="mt-1"
                        disabled={!plateConfig.enabled}
                        data-testid="input-plate-unit-price"
                      />
                    </div>
                  </div>

                  <Card className="p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">计算公式</span>
                    </div>
                    <code className="text-xs text-muted-foreground block mb-2">
                      版费 = 版长(cm) × 版周(cm) × 色数 × 单价(元/cm²)
                    </code>
                    <code className="text-xs text-muted-foreground block">
                      上机费 = min(200 × 色数, 1800)（仅当数量 &lt; 10,000时）
                    </code>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 6: MOQ & Discount */}
            <AccordionItem value="moq-discount" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-moq-discount">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">6</Badge>
                  <span className="font-semibold">起订量与折扣</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">数量（用户输入）</Label>
                    </div>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-48"
                      data-testid="input-quantity"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">数量折扣系数表（后台配置）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {QUANTITY_DISCOUNTS.map((tier, index) => (
                        <Card
                          key={index}
                          className={`p-3 ${quantity >= tier.min && (index === QUANTITY_DISCOUNTS.length - 1 || quantity < QUANTITY_DISCOUNTS[index - 1]?.min) ? "ring-2 ring-primary border-primary" : ""}`}
                        >
                          <div className="text-sm font-medium">{tier.label}</div>
                          <div className="text-lg font-bold text-primary mt-1">×{tier.coefficient}</div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Module 7: Waste & Profit */}
            <AccordionItem value="waste-profit" className="border rounded-md bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline" data-testid="accordion-waste-profit">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">7</Badge>
                  <span className="font-semibold">损耗与利润</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">利润率（后台配置）</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={profitRate}
                        onChange={(e) => setProfitRate(Number(e.target.value))}
                        className="w-24"
                        data-testid="input-profit-rate"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">损耗系数表（按袋型，后台配置）</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(BAG_TYPES).map(([key, config]) => (
                        <Card key={key} className={`p-3 ${bagType === key ? "ring-2 ring-primary border-primary" : ""}`}>
                          <div className="text-sm font-medium truncate">{config.nameZh}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-lg font-bold text-primary">×{config.wasteCoefficient}</span>
                            <span className="text-xs text-muted-foreground">{config.wasteFee}元</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Card className="p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">利润计算公式</span>
                    </div>
                    <code className="text-xs text-muted-foreground block">
                      利润系数 = 1 + 利润率(%) / 100 = {(1 + profitRate / 100).toFixed(2)}
                    </code>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 flex justify-between">
            <Button
              data-testid="button-back"
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              data-testid="button-next"
              onClick={onNext}
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
