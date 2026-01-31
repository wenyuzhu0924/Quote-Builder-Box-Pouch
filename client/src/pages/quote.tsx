import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, RefreshCw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuote, type CustomMaterial, type CustomBagType } from "@/lib/quote-store";

interface MaterialLayer {
  materialId: string;
  thickness: number;
  density: number;
  price: number;
}

interface LaminationStep {
  id: string;
  laminationId: string;
}

interface SelectedPostProcessing {
  [key: string]: boolean;
}

export default function QuotePage() {
  const [, navigate] = useLocation();
  const { state, resetQuote } = useQuote();
  const config = state.config;

  const [selectedBagTypeId, setSelectedBagTypeId] = useState<string>(
    config.customBagTypes[0]?.id || ""
  );
  const [dimensions, setDimensions] = useState({
    width: 190,
    height: 300,
    bottomInsert: 40,
    sideExpansion: 30,
    backSeal: 10,
  });
  const [quantity, setQuantity] = useState(30000);
  
  const [materialLayers, setMaterialLayers] = useState<MaterialLayer[]>(() => {
    const layers: MaterialLayer[] = [];
    const firstMaterial = config.materialLibrary[0];
    if (firstMaterial) {
      layers.push({
        materialId: firstMaterial.id,
        thickness: firstMaterial.thickness,
        density: firstMaterial.density,
        price: firstMaterial.price,
      });
    }
    return layers;
  });

  const [laminationSteps, setLaminationSteps] = useState<LaminationStep[]>(() => {
    const firstRule = config.laminationPriceRules[0];
    return firstRule ? [{ id: "step_1", laminationId: firstRule.id }] : [];
  });

  const [selectedPrintCoverage, setSelectedPrintCoverage] = useState(
    config.printingPriceRules[2]?.coverage || 100
  );

  const [selectedPostProcessing, setSelectedPostProcessing] = useState<SelectedPostProcessing>({});

  const [plateConfig, setPlateConfig] = useState({
    plateLength: config.platePriceConfig.defaultPlateLength,
    plateCircumference: config.platePriceConfig.defaultPlateCircumference,
    colorCount: config.platePriceConfig.defaultColorCount,
    pricePerSqcm: config.platePriceConfig.pricePerSqcm,
  });

  const [profitRate, setProfitRate] = useState(10);
  const [exchangeRate, setExchangeRate] = useState(7.2);

  if (!state.productType) {
    navigate("/");
    return null;
  }

  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";

  const selectedBagType = config.customBagTypes.find((b) => b.id === selectedBagTypeId);
  const requiredDimensions = selectedBagType?.requiredDimensions || [];

  const calculateArea = useMemo(() => {
    const w = dimensions.width / 1000;
    const h = dimensions.height / 1000;
    const bi = dimensions.bottomInsert / 1000;
    const se = dimensions.sideExpansion / 1000;
    const bs = dimensions.backSeal / 1000;

    if (!selectedBagType) return w * h * 2;

    switch (selectedBagType.id) {
      case "standup":
        return w * (h + bi) * 2;
      case "threeSide":
        return w * h * 2;
      case "centerSeal":
        return (w + bs) * 2 * h;
      case "gusset":
        return (w + se + bs) * 2 * h;
      case "eightSide":
        return w * h * 2 + se * h * 2;
      case "taperBottom":
        return ((w + se) * 2 + 0.02) * (h + 0.01);
      case "flatBottom":
        return ((w + se) * 2 + 0.03) * (h + se / 2 + 0.015);
      case "threeSideShape":
        return (w * 2 + 0.01) * (h + 0.005);
      case "taperShape":
        return ((h + bi) * 2 + 0.03) * (w + 0.005);
      case "rollFilm":
        return w;
      default:
        return w * h * 2;
    }
  }, [selectedBagType, dimensions]);

  const getMaterialById = (id: string): CustomMaterial | undefined => {
    return config.materialLibrary.find((m) => m.id === id);
  };

  const costs = useMemo(() => {
    const area = calculateArea;

    let materialCostPerUnit = 0;
    materialLayers.forEach((layer) => {
      const thicknessM = layer.thickness / 1000000;
      const materialWeight = area * thicknessM * layer.density * 1000;
      materialCostPerUnit += materialWeight * layer.price / 1000;
    });

    const printRule = config.printingPriceRules.find((r) => r.coverage === selectedPrintCoverage);
    const printCostPerUnit = printRule ? area * printRule.pricePerSqm : 0;

    let laminationCostPerUnit = 0;
    laminationSteps.forEach((step) => {
      const rule = config.laminationPriceRules.find((r) => r.id === step.laminationId);
      if (rule) {
        laminationCostPerUnit += area * rule.pricePerSqm;
      }
    });

    let postProcessingCostPerUnit = 0;
    Object.entries(selectedPostProcessing).forEach(([id, isSelected]) => {
      if (!isSelected) return;
      const widthM = dimensions.width / 1000;
      
      if (id === "zipper_normal") {
        postProcessingCostPerUnit += selectedBagType?.id === "eightSide" ? 0.22 * widthM : 0.10 * widthM;
      } else if (id === "zipper_easyTear") {
        postProcessingCostPerUnit += selectedBagType?.id === "eightSide" ? 0.47 * widthM : 0.20 * widthM;
      } else if (id === "zipper_eco") {
        postProcessingCostPerUnit += 0.50 * widthM;
      } else if (id === "punchHole") {
        postProcessingCostPerUnit += 0;
      } else if (id === "laserTear") {
        postProcessingCostPerUnit += 0.2 * widthM;
      } else if (id === "hotStamp") {
        postProcessingCostPerUnit += area * 1.2 + 0.02;
      } else if (id === "wire") {
        const wireCost = (dimensions.width + 40) * 0.00013;
        const laborCost = dimensions.width <= 140 ? 0.024 : 0.026;
        postProcessingCostPerUnit += wireCost + laborCost;
      } else if (id === "handle") {
        postProcessingCostPerUnit += 0.15;
      } else if (id === "airValve") {
        postProcessingCostPerUnit += 0.11;
      } else if (id === "emboss") {
        postProcessingCostPerUnit += 0.2;
      } else if (id === "windowCut") {
        postProcessingCostPerUnit += 0.03;
      } else if (id === "matteOil") {
        postProcessingCostPerUnit += area * 0.15;
      }
    });

    const plateCost = plateConfig.plateLength * plateConfig.plateCircumference * plateConfig.colorCount * plateConfig.pricePerSqcm;

    let quantityCoefficient = 1.0;
    const sortedDiscounts = [...config.quantityDiscounts].sort((a, b) => b.minQuantity - a.minQuantity);
    for (const discount of sortedDiscounts) {
      if (quantity >= discount.minQuantity) {
        quantityCoefficient = discount.coefficient;
        break;
      }
    }

    const wasteCoefficient = selectedBagType?.wasteCoefficient || 1.1;

    const baseCostPerUnit = materialCostPerUnit + printCostPerUnit + laminationCostPerUnit + postProcessingCostPerUnit;
    const costWithWaste = baseCostPerUnit * wasteCoefficient;
    const costWithQuantity = costWithWaste * quantityCoefficient;
    const profitMultiplier = 1 + profitRate / 100;
    const finalCostPerUnit = costWithQuantity * profitMultiplier;
    const totalCost = finalCostPerUnit * quantity;

    return {
      area,
      materialCostPerUnit,
      printCostPerUnit,
      laminationCostPerUnit,
      postProcessingCostPerUnit,
      plateCost,
      baseCostPerUnit,
      costWithWaste,
      costWithQuantity,
      finalCostPerUnit,
      totalCost,
      quantityCoefficient,
      wasteCoefficient,
    };
  }, [
    calculateArea,
    materialLayers,
    selectedPrintCoverage,
    laminationSteps,
    selectedPostProcessing,
    plateConfig,
    quantity,
    profitRate,
    config,
    dimensions,
    selectedBagType,
  ]);

  const handleEditParams = () => {
    navigate("/survey");
  };

  const handleRestart = () => {
    resetQuote();
    navigate("/");
  };

  const addMaterialLayer = () => {
    if (materialLayers.length >= 5) return;
    const material = config.materialLibrary[0];
    if (material) {
      setMaterialLayers([
        ...materialLayers,
        {
          materialId: material.id,
          thickness: material.thickness,
          density: material.density,
          price: material.price,
        },
      ]);
    }
  };

  const removeMaterialLayer = (index: number) => {
    if (materialLayers.length <= 1) return;
    setMaterialLayers(materialLayers.filter((_, i) => i !== index));
  };

  const updateMaterialLayer = (index: number, materialId: string) => {
    const material = getMaterialById(materialId);
    if (!material) return;
    setMaterialLayers(
      materialLayers.map((layer, i) =>
        i === index
          ? {
              materialId,
              thickness: material.thickness,
              density: material.density,
              price: material.price,
            }
          : layer
      )
    );
  };

  const addLaminationStep = () => {
    const firstRule = config.laminationPriceRules[0];
    if (!firstRule) return;
    setLaminationSteps([
      ...laminationSteps,
      { id: `step_${Date.now()}`, laminationId: firstRule.id },
    ]);
  };

  const removeLaminationStep = (index: number) => {
    setLaminationSteps(laminationSteps.filter((_, i) => i !== index));
  };

  const updateLaminationStep = (index: number, laminationId: string) => {
    setLaminationSteps(
      laminationSteps.map((step, i) =>
        i === index ? { ...step, laminationId } : step
      )
    );
  };

  if (!isGravure) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-foreground">报价器</h1>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">该印刷方式的报价器（待实现）</p>
        </main>
      </div>
    );
  }

  const dimensionLabels: Record<string, string> = {
    width: "袋宽",
    height: "袋高",
    bottomInsert: "底部插入",
    sideExpansion: "侧面展开",
    backSeal: "背封边",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">包装袋自动报价器</h1>
              <Badge variant="secondary">凹版印刷</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditParams} className="gap-2" data-testid="button-edit">
                <Edit className="w-4 h-4" />
                编辑参数
              </Button>
              <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2" data-testid="button-restart">
                <RefreshCw className="w-4 h-4" />
                重新开始
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">袋型</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Select value={selectedBagTypeId} onValueChange={setSelectedBagTypeId}>
                    <SelectTrigger data-testid="select-bagType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.customBagTypes.map((bagType) => (
                        <SelectItem key={bagType.id} value={bagType.id}>
                          {bagType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {requiredDimensions.map((dim) => (
                  <div key={dim}>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      {dimensionLabels[dim]} (mm)
                    </Label>
                    <Input
                      type="number"
                      value={dimensions[dim as keyof typeof dimensions]}
                      onChange={(e) =>
                        setDimensions({ ...dimensions, [dim]: Number(e.target.value) })
                      }
                      data-testid={`input-${dim}`}
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">数量 (个)</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    data-testid="input-quantity"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">材料层结构（{materialLayers.length}层）</CardTitle>
                <div className="flex items-center gap-2">
                  {config.materialLibrary.slice(0, 4).map((material) => (
                    <Button
                      key={material.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (materialLayers.length < 5) {
                          setMaterialLayers([
                            ...materialLayers,
                            {
                              materialId: material.id,
                              thickness: material.thickness,
                              density: material.density,
                              price: material.price,
                            },
                          ]);
                        }
                      }}
                      data-testid={`quick-add-${material.id}`}
                    >
                      + {material.name}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMaterialLayer} data-testid="add-custom-material">
                    + 自定义
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {materialLayers.map((layer, index) => {
                  const thicknessM = layer.thickness / 1000000;
                  const materialWeight = costs.area * thicknessM * layer.density * 1000;
                  const layerCost = materialWeight * layer.price / 1000;

                  return (
                    <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm text-muted-foreground mb-2 block">第{index + 1}层材料</Label>
                        <Select
                          value={layer.materialId}
                          onValueChange={(v) => updateMaterialLayer(index, v)}
                        >
                          <SelectTrigger data-testid={`select-material-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {config.materialLibrary.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-sm text-muted-foreground mb-2 block">厚度(μm)</Label>
                        <Input
                          type="number"
                          value={layer.thickness}
                          onChange={(e) => {
                            const updated = [...materialLayers];
                            updated[index].thickness = Number(e.target.value);
                            setMaterialLayers(updated);
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-sm text-muted-foreground mb-2 block">密度 g/cm³</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={layer.density}
                          onChange={(e) => {
                            const updated = [...materialLayers];
                            updated[index].density = Number(e.target.value);
                            setMaterialLayers(updated);
                          }}
                        />
                      </div>
                      <div className="w-24">
                        <Label className="text-sm text-muted-foreground mb-2 block">单价 元/kg</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={layer.price}
                          onChange={(e) => {
                            const updated = [...materialLayers];
                            updated[index].price = Number(e.target.value);
                            setMaterialLayers(updated);
                          }}
                        />
                      </div>
                      <div className="w-32 text-right">
                        <Label className="text-sm text-muted-foreground mb-2 block">材料成本/个</Label>
                        <div className="font-semibold text-primary">{layerCost.toFixed(4)} 元</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMaterialLayer(index)}
                        className="text-destructive"
                        disabled={materialLayers.length <= 1}
                        data-testid={`remove-layer-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">复合工艺（{laminationSteps.length}次复合）</CardTitle>
                <Button variant="outline" size="sm" onClick={addLaminationStep} className="gap-2" data-testid="add-lamination-step">
                  <Plus className="w-4 h-4" />
                  添加复合
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {laminationSteps.length === 0 ? (
                  <p className="text-muted-foreground text-sm">暂无复合工艺，点击"添加复合"添加</p>
                ) : (
                  laminationSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <Label className="w-16">第{index + 1}次：</Label>
                      <Select
                        value={step.laminationId}
                        onValueChange={(v) => updateLaminationStep(index, v)}
                      >
                        <SelectTrigger className="w-64" data-testid={`select-lamination-${index}`}>
                          <SelectValue placeholder="选择复合类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.laminationPriceRules.map((rule) => (
                            <SelectItem key={rule.id} value={rule.id}>
                              {rule.name} ({rule.pricePerSqm}¥/㎡)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLaminationStep(index)}
                        className="text-destructive"
                        data-testid={`remove-lamination-step-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">附加工艺（可多选）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config.postProcessingOptions
                  .filter((opt) => opt.enabled)
                  .map((option) => {
                    const widthM = dimensions.width / 1000;
                    let currentCost = 0;
                    
                    if (option.id === "zipper_normal") {
                      currentCost = selectedBagType?.id === "eightSide" ? 0.22 * widthM : 0.10 * widthM;
                    } else if (option.id === "zipper_easyTear") {
                      currentCost = selectedBagType?.id === "eightSide" ? 0.47 * widthM : 0.20 * widthM;
                    } else if (option.id === "zipper_eco") {
                      currentCost = 0.50 * widthM;
                    } else if (option.id === "laserTear") {
                      currentCost = 0.2 * widthM;
                    } else if (option.id === "hotStamp") {
                      currentCost = costs.area * 1.2 + 0.02;
                    } else if (option.id === "wire") {
                      const wireCost = (dimensions.width + 40) * 0.00013;
                      const laborCost = dimensions.width <= 140 ? 0.024 : 0.026;
                      currentCost = wireCost + laborCost;
                    } else if (option.id === "handle") {
                      currentCost = 0.15;
                    } else if (option.id === "airValve") {
                      currentCost = 0.11;
                    } else if (option.id === "emboss") {
                      currentCost = 0.2;
                    } else if (option.id === "windowCut") {
                      currentCost = 0.03;
                    } else if (option.id === "matteOil") {
                      currentCost = costs.area * 0.15;
                    }

                    return (
                      <Card
                        key={option.id}
                        className={`cursor-pointer transition-colors ${
                          selectedPostProcessing[option.id]
                            ? "border-primary bg-primary/5"
                            : "hover-elevate"
                        }`}
                        onClick={() =>
                          setSelectedPostProcessing({
                            ...selectedPostProcessing,
                            [option.id]: !selectedPostProcessing[option.id],
                          })
                        }
                        data-testid={`postprocess-card-${option.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedPostProcessing[option.id] || false}
                              onCheckedChange={() =>
                                setSelectedPostProcessing({
                                  ...selectedPostProcessing,
                                  [option.id]: !selectedPostProcessing[option.id],
                                })
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{option.name}</div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {option.priceFormula}
                              </div>
                              <div className="text-sm text-primary mt-2">
                                当前成本: {currentCost.toFixed(4)} 元/个
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
              {Object.entries(selectedPostProcessing).filter(([, v]) => v).length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    已选工艺：
                    {Object.entries(selectedPostProcessing)
                      .filter(([, v]) => v)
                      .map(([id]) => config.postProcessingOptions.find((o) => o.id === id)?.name)
                      .join("、")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">印刷（按覆盖率选择）</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={String(selectedPrintCoverage)}
                  onValueChange={(v) => setSelectedPrintCoverage(Number(v))}
                >
                  <SelectTrigger data-testid="select-printCoverage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.printingPriceRules.map((rule) => (
                      <SelectItem key={rule.coverage} value={String(rule.coverage)}>
                        {rule.label} — {rule.pricePerSqm} 元/㎡
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">版费（与袋子单价分开结算）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">版长 (cm)</Label>
                    <Input
                      type="number"
                      value={plateConfig.plateLength}
                      onChange={(e) =>
                        setPlateConfig({ ...plateConfig, plateLength: Number(e.target.value) })
                      }
                      data-testid="input-plateLength"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">版周 (cm)</Label>
                    <Input
                      type="number"
                      value={plateConfig.plateCircumference}
                      onChange={(e) =>
                        setPlateConfig({ ...plateConfig, plateCircumference: Number(e.target.value) })
                      }
                      data-testid="input-plateCircumference"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">色数 (支)</Label>
                    <Input
                      type="number"
                      value={plateConfig.colorCount}
                      onChange={(e) =>
                        setPlateConfig({ ...plateConfig, colorCount: Number(e.target.value) })
                      }
                      data-testid="input-colorCount"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">单价 (元/cm²)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plateConfig.pricePerSqcm}
                      onChange={(e) =>
                        setPlateConfig({ ...plateConfig, pricePerSqcm: Number(e.target.value) })
                      }
                      data-testid="input-platePricePerSqcm"
                    />
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-muted-foreground">版费合计：</span>
                  <span className="font-semibold text-lg ml-2">{costs.plateCost.toFixed(2)} 元</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">利润率 & 汇率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-6">
                <div className="w-40">
                  <Label className="text-sm text-muted-foreground mb-2 block">利润率 (%)</Label>
                  <Input
                    type="number"
                    value={profitRate}
                    onChange={(e) => setProfitRate(Number(e.target.value))}
                    data-testid="input-profitRate"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-sm text-muted-foreground mb-2 block">汇率（美元→人民币）</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    data-testid="input-exchangeRate"
                  />
                </div>
                <div className="flex-1 text-right text-sm text-muted-foreground">
                  <div>当前利润系数：{(1 + profitRate / 100).toFixed(2)}</div>
                  <div>当前汇率：{exchangeRate.toFixed(2)} 元 / 美元</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                报价 = 成本价 × 损耗率 × 利润率（示例：10% 损耗→×1.10，10% 利润→×1.10）
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary bg-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">报价结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">展开面积</div>
                  <div className="text-xl font-semibold">{(costs.area * 10000).toFixed(2)} cm²</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">材料成本/个</div>
                  <div className="text-xl font-semibold">{costs.materialCostPerUnit.toFixed(4)} 元</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">印刷成本/个</div>
                  <div className="text-xl font-semibold">{costs.printCostPerUnit.toFixed(4)} 元</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">复合成本/个</div>
                  <div className="text-xl font-semibold">{costs.laminationCostPerUnit.toFixed(4)} 元</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">后处理成本/个</div>
                  <div className="text-xl font-semibold">{costs.postProcessingCostPerUnit.toFixed(4)} 元</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">损耗系数</div>
                  <div className="text-xl font-semibold">×{costs.wasteCoefficient.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">数量系数</div>
                  <div className="text-xl font-semibold">×{costs.quantityCoefficient.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <div className="text-sm text-muted-foreground">利润系数</div>
                  <div className="text-xl font-semibold">×{(1 + profitRate / 100).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-primary text-primary-foreground rounded-lg">
                <div>
                  <div className="text-sm opacity-80">单价</div>
                  <div className="text-3xl font-bold">¥{costs.finalCostPerUnit.toFixed(4)}/个</div>
                  <div className="text-sm opacity-80 mt-1">
                    ${(costs.finalCostPerUnit / exchangeRate).toFixed(4)}/个
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-80">总价（{quantity.toLocaleString()} 个）</div>
                  <div className="text-3xl font-bold">¥{costs.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-sm opacity-80 mt-1">
                    ${(costs.totalCost / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Button size="lg" className="gap-2 px-8" data-testid="button-generate">
                  生成报价
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
