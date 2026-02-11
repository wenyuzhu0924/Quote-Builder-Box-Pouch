import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, RefreshCw, Plus, Trash2, Check, X, CheckCircle2, Sparkles, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuote, type CustomMaterial, type CustomBagType, type DigitalMaterial, type PostProcessingOptionConfig, isValidBagFormula, isValidMakingFormula, safeEvalMakingFormula } from "@/lib/quote-store";
import { calculateDigital, type DigitalCalcResult } from "@/lib/digital-calc";

function calcPostProcessingCost(
  opt: PostProcessingOptionConfig,
  widthM: number,
  area: number,
  bagTypeId?: string,
  selectedSpec?: string,
): number {
  switch (opt.pricingType) {
    case "fixed":
      return toNum(String(opt.fixedPrice ?? 0));
    case "perMeterWidth":
      return toNum(String(opt.pricePerMeter ?? 0)) * widthM;
    case "perArea":
      return area * toNum(String(opt.pricePerSqm ?? 0)) + toNum(String(opt.fixedAddition ?? 0));
    case "perMeterWidthByBagType": {
      const match = (opt.bagTypePrices || []).find(b => b.bagTypeId === bagTypeId);
      const pm = match ? toNum(String(match.pricePerMeter)) : toNum(String(opt.defaultPricePerMeter ?? 0));
      return pm * widthM;
    }
    case "free":
      return 0;
    case "specSelection": {
      if (!selectedSpec) return 0;
      const spec = (opt.specOptions || []).find(s => s.specName === selectedSpec);
      return spec ? toNum(String(spec.price)) : 0;
    }
    default:
      return 0;
  }
}

function numStr(v: number | string): string {
  if (v === "" || v === undefined || v === null) return "";
  return String(v);
}
function toNum(v: string): number {
  if (v === "" || v === undefined || v === null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}


interface SpliceConfig {
  enabled: boolean;
  windowWidthMm: number;
  windowThicknessUm: number;
  windowDensity: number;
  windowPrice: number;
  windowMaterialId: string;
}

interface MaterialLayer {
  materialId: string;
  thickness: number;
  density: number;
  price: number;
  splice?: SpliceConfig;
}

interface LaminationStep {
  id: string;
  laminationId: string;
}

interface SelectedPostProcessing {
  [key: string]: boolean;
}

interface DigitalMaterialLayer {
  id: string;
  layerType: "print" | "composite" | "seal";
  materialId: string;
  thickness: number;
  density: number;
  priceKg: number;
  squarePrice: number;
  notes: string;
}

interface QuotePageProps {
  surveyPath?: string;
  homePath?: string;
  hideRestart?: boolean;
}

export default function QuotePage({ surveyPath = "/survey", homePath = "/", hideRestart = false }: QuotePageProps) {
  const [, navigate] = useLocation();
  const { state, resetQuote } = useQuote();
  const config = state.config;
  const digitalConfig = state.digitalConfig;

  const isDigital = state.productType === "pouch" && state.printingMethod === "digital";
  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";

  const [selectedBagTypeId, setSelectedBagTypeId] = useState<string>(
    isDigital 
      ? (digitalConfig.customBagTypes[0]?.id || "")
      : (config.customBagTypes[0]?.id || "")
  );
  const [dimensions, setDimensions] = useState({
    width: 190,
    height: 300,
    bottomInsert: 40,
    sideExpansion: 30,
    backSeal: 10,
    sideGusset: 50,
    sealEdge: 10,
    areaCoefficient: 1.0,
    quantityUnit: 1,
  });
  const [quantity, setQuantity] = useState<number | string>(30000);
  const [skuCount, setSkuCount] = useState<number | string>(1);
  const [taxRate, setTaxRate] = useState<number | string>(13);
  const [exchangeRate, setExchangeRate] = useState<number | string>(7.2);

  const [digitalLayers, setDigitalLayers] = useState<DigitalMaterialLayer[]>([]);

  const [selectedPrintModeId, setSelectedPrintModeId] = useState<string>(
    digitalConfig.printModes.find(m => m.enabled)?.id || "none"
  );

  const [selectedSpecialProcesses, setSelectedSpecialProcesses] = useState<Record<string, boolean>>({});

  const [selectedZipperId, setSelectedZipperId] = useState<string>("none");
  const [selectedValveId, setSelectedValveId] = useState<string>("none");
  const [selectedSpoutId, setSelectedSpoutId] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, boolean>>({});

  const [moldCost, setMoldCost] = useState<number | string>(0);
  const [specialProcessPlateCost, setSpecialProcessPlateCost] = useState<number | string>(0);

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

  const [laminationSteps, setLaminationSteps] = useState<LaminationStep[]>([]);

  useEffect(() => {
    const targetCount = Math.max(0, materialLayers.length - 1);
    setLaminationSteps(prev => {
      if (prev.length === targetCount) return prev;
      const firstRule = config.laminationPriceRules[0];
      if (!firstRule) return [];
      if (prev.length < targetCount) {
        const extra = Array.from({ length: targetCount - prev.length }, (_, i) => ({
          id: `step_${Date.now()}_${prev.length + i}`,
          laminationId: firstRule.id,
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, targetCount);
    });
  }, [materialLayers.length, config.laminationPriceRules]);

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

  const [profitRate, setProfitRate] = useState<number | string>(10);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});

  const [eightSideMode, setEightSideMode] = useState<"same" | "diff">("same");
  const [sideMaterialLayers, setSideMaterialLayers] = useState<MaterialLayer[]>(() => {
    const firstMaterial = config.materialLibrary[0];
    if (firstMaterial) {
      return [{
        materialId: firstMaterial.id,
        thickness: firstMaterial.thickness,
        density: firstMaterial.density,
        price: firstMaterial.price,
      }];
    }
    return [];
  });
  const [sideLaminationSteps, setSideLaminationSteps] = useState<LaminationStep[]>([]);
  const [sidePrintCoverage, setSidePrintCoverage] = useState(
    config.printingPriceRules[0]?.coverage || 0
  );

  useEffect(() => {
    const targetCount = Math.max(0, sideMaterialLayers.length - 1);
    setSideLaminationSteps(prev => {
      if (prev.length === targetCount) return prev;
      const firstRule = config.laminationPriceRules[0];
      if (!firstRule) return [];
      if (prev.length < targetCount) {
        const extra = Array.from({ length: targetCount - prev.length }, (_, i) => ({
          id: `side_step_${Date.now()}_${prev.length + i}`,
          laminationId: firstRule.id,
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, targetCount);
    });
  }, [sideMaterialLayers.length, config.laminationPriceRules]);

  const addSideMaterialLayer = () => {
    if (sideMaterialLayers.length >= 5) return;
    const material = config.materialLibrary[0];
    if (material) {
      setSideMaterialLayers([
        ...sideMaterialLayers,
        {
          materialId: material.id,
          thickness: material.thickness,
          density: material.density,
          price: material.price,
        },
      ]);
    }
  };

  const removeSideMaterialLayer = (index: number) => {
    if (sideMaterialLayers.length <= 1) return;
    setSideMaterialLayers(sideMaterialLayers.filter((_, i) => i !== index));
  };

  const updateSideMaterialLayer = (index: number, materialId: string) => {
    const material = getMaterialById(materialId);
    if (!material) return;
    setSideMaterialLayers(
      sideMaterialLayers.map((layer, i) =>
        i === index
          ? { ...layer, materialId, thickness: material.thickness, density: material.density, price: material.price }
          : layer
      )
    );
  };

  if (!state.productType) {
    navigate(homePath);
    return null;
  }

  const currentBagTypes = isDigital ? digitalConfig.customBagTypes : config.customBagTypes;
  const selectedBagType = currentBagTypes.find((b) => b.id === selectedBagTypeId);
  const requiredDimensions = selectedBagType?.requiredDimensions || [];
  const isEightSide = selectedBagType?.id === "eightSide";
  const isEightSideDiff = isEightSide && eightSideMode === "diff";

  const dimensionLabels: Record<string, string> = {
    width: "袋宽",
    height: "袋高",
    bottomInsert: "底琴",
    sideExpansion: "侧面展开",
    backSeal: "背封边",
    sideGusset: "侧琴",
    sealEdge: "封边",
    areaCoefficient: "面积系数",
    quantityUnit: "数量单位",
  };

  const validLayerCount = digitalLayers.filter(l => l.materialId !== "").length;
  const hasValidStructure = validLayerCount >= 2;

  const totalSquarePrice = useMemo(() => {
    return digitalLayers.reduce((sum, layer) => sum + (layer.squarePrice || 0), 0);
  }, [digitalLayers]);

  const addDigitalLayer = (layerType: "print" | "composite" | "seal") => {
    const newLayer: DigitalMaterialLayer = {
      id: `layer_${Date.now()}`,
      layerType,
      materialId: "",
      thickness: 0,
      density: 0,
      priceKg: 0,
      squarePrice: 0,
      notes: "",
    };
    setDigitalLayers([...digitalLayers, newLayer]);
  };

  const removeDigitalLayer = (id: string) => {
    setDigitalLayers(digitalLayers.filter(l => l.id !== id));
  };

  const updateDigitalLayer = (id: string, materialId: string) => {
    const layer = digitalLayers.find(l => l.id === id);
    if (!layer) return;

    let materials: DigitalMaterial[] = [];
    if (layer.layerType === "print") materials = digitalConfig.printLayerMaterials;
    else if (layer.layerType === "composite") materials = digitalConfig.compositeLayerMaterials;
    else if (layer.layerType === "seal") materials = digitalConfig.sealLayerMaterials;

    const material = materials.find(m => m.id === materialId);
    if (!material) return;

    setDigitalLayers(digitalLayers.map(l => 
      l.id === id ? {
        ...l,
        materialId,
        thickness: material.thickness,
        density: material.density,
        priceKg: material.price,
        squarePrice: material.squarePrice,
        notes: material.notes,
      } : l
    ));
  };

  const getMaterialsForLayerType = (layerType: "print" | "composite" | "seal") => {
    if (layerType === "print") return digitalConfig.printLayerMaterials;
    if (layerType === "composite") return digitalConfig.compositeLayerMaterials;
    return digitalConfig.sealLayerMaterials;
  };

  const getLayerTypeName = (layerType: "print" | "composite" | "seal") => {
    if (layerType === "print") return "印刷层";
    if (layerType === "composite") return "复合层";
    return "热封层";
  };

  const spoutAccessories = digitalConfig.accessories.filter(a => 
    a.name.includes("吸嘴") || a.name.includes("嘴")
  );
  const stackableAccessories = digitalConfig.accessories.filter(a => 
    a.isStackable && !a.name.includes("吸嘴") && !a.name.includes("嘴")
  );

  const digitalCalcResult: DigitalCalcResult = useMemo(() => {
    const _qty = toNum(String(quantity));
    const _sku = toNum(String(skuCount));
    const _tax = toNum(String(taxRate));
    const _exr = toNum(String(exchangeRate));
    const _mold = toNum(String(moldCost));
    const _spp = toNum(String(specialProcessPlateCost));

    return calculateDigital({
      bagTypeId: selectedBagTypeId,
      dimensions: {
        width: toNum(String(dimensions.width)),
        height: toNum(String(dimensions.height)),
        bottomInsert: toNum(String(dimensions.bottomInsert)),
        sideExpansion: toNum(String(dimensions.sideExpansion)),
        backSeal: toNum(String(dimensions.backSeal)),
        sideGusset: toNum(String(dimensions.sideGusset)),
        sealEdge: toNum(String(dimensions.sealEdge)),
        areaCoefficient: toNum(String(dimensions.areaCoefficient)),
      },
      quantity: _qty,
      skuCount: _sku,
      taxRate: _tax,
      exchangeRate: _exr,
      printModeId: selectedPrintModeId,
      selectedSpecialProcessIds: Object.entries(selectedSpecialProcesses).filter(([, v]) => v).map(([id]) => id),
      zipperId: selectedZipperId,
      valveId: selectedValveId,
      spoutId: selectedSpoutId,
      selectedAccessoryIds: Object.entries(selectedAccessories).filter(([, v]) => v).map(([id]) => id),
      moldCost: _mold,
      plateCost: _spp,
      materialLayers: digitalLayers.map(l => ({
        id: l.id,
        layerType: l.layerType,
        materialId: l.materialId,
        squarePrice: l.squarePrice,
        name: l.materialId ? (getMaterialsForLayerType(l.layerType).find(m => m.id === l.materialId)?.name || "") : "",
      })),
    }, digitalConfig);
  }, [dimensions, selectedBagTypeId, quantity, skuCount, digitalConfig, digitalLayers, selectedPrintModeId, selectedSpecialProcesses, selectedZipperId, selectedValveId, selectedSpoutId, selectedAccessories, moldCost, specialProcessPlateCost, taxRate, exchangeRate]);

  const getMaterialById = (id: string): CustomMaterial | undefined => {
    return config.materialLibrary.find((m) => m.id === id);
  };

  const parseMakingCostFormula = (formula: string, dims: { width: number; height: number; bottomInsert: number; sideExpansion: number; backSeal: number }): number => {
    if (!isValidMakingFormula(formula)) return 0;
    return safeEvalMakingFormula(formula, dims);
  };

  const getUnfoldedDimensions = (dims: typeof dimensions, bagType: typeof selectedBagType) => {
    const w = toNum(String(dims.width));
    const h = toNum(String(dims.height));
    const bi = toNum(String(dims.bottomInsert));
    const se = toNum(String(dims.sideExpansion));
    const bs = toNum(String(dims.backSeal));
    let unfoldedWidthMm = w * 2;
    let unfoldedHeightMm = h;
    if (bagType) {
      switch (bagType.id) {
        case "standup":
          unfoldedWidthMm = w; unfoldedHeightMm = (h + bi) * 2; break;
        case "threeSide":
          unfoldedWidthMm = w; unfoldedHeightMm = h * 2; break;
        case "centerSeal":
          unfoldedWidthMm = (w + bs) * 2; unfoldedHeightMm = h; break;
        case "gusset":
          unfoldedWidthMm = (w + se + bs) * 2; unfoldedHeightMm = h; break;
        case "eightSide":
          unfoldedWidthMm = w + 6; unfoldedHeightMm = h + h + se + 30; break;
        case "taperBottom":
          unfoldedWidthMm = (w + se) * 2 + 20; unfoldedHeightMm = h + 10; break;
        case "flatBottom":
          unfoldedWidthMm = (w + se) * 2 + 30; unfoldedHeightMm = h + se / 2 + 15; break;
        case "threeSideShape":
          unfoldedWidthMm = w * 2 + 10; unfoldedHeightMm = h + 5; break;
        case "taperShape":
          unfoldedWidthMm = (h + bi) * 2 + 30; unfoldedHeightMm = w + 5; break;
      }
    }
    return { unfoldedWidthMm, unfoldedHeightMm };
  };

  const gravureCosts = useMemo(() => {
    const _qty = toNum(String(quantity));
    const _profit = toNum(String(profitRate));
    const w = toNum(String(dimensions.width)) / 1000;
    const h = toNum(String(dimensions.height)) / 1000;
    const bi = toNum(String(dimensions.bottomInsert)) / 1000;
    const se = toNum(String(dimensions.sideExpansion)) / 1000;
    const bs = toNum(String(dimensions.backSeal)) / 1000;

    let area = w * h * 2;
    if (selectedBagType) {
      switch (selectedBagType.id) {
        case "standup":
          area = w * (h + bi) * 2;
          break;
        case "threeSide":
          area = w * h * 2;
          break;
        case "centerSeal":
          area = (w + bs) * 2 * h;
          break;
        case "gusset":
          area = (w + se + bs) * 2 * h;
          break;
        case "eightSide": {
          const eightFBB = (h + h + se + 0.03) * (w + 0.006);
          const eightTS = (se + 0.006) * 2 * (h + 0.01);
          area = eightFBB + eightTS;
          break;
        }
        case "taperBottom":
          area = ((w + se) * 2 + 0.02) * (h + 0.01);
          break;
        case "flatBottom":
          area = ((w + se) * 2 + 0.03) * (h + se / 2 + 0.015);
          break;
        case "threeSideShape":
          area = (w * 2 + 0.01) * (h + 0.005);
          break;
        case "taperShape":
          area = ((h + bi) * 2 + 0.03) * (w + 0.005);
          break;
      }
    }

    const { unfoldedWidthMm } = getUnfoldedDimensions(dimensions, selectedBagType);

    let frontBackBottomArea = area;
    let twoSideArea = 0;
    if (selectedBagType?.id === "eightSide") {
      frontBackBottomArea = (h + h + se + 0.03) * (w + 0.006);
      twoSideArea = (se + 0.006) * 2 * (h + 0.01);
    }

    const calcLayerCost = (a: number, thick: number, dens: number, prc: number) => {
      if (dens === 0 || dens === undefined) {
        return a * (thick / 1000) * prc;
      }
      return a * thick * dens * prc / 1000;
    };

    let materialCostPerUnit = 0;
    const _isEightSideDiff = selectedBagType?.id === "eightSide" && eightSideMode === "diff";

    const mainArea = _isEightSideDiff ? frontBackBottomArea : area;
    materialLayers.forEach((layer) => {
      if (layer.splice?.enabled && unfoldedWidthMm > 0) {
        const windowMm = Math.max(0, Math.min(layer.splice.windowWidthMm, unfoldedWidthMm));
        const mainMm = unfoldedWidthMm - windowMm;
        const mainRatio = mainMm / unfoldedWidthMm;
        const windowRatio = windowMm / unfoldedWidthMm;
        materialCostPerUnit += calcLayerCost(mainArea * mainRatio, layer.thickness, layer.density, layer.price);
        materialCostPerUnit += calcLayerCost(mainArea * windowRatio, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice);
      } else {
        materialCostPerUnit += calcLayerCost(mainArea, layer.thickness, layer.density, layer.price);
      }
    });

    let sideMaterialCostPerUnit = 0;
    if (_isEightSideDiff) {
      sideMaterialLayers.forEach((layer) => {
        sideMaterialCostPerUnit += calcLayerCost(twoSideArea, layer.thickness, layer.density, layer.price);
      });
      materialCostPerUnit += sideMaterialCostPerUnit;
    }

    const printRule = config.printingPriceRules.find((r) => r.coverage === selectedPrintCoverage);
    let printCostPerUnit = 0;
    if (_isEightSideDiff) {
      printCostPerUnit = printRule ? frontBackBottomArea * printRule.pricePerSqm : 0;
      const sidePrintRule = config.printingPriceRules.find((r) => r.coverage === sidePrintCoverage);
      printCostPerUnit += sidePrintRule ? twoSideArea * sidePrintRule.pricePerSqm : 0;
    } else {
      printCostPerUnit = printRule ? area * printRule.pricePerSqm : 0;
    }

    let laminationCostPerUnit = 0;
    if (_isEightSideDiff) {
      laminationSteps.forEach((step) => {
        const rule = config.laminationPriceRules.find((r) => r.id === step.laminationId);
        if (rule) laminationCostPerUnit += frontBackBottomArea * rule.pricePerSqm;
      });
      sideLaminationSteps.forEach((step) => {
        const rule = config.laminationPriceRules.find((r) => r.id === step.laminationId);
        if (rule) laminationCostPerUnit += twoSideArea * rule.pricePerSqm;
      });
    } else {
      laminationSteps.forEach((step) => {
        const rule = config.laminationPriceRules.find((r) => r.id === step.laminationId);
        if (rule) laminationCostPerUnit += area * rule.pricePerSqm;
      });
    }

    let makingCostPerUnit = 0;
    if (selectedBagType?.makingCostFormula) {
      makingCostPerUnit = parseMakingCostFormula(selectedBagType.makingCostFormula, {
        width: w, height: h, bottomInsert: bi, sideExpansion: se, backSeal: bs
      });
    }

    let postProcessingCostPerUnit = 0;
    const widthM = toNum(String(dimensions.width)) / 1000;
    Object.entries(selectedPostProcessing).forEach(([id, isSelected]) => {
      if (!isSelected) return;
      const opt = config.postProcessingOptions.find(o => o.id === id);
      if (!opt) return;
      postProcessingCostPerUnit += calcPostProcessingCost(opt, widthM, area, selectedBagType?.id, selectedSpecs[id]);
    });

    const plateCost = plateConfig.plateLength * plateConfig.plateCircumference * plateConfig.colorCount * plateConfig.pricePerSqcm;
    const setupFee = _qty < 10000 ? Math.min(200 * plateConfig.colorCount, 1800) : 0;

    let quantityCoefficient = 1.0;
    const sortedDiscounts = [...config.quantityDiscounts].sort((a, b) => b.minQuantity - a.minQuantity);
    for (const discount of sortedDiscounts) {
      if (_qty >= discount.minQuantity) {
        quantityCoefficient = discount.coefficient;
        break;
      }
    }

    const wasteCoefficient = selectedBagType?.wasteCoefficient || 1.1;

    const baseCostPerUnit = materialCostPerUnit + printCostPerUnit + laminationCostPerUnit + makingCostPerUnit + postProcessingCostPerUnit;
    const costWithWaste = baseCostPerUnit * wasteCoefficient;
    const costWithQuantity = costWithWaste * quantityCoefficient;
    const profitMultiplier = 1 + _profit / 100;

    const exFactoryUnit = costWithQuantity * profitMultiplier;
    const exFactoryTotal = exFactoryUnit * _qty;

    const withFreightUnit = exFactoryUnit * 1.03;
    const withFreightTotal = withFreightUnit * _qty;

    const withFreightTaxUnit = withFreightUnit * 1.09;
    const withFreightTaxTotal = withFreightTaxUnit * _qty;

    const withPlateFreightTaxUnit = withFreightTaxUnit + (plateCost + setupFee) / (_qty || 1);
    const withPlateFreightTaxTotal = withFreightTaxTotal + plateCost + setupFee;

    return {
      area,
      frontBackBottomArea,
      twoSideArea,
      unfoldedWidthMm,
      materialCostPerUnit,
      sideMaterialCostPerUnit,
      printCostPerUnit,
      laminationCostPerUnit,
      makingCostPerUnit,
      postProcessingCostPerUnit,
      plateCost,
      setupFee,
      baseCostPerUnit,
      costWithWaste,
      costWithQuantity,
      profitMultiplier,
      quantityCoefficient,
      wasteCoefficient,
      exFactoryUnit,
      exFactoryTotal,
      withFreightUnit,
      withFreightTotal,
      withFreightTaxUnit,
      withFreightTaxTotal,
      withPlateFreightTaxUnit,
      withPlateFreightTaxTotal,
      isEightSideDiff: _isEightSideDiff,
    };
  }, [
    dimensions,
    materialLayers,
    sideMaterialLayers,
    selectedPrintCoverage,
    sidePrintCoverage,
    laminationSteps,
    sideLaminationSteps,
    selectedPostProcessing,
    plateConfig,
    quantity,
    profitRate,
    config,
    selectedBagType,
    selectedSpecs,
    exchangeRate,
    eightSideMode,
  ]);

  const handleEditParams = () => {
    navigate(surveyPath);
  };

  const handleRestart = () => {
    resetQuote();
    navigate(homePath);
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
              ...layer,
              materialId,
              thickness: material.thickness,
              density: material.density,
              price: material.price,
            }
          : layer
      )
    );
  };

  const updateLaminationStep = (index: number, laminationId: string) => {
    setLaminationSteps(
      laminationSteps.map((step, i) =>
        i === index ? { ...step, laminationId } : step
      )
    );
  };

  if (isDigital) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground tracking-tight">包装袋自动报价器</h1>
                <Badge variant="secondary">数码印刷</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleEditParams} className="gap-2" data-testid="button-edit">
                  <Edit className="w-4 h-4" />
                  编辑参数
                </Button>
                {!hideRestart && (
                  <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2" data-testid="button-restart">
                    <RefreshCw className="w-4 h-4" />
                    重新开始
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">袋型与尺寸</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">袋型</Label>
                    <Select value={selectedBagTypeId} onValueChange={setSelectedBagTypeId}>
                      <SelectTrigger data-testid="select-bagType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {digitalConfig.customBagTypes.map((bagType) => (
                          <SelectItem key={bagType.id} value={bagType.id}>
                            {bagType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {requiredDimensions.filter(d => d !== "quantityUnit" && d !== "areaCoefficient").map((dim) => (
                    <div key={dim}>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        {dimensionLabels[dim]} (mm)
                      </Label>
                      <Input
                        type="number"
                        value={numStr(dimensions[dim as keyof typeof dimensions])}
                        onChange={(e) =>
                          setDimensions({ ...dimensions, [dim]: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                        data-testid={`input-${dim}`}
                      />
                    </div>
                  ))}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">数量（个）</Label>
                    <Input
                      type="number"
                      value={numStr(quantity)}
                      onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-quantity"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">订单信息配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">款数 (SKU)</Label>
                    <Input
                      type="number"
                      value={numStr(skuCount)}
                      onChange={(e) => setSkuCount(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-skuCount"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">税率 (%)</Label>
                    <Input
                      type="number"
                      value={numStr(taxRate)}
                      onChange={(e) => setTaxRate(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-taxRate"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">汇率 (CNY/USD)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={numStr(exchangeRate)}
                      onChange={(e) => setExchangeRate(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-exchangeRate"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">材料层结构</CardTitle>
              </CardHeader>
              <CardContent>
                {!hasValidStructure && (
                  <div className="flex items-center gap-2 text-destructive mb-4">
                    <X className="w-4 h-4" />
                    <span>层数不足 | 普通袋要求≥2层 | 当前有效层数: {validLayerCount} / 总层数: {digitalLayers.length}</span>
                  </div>
                )}
                {hasValidStructure && (
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <Check className="w-4 h-4" />
                    <span>材料结构有效 | 当前有效层数: {validLayerCount} / 总层数: {digitalLayers.length}</span>
                  </div>
                )}
                
                <div className="flex gap-2 mb-4">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => addDigitalLayer("print")}
                    data-testid="add-print-layer"
                  >
                    + 印刷层
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => addDigitalLayer("composite")}
                    className="bg-[hsl(20,89%,60%)] border-[hsl(20,89%,52%)]"
                    data-testid="add-composite-layer"
                  >
                    + 复合层
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => addDigitalLayer("seal")}
                    className="bg-[hsl(20,89%,70%)] border-[hsl(20,89%,62%)]"
                    data-testid="add-seal-layer"
                  >
                    + 热封层
                  </Button>
                </div>

                <div className="space-y-3">
                  {digitalLayers.map((layer) => (
                    <div key={layer.id} className="grid grid-cols-8 gap-2 items-end p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">层级类型</Label>
                        <div className="font-medium text-sm">{getLayerTypeName(layer.layerType)}</div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">材料选择</Label>
                        <Select value={layer.materialId} onValueChange={(v) => updateDigitalLayer(layer.id, v)}>
                          <SelectTrigger data-testid={`select-layer-${layer.id}`}>
                            <SelectValue placeholder="无" />
                          </SelectTrigger>
                          <SelectContent>
                            {getMaterialsForLayerType(layer.layerType).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">厚度 (mm)</Label>
                        <Input type="number" value={layer.thickness || ""} readOnly className="bg-muted" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">密度 (g/cm³)</Label>
                        <Input type="number" value={layer.density || ""} readOnly className="bg-muted" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">单价 (元/kg)</Label>
                        <Input type="number" value={layer.priceKg || ""} readOnly className="bg-muted" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">平方价 (元/㎡)</Label>
                        <div className="h-9 flex items-center text-sm">{layer.squarePrice ? layer.squarePrice.toFixed(2) : "自动计算"}</div>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground mb-1 block">备注</Label>
                          <div className="text-xs text-muted-foreground truncate">{layer.notes || "无特殊说明"}</div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeDigitalLayer(layer.id)}
                          data-testid={`remove-layer-${layer.id}`}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 text-primary">
                  <Check className="w-4 h-4" />
                  <span>材料结构平方价合计：{totalSquarePrice.toFixed(4)} 元/㎡</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">印刷工艺</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">印刷模式</Label>
                  <Select value={selectedPrintModeId} onValueChange={setSelectedPrintModeId}>
                    <SelectTrigger data-testid="select-printMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {digitalConfig.printModes.filter(m => m.enabled).map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>
                          {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">特殊工艺（可多选）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {digitalConfig.specialProcesses.filter(p => p.enabled).map((process) => (
                    <div
                      key={process.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSpecialProcesses[process.id] ? "border-primary bg-primary/5" : "hover-elevate"
                      }`}
                      onClick={() => setSelectedSpecialProcesses({
                        ...selectedSpecialProcesses,
                        [process.id]: !selectedSpecialProcesses[process.id]
                      })}
                      data-testid={`special-process-${process.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          checked={selectedSpecialProcesses[process.id] || false}
                          onCheckedChange={() => setSelectedSpecialProcesses({
                            ...selectedSpecialProcesses,
                            [process.id]: !selectedSpecialProcesses[process.id]
                          })}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{process.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {process.minPrice > 0 && `起步价${process.minPrice}元，`}
                            {process.calcBasis === "perQuantity" && `${process.unitPrice}元/个`}
                            {process.calcBasis === "perMeter" && `${process.unitPrice}元/米`}
                            {process.calcBasis === "printMultiplier" && `${process.unitPrice}×印刷费`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  已选工艺：{Object.entries(selectedSpecialProcesses).filter(([,v]) => v).length > 0 
                    ? Object.entries(selectedSpecialProcesses)
                        .filter(([,v]) => v)
                        .map(([id]) => digitalConfig.specialProcesses.find(p => p.id === id)?.name)
                        .join("、")
                    : "无"
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">附件配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">拉链类型</Label>
                    <Select value={selectedZipperId} onValueChange={setSelectedZipperId}>
                      <SelectTrigger data-testid="select-zipper">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {digitalConfig.zipperTypes.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.id === "none" ? z.name : `${z.name} (${z.pricePerMeter}元/米)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">气阀类型</Label>
                    <Select value={selectedValveId} onValueChange={setSelectedValveId}>
                      <SelectTrigger data-testid="select-valve">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {digitalConfig.valveTypes.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.id === "none" ? v.name : `${v.name} (${v.pricePerUnit}元/个)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {spoutAccessories.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">其他附件（单选）</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {spoutAccessories.map((acc) => (
                        <div
                          key={acc.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSpoutId === acc.id ? "border-primary bg-primary/5" : "hover-elevate"
                          }`}
                          onClick={() => setSelectedSpoutId(selectedSpoutId === acc.id ? null : acc.id)}
                          data-testid={`spout-${acc.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              checked={selectedSpoutId === acc.id}
                              onCheckedChange={() => setSelectedSpoutId(selectedSpoutId === acc.id ? null : acc.id)}
                            />
                            <div>
                              <div className="font-medium text-sm">{acc.name}</div>
                              <div className="text-xs text-muted-foreground">单价: {acc.price} 元/个</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stackableAccessories.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">额外功能选项（可多选）</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {stackableAccessories.map((acc) => (
                        <div
                          key={acc.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAccessories[acc.id] ? "border-primary bg-primary/5" : "hover-elevate"
                          }`}
                          onClick={() => setSelectedAccessories({
                            ...selectedAccessories,
                            [acc.id]: !selectedAccessories[acc.id]
                          })}
                          data-testid={`accessory-${acc.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              checked={selectedAccessories[acc.id] || false}
                              onCheckedChange={() => setSelectedAccessories({
                                ...selectedAccessories,
                                [acc.id]: !selectedAccessories[acc.id]
                              })}
                            />
                            <div>
                              <div className="font-medium text-sm">{acc.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {acc.price > 0 ? `${acc.price}元/个` : "按袋宽阶梯计价"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">自定义成本设置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">模具费</Label>
                    <Input
                      type="number"
                      value={numStr(moldCost)}
                      onChange={(e) => setMoldCost(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-moldCost"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">特殊工艺版费</Label>
                    <Input
                      type="number"
                      value={numStr(specialProcessPlateCost)}
                      onChange={(e) => setSpecialProcessPlateCost(e.target.value === "" ? "" : Number(e.target.value))}
                      data-testid="input-specialProcessPlateCost"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {(() => {
              const bd = digitalCalcResult.breakdownDetails;
              const cb = digitalCalcResult.costBreakdown;
              const q = digitalCalcResult.quote;
              const pd = digitalCalcResult.processData;
              const f = (v: number) => v.toFixed(2);
              const f4 = (v: number) => v.toFixed(4);
              const qtyNum = toNum(String(quantity));

              return (
                <div className="space-y-0" data-testid="calculation-breakdown">
                  <div className="summary-panel mb-8">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap tracking-tight">
                      <CheckCircle2 className="w-5 h-5 text-primary" /> 报价汇总 & 完整成本计算明细
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="p-5 border rounded-[10px]">
                        <div className="text-sm text-muted-foreground mb-2 font-semibold uppercase tracking-wide">不含税报价</div>
                        <div className="price-main">{f4(q.exFactory.unit)} <span className="text-lg">元/个</span></div>
                        <div className="price-unit mt-2">≈ {f4(q.exFactory.unitUSD)} USD/pc</div>
                        <div className="breakdown-divider"></div>
                        <div className="price-unit font-medium">总价：{f(q.exFactory.total)} 元 ≈ {f(q.exFactory.totalUSD)} USD</div>
                      </div>
                      <div className="p-5 border-2 border-primary rounded-[10px] bg-primary/5">
                        <div className="text-sm text-primary mb-2 font-semibold uppercase tracking-wide">含税报价（含{bd.taxRate}%增值税）</div>
                        <div className="price-main">{f4(q.withTax.unit)} <span className="text-lg">元/个</span></div>
                        <div className="price-unit mt-2 text-primary font-medium">≈ {f4(q.withTax.unitUSD)} USD/pc</div>
                        <div className="breakdown-divider"></div>
                        <div className="price-unit text-primary font-medium">总价：{f(q.withTax.total)} 元 ≈ {f(q.withTax.totalUSD)} USD</div>
                      </div>
                    </div>

                    <div className="mt-5 text-sm font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
                      <Sparkles className="w-4 h-4 text-primary" /> 核心计算规则：所有费用累加 = 总成本 → 总成本 ÷ 总数量 = 单价 → 单价 × (1+税率) = 含税单价
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">1</Badge> 材料成本【精准分步计算】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>材料层明细（已过滤无材料项）：
                            {digitalCalcResult.materialDetails.length > 0 
                              ? digitalCalcResult.materialDetails.map(m => `${m.name}(${f4(m.sqPrice)}元/㎡)`).join(" + ")
                              : "无"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>材料平方价合计 = {f4(digitalCalcResult.materialSquarePriceTotal)} 元/㎡</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>总投料面积 = {f(pd.feedArea)} ㎡</span>
                        </div>
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>材料总成本计算公式：材料合计平方价 × 总投料面积</span>
                        </div>
                        <div className="text-primary font-medium pl-6">
                          → {f4(digitalCalcResult.materialSquarePriceTotal)} × {f(pd.feedArea)} = {f(cb.material)} 元
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">2</Badge> 复合成本【精准分步计算】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>复合层数规则：有效材料层数量 - 1 层（N层材料需要N-1次复合）</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>当前有效材料层：{digitalCalcResult.materialDetails.length} 层 → 复合层数 = {bd.laminationLayers} 层</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>单层复合计价规则：max({f(bd.laminationUnitPrice)}元【最低起步价】, {bd.laminationPerMeter} × 总投料米数)</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>单层复合费用 = max({f(bd.laminationUnitPrice)}, {bd.laminationPerMeter} × {f(pd.meterage.M_total)}) = {f(bd.singleLamCost)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>复合总成本计算公式：单层复合费用 × 复合层数</span>
                        </div>
                        <div className="text-primary font-medium pl-6">
                          → {f(bd.singleLamCost)} × {bd.laminationLayers} = {f(cb.lamination)} 元
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">3</Badge> 印刷成本【分袋型精准分步计算 无印刷/有印刷/双面印刷全适配】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>当前袋型：{bd.bagTypeName} 印刷规则</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>印刷模式：{bd.printModeName}</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>印刷倍率：{bd.printModeCoefficient}倍{bd.isDoublePrint ? "（双面印刷 ×2）" : ""}</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>订单转数：{f(pd.rotation.R_order)} 转 | 损耗转数：{f(pd.rotation.R_loss)} 转</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>印刷阶梯单价：{bd.printTierPrice} 元/转 (损耗部分固定4元/转)</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>文件费：{cb.fileFee}元{cb.fileFee > 0 ? ` (SKU ${bd.skuCount} > 5, (${bd.skuCount}-5)×50)` : ""}</span>
                        </div>
                        {bd.printModeCoefficient === 0 ? (
                          <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>无印刷模式 印刷总成本 = 损耗转数×4 + 文件费 = {f(pd.rotation.R_loss)}×4 + {cb.fileFee} = {f(cb.print)} 元</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>普通袋印刷总成本 = (订单转数×阶梯价 + 损耗转数×4) × 倍率{bd.isDoublePrint ? " × 双面系数" : ""} + 文件费</span>
                            </div>
                            <div className="text-primary font-medium pl-6">
                              → ({f(pd.rotation.R_order)}×{bd.printTierPrice} + {f(pd.rotation.R_loss)}×4) × {bd.printModeCoefficient}{bd.isDoublePrint ? " × 2" : ""} + {cb.fileFee} = {f(cb.print)} 元
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">4</Badge> 制袋成本【分袋型精准公式+数值代入】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>当前袋型：{bd.bagTypeName}</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>制袋计算公式：s=&gt;{bd.bagMakingCoefficient}*s.L_rev*(s.R_order+s.R_loss)*s.N_row</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>公式代入数值：
                            L_rev={f(pd.meterage.L_rev)}，
                            R_order={f(pd.rotation.R_order)}，
                            R_loss={f(pd.rotation.R_loss)}，
                            N_row={pd.layout.N_row}，
                            M_order={f(pd.meterage.M_order)}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>制袋基础费用 = {f(bd.bagMakingBaseCost)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>制袋最低起步价：{f(bd.bagMakingMinPrice)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>制袋总成本计算公式：max(制袋基础费用, 最低起步价)</span>
                        </div>
                        <div className="text-primary font-medium pl-6">
                          → max({f(bd.bagMakingBaseCost)}, {f(bd.bagMakingMinPrice)}) = {f(cb.bagMaking)} 元
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">5</Badge> 配件成本【逐项拆解 无隐藏费用】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>拉链费用：{f(bd.zipperCost)}元{bd.zipperName !== "无" ? ` (${bd.zipperName})` : ""}</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>气阀费用：{f(bd.valveCost)}元{bd.valveName !== "无" ? ` (${bd.valveName})` : ""}</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>其他附件：{bd.spoutCost > 0 ? `${bd.spoutName} ${f(bd.spoutCost)}元` : "0元"}</span>
                        </div>
                        {bd.stackableAccessoryCosts.length > 0 && bd.stackableAccessoryCosts.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>{item.name}：{f(item.cost)}元</span>
                          </div>
                        ))}
                        {bd.slittingCost > 0 && (
                          <div className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>卷膜分切费：{f(bd.slittingCost)}元</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>配件总成本 = 拉链+气阀+其他附件+额外选项+分切费 = {f(cb.accessories)} 元</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">6</Badge> 特殊工艺+自定义成本【逐项列出】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>已选特殊工艺：{bd.specialProcessItems.length > 0 ? bd.specialProcessItems.map(p => p.name).join("、") : "无"}</span>
                        </div>
                        {bd.specialProcessItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>{item.name}费用：{f(item.cost)}元</span>
                          </div>
                        ))}
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>异形袋模具费：{f(bd.shapedBagCost)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>模具费（自定义）：{f(bd.moldCost)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>版费（自定义）：{f(bd.plateCost)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>特殊工艺总成本 = {f(cb.specialProcess)} 元</span>
                        </div>
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>自定义总成本 = {f(bd.moldCost)} + {f(bd.plateCost)} = {f(cb.custom)} 元</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t-2 border-destructive pt-4 mt-6">
                      <h3 className="text-base font-bold text-destructive mb-3 flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 shrink-0" /> 最终总成本 & 单价 完整计算步骤【无删减 无隐藏】
                      </h3>
                      <div className="border-l-2 border-muted pl-4 space-y-3 text-sm">
                        <div>
                          <div className="font-medium mb-1">► 第一步：不含税总成本累加</div>
                          <div className="text-muted-foreground">
                            材料成本 {f(cb.material)} + 复合成本 {f(cb.lamination)} + 印刷成本 {f(cb.print)} + 制袋成本 {f(cb.bagMaking)} + 配件成本 {f(cb.accessories)} + 特殊工艺 {f(cb.specialProcess)} + 自定义成本 {f(cb.custom)}
                            {digitalCalcResult.isDoubleBag && " (×2 双放袋)"}
                          </div>
                          <div className="text-primary font-medium mt-1">= {f(q.exFactory.total)} 元 (不含税总成本)</div>
                        </div>

                        <div>
                          <div className="font-medium mb-1">► 第二步：不含税单价计算</div>
                          <div className="text-muted-foreground">不含税总成本 ÷ 总数量 = {f(q.exFactory.total)} ÷ {qtyNum} = {f4(q.exFactory.unit)} 元/个</div>
                        </div>

                        <div>
                          <div className="font-medium mb-1">► 第三步：含税金额计算（税率{bd.taxRate}%）</div>
                          <div className="text-muted-foreground">
                            含税单价 = 不含税单价 × (1 + {bd.taxRate}%) = {f4(q.exFactory.unit)} × {f4(1 + bd.taxRate / 100)} = {f4(q.withTax.unit)} 元/个
                          </div>
                          <div className="text-primary font-medium mt-1">
                            含税总成本 = 不含税总成本 × (1 + {bd.taxRate}%) = {f(q.exFactory.total)} × {f4(1 + bd.taxRate / 100)} = {f(q.withTax.total)} 元
                          </div>
                        </div>

                        <div>
                          <div className="font-medium mb-1">► 第四步：美金换算（汇率 {bd.exchangeRate}）</div>
                          <div className="text-destructive font-medium">
                            不含税美金单价：{f4(q.exFactory.unit)} ÷ {bd.exchangeRate} = {f4(q.exFactory.unitUSD)} USD/pc
                          </div>
                          <div className="text-destructive font-medium">
                            含税美金单价：{f4(q.withTax.unit)} ÷ {bd.exchangeRate} = {f4(q.withTax.unitUSD)} USD/pc
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </main>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">包装袋自动报价器</h1>
              <Badge variant="secondary">凹版印刷</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditParams} className="gap-2" data-testid="button-edit">
                <Edit className="w-4 h-4" />
                编辑参数
              </Button>
              {!hideRestart && (
                <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2" data-testid="button-restart">
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg section-title">袋型</CardTitle>
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
                      value={numStr(dimensions[dim as keyof typeof dimensions])}
                      onChange={(e) =>
                        setDimensions({ ...dimensions, [dim]: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      data-testid={`input-${dim}`}
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    数量 (个)
                  </Label>
                  <Input
                    type="number"
                    value={numStr(quantity)}
                    onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                    data-testid="input-quantity"
                  />
                </div>
              </div>
              {isEightSide && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm text-muted-foreground mb-2 block">八边封侧面材质</Label>
                  <Select value={eightSideMode} onValueChange={(v) => setEightSideMode(v as "same" | "diff")} data-testid="select-eightside-mode">
                    <SelectTrigger data-testid="select-eightside-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same">侧面材质与正背面相同</SelectItem>
                      <SelectItem value="diff">侧面使用不同材质</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEightSideDiff && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      正背底面积：{gravureCosts.frontBackBottomArea.toFixed(4)} ㎡ &nbsp;|&nbsp; 两侧面积：{gravureCosts.twoSideArea.toFixed(4)} ㎡ &nbsp;|&nbsp; 总面积：{gravureCosts.area.toFixed(4)} ㎡
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg section-title">
                  {isEightSideDiff ? "正背底面材料层" : "材料层结构"}（{materialLayers.length}层，自动{Math.max(0, materialLayers.length - 1)}次复合）
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={addMaterialLayer} disabled={materialLayers.length >= 5} data-testid="add-material-layer">
                    <Plus className="w-4 h-4" />
                    添加层
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {materialLayers.map((layer, index) => {
                  const calcCost = (a: number, thick: number, dens: number, prc: number) => {
                    if (dens === 0 || dens === undefined) return a * (thick / 1000) * prc;
                    return a * thick * dens * prc / 1000;
                  };
                  let layerCost: number;
                  if (layer.splice?.enabled && gravureCosts.unfoldedWidthMm > 0) {
                    const wMm = Math.max(0, Math.min(layer.splice.windowWidthMm, gravureCosts.unfoldedWidthMm));
                    const mainR = (gravureCosts.unfoldedWidthMm - wMm) / gravureCosts.unfoldedWidthMm;
                    const winR = wMm / gravureCosts.unfoldedWidthMm;
                    layerCost = calcCost(gravureCosts.area * mainR, layer.thickness, layer.density, layer.price)
                      + calcCost(gravureCosts.area * winR, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice);
                  } else {
                    layerCost = calcCost(gravureCosts.area, layer.thickness, layer.density, layer.price);
                  }

                  const toggleSplice = () => {
                    const updated = [...materialLayers];
                    if (layer.splice?.enabled) {
                      updated[index] = { ...layer, splice: undefined };
                    } else {
                      updated[index] = {
                        ...layer,
                        splice: {
                          enabled: true,
                          windowWidthMm: 0,
                          windowThicknessUm: 12,
                          windowDensity: 1.4,
                          windowPrice: 8,
                          windowMaterialId: config.materialLibrary[0]?.id || "",
                        },
                      };
                    }
                    setMaterialLayers(updated);
                  };

                  const updateSplice = (patch: Partial<SpliceConfig>) => {
                    const updated = [...materialLayers];
                    updated[index] = { ...layer, splice: { ...layer.splice!, ...patch } };
                    setMaterialLayers(updated);
                  };

                  const updateSpliceMaterial = (materialId: string) => {
                    const material = getMaterialById(materialId);
                    if (!material) return;
                    updateSplice({
                      windowMaterialId: materialId,
                      windowThicknessUm: material.thickness,
                      windowDensity: material.density,
                      windowPrice: material.price,
                    });
                  };

                  return (
                    <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`material-layer-${index}`}>
                      <div className="flex items-end gap-4">
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
                        <div className="flex flex-col gap-1">
                          <Button
                            variant={layer.splice?.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={toggleSplice}
                            data-testid={`toggle-splice-${index}`}
                          >
                            {layer.splice?.enabled ? "取消拼接" : "开窗拼接"}
                          </Button>
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
                      </div>

                      {layer.splice?.enabled && (
                        <>
                          <div className="flex items-end gap-4 bg-muted/40 p-3 rounded-md">
                            <div className="flex-1">
                              <Label className="text-sm text-muted-foreground mb-2 block">窗口膜材料</Label>
                              <Select
                                value={layer.splice.windowMaterialId}
                                onValueChange={updateSpliceMaterial}
                              >
                                <SelectTrigger data-testid={`select-splice-material-${index}`}>
                                  <SelectValue placeholder="选择窗口膜材料" />
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
                            <div className="w-28">
                              <Label className="text-sm text-muted-foreground mb-2 block">窗口膜宽度(mm)</Label>
                              <Input
                                type="number"
                                value={numStr(layer.splice.windowWidthMm)}
                                onChange={(e) => updateSplice({ windowWidthMm: e.target.value === "" ? 0 : Number(e.target.value) })}
                                data-testid={`input-splice-width-${index}`}
                              />
                            </div>
                            <div className="w-28">
                              <Label className="text-sm text-muted-foreground mb-2 block">窗口膜厚度(μm)</Label>
                              <Input
                                type="number"
                                value={numStr(layer.splice.windowThicknessUm)}
                                onChange={(e) => updateSplice({ windowThicknessUm: e.target.value === "" ? 0 : Number(e.target.value) })}
                                data-testid={`input-splice-thickness-${index}`}
                              />
                            </div>
                            <div className="w-24">
                              <Label className="text-sm text-muted-foreground mb-2 block">密度 g/cm³</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={numStr(layer.splice.windowDensity)}
                                onChange={(e) => updateSplice({ windowDensity: e.target.value === "" ? 0 : Number(e.target.value) })}
                              />
                            </div>
                            <div className="w-24">
                              <Label className="text-sm text-muted-foreground mb-2 block">单价 元/kg</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={numStr(layer.splice.windowPrice)}
                                onChange={(e) => updateSplice({ windowPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground px-3">
                            {(() => {
                              const totalW = gravureCosts.unfoldedWidthMm;
                              const rawWin = layer.splice.windowWidthMm;
                              const windowW = Math.max(0, Math.min(rawWin, totalW));
                              const mainW = Math.max(0, totalW - windowW);
                              return (
                                <span data-testid={`splice-info-${index}`}>
                                  当前层拼接：展开宽度 <b>{Math.round(totalW)}</b> mm，
                                  窗口膜宽度 <b>{Math.round(windowW)}</b> mm，
                                  主材宽度 = <b>{Math.round(mainW)}</b> mm
                                  {rawWin > totalW && (
                                    <span className="text-destructive ml-2">（已按最大展开宽度截断）</span>
                                  )}
                                </span>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {laminationSteps.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">
                  {isEightSideDiff ? "正背底面复合工艺" : "复合工艺"}（自动{laminationSteps.length}次复合）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {laminationSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <Label className="w-20 shrink-0">第{index + 1}次：</Label>
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isEightSideDiff && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-lg section-title">八边封侧面材料层（{sideMaterialLayers.length}层）</CardTitle>
                  <Button variant="outline" size="sm" onClick={addSideMaterialLayer} disabled={sideMaterialLayers.length >= 5} data-testid="add-side-material-layer">
                    <Plus className="w-4 h-4" />
                    添加侧面层
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sideMaterialLayers.map((layer, index) => {
                    const sideCost = (() => {
                      const a = gravureCosts.twoSideArea;
                      if (layer.density === 0 || layer.density === undefined) return a * (layer.thickness / 1000) * layer.price;
                      return a * layer.thickness * layer.density * layer.price / 1000;
                    })();
                    return (
                      <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`side-material-layer-${index}`}>
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <Label className="text-sm text-muted-foreground mb-2 block">侧面第{index + 1}层材料</Label>
                            <Select
                              value={layer.materialId}
                              onValueChange={(v) => updateSideMaterialLayer(index, v)}
                            >
                              <SelectTrigger data-testid={`select-side-material-${index}`}>
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
                                const updated = [...sideMaterialLayers];
                                updated[index].thickness = Number(e.target.value);
                                setSideMaterialLayers(updated);
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
                                const updated = [...sideMaterialLayers];
                                updated[index].density = Number(e.target.value);
                                setSideMaterialLayers(updated);
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
                                const updated = [...sideMaterialLayers];
                                updated[index].price = Number(e.target.value);
                                setSideMaterialLayers(updated);
                              }}
                            />
                          </div>
                          <div className="w-32 text-right">
                            <Label className="text-sm text-muted-foreground mb-2 block">材料成本/个</Label>
                            <div className="font-semibold text-primary">{sideCost.toFixed(4)} 元</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSideMaterialLayer(index)}
                            className="text-destructive"
                            disabled={sideMaterialLayers.length <= 1}
                            data-testid={`remove-side-layer-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">侧面印刷覆盖率</Label>
                    <Select value={String(sidePrintCoverage)} onValueChange={(v) => setSidePrintCoverage(Number(v))}>
                      <SelectTrigger className="w-64" data-testid="select-side-print-coverage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.printingPriceRules.map((rule) => (
                          <SelectItem key={rule.coverage} value={String(rule.coverage)}>
                            {rule.coverage}%（{rule.pricePerSqm}¥/㎡）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {sideLaminationSteps.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">侧面复合工艺（自动{sideLaminationSteps.length}次复合）</Label>
                      <div className="space-y-2">
                        {sideLaminationSteps.map((step, index) => (
                          <div key={step.id} className="flex items-center gap-4">
                            <Label className="w-20 shrink-0">第{index + 1}次：</Label>
                            <Select
                              value={step.laminationId}
                              onValueChange={(v) => {
                                setSideLaminationSteps(
                                  sideLaminationSteps.map((s, i) => i === index ? { ...s, laminationId: v } : s)
                                );
                              }}
                            >
                              <SelectTrigger className="w-64" data-testid={`select-side-lamination-${index}`}>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {[
            { cat: "additionalProcess" as const, label: "附加工艺（可多选）" },
            { cat: "surfaceTreatment" as const, label: "表面处理（可多选）" },
          ].map(({ cat, label }) => {
            const catOptions = config.postProcessingOptions.filter(
              (opt) => opt.enabled && (opt.category || "additionalProcess") === cat
            );
            if (catOptions.length === 0) return null;
            return (
              <Card key={cat}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg section-title">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {catOptions.map((option) => {
                      const _widthM = toNum(String(dimensions.width)) / 1000;
                      const currentCost = calcPostProcessingCost(option, _widthM, gravureCosts.area, selectedBagType?.id, selectedSpecs[option.id]);

                      let pricingLabel = "";
                      if (option.pricingType === "fixed") {
                        pricingLabel = `${toNum(String(option.fixedPrice ?? 0))} 元/个`;
                      } else if (option.pricingType === "perMeterWidth") {
                        pricingLabel = `${toNum(String(option.pricePerMeter ?? 0))} 元/米 x 袋宽`;
                      } else if (option.pricingType === "perArea") {
                        pricingLabel = `${toNum(String(option.pricePerSqm ?? 0))} 元/㎡`;
                        if (toNum(String(option.fixedAddition ?? 0)) > 0) pricingLabel += ` + ${toNum(String(option.fixedAddition ?? 0))}元/个`;
                      } else if (option.pricingType === "perMeterWidthByBagType") {
                        pricingLabel = `默认 ${toNum(String(option.defaultPricePerMeter ?? 0))} 元/米 x 袋宽`;
                        const overrides = (option.bagTypePrices || []).filter(b => b.bagTypeName);
                        if (overrides.length > 0) pricingLabel += `；${overrides.map(b => `${b.bagTypeName}: ${toNum(String(b.pricePerMeter))}`).join("、")}`;
                      } else if (option.pricingType === "free") {
                        pricingLabel = "免费标配";
                      } else if (option.pricingType === "specSelection") {
                        const specCount = (option.specOptions || []).length;
                        pricingLabel = `按规格选择（${specCount}种）`;
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
                                <div className="text-xs text-muted-foreground mt-1">
                                  {pricingLabel}
                                </div>
                                {option.pricingType !== "free" && (
                                  <div className="text-sm text-primary mt-2">
                                    当前成本: {currentCost.toFixed(4)} 元/个
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {catOptions
                    .filter(opt => opt.pricingType === "specSelection" && selectedPostProcessing[opt.id])
                    .map(option => (
                      <div key={option.id} className="mt-4">
                        <Label className="text-sm mb-2 block">{option.name} - 规格选择</Label>
                        <Select
                          value={selectedSpecs[option.id] || ""}
                          onValueChange={(val) => setSelectedSpecs({ ...selectedSpecs, [option.id]: val })}
                        >
                          <SelectTrigger data-testid={`select-spec-${option.id}`}>
                            <SelectValue placeholder={`选择${option.name}规格`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(option.specOptions || []).map((spec) => (
                              <SelectItem key={spec.specName} value={spec.specName}>
                                {spec.specName} - {toNum(String(spec.price))} 元/个
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!selectedSpecs[option.id] && (
                          <p className="text-xs text-destructive mt-1">请选择规格，否则该项成本按0计算</p>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            );
          })}
          {Object.entries(selectedPostProcessing).filter(([, v]) => v).length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                已选工艺：
                {Object.entries(selectedPostProcessing)
                  .filter(([, v]) => v)
                  .map(([id]) => config.postProcessingOptions.find((o) => o.id === id)?.name)
                  .join("、")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg section-title">{isEightSideDiff ? "正背底面印刷" : "印刷"}（按覆盖率选择）</CardTitle>
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
                <CardTitle className="text-lg section-title">版费（与袋子单价分开结算）</CardTitle>
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
                  <span className="font-semibold text-lg ml-2">{gravureCosts.plateCost.toFixed(2)} 元</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg section-title">利润率 & 汇率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-6">
                <div className="w-40">
                  <Label className="text-sm text-muted-foreground mb-2 block">利润率 (%)</Label>
                  <Input
                    type="number"
                    value={numStr(profitRate)}
                    onChange={(e) => setProfitRate(e.target.value === "" ? "" : Number(e.target.value))}
                    data-testid="input-profitRate"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-sm text-muted-foreground mb-2 block">汇率（美元→人民币）</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={numStr(exchangeRate)}
                    onChange={(e) => setExchangeRate(e.target.value === "" ? "" : Number(e.target.value))}
                    data-testid="input-exchangeRate"
                  />
                </div>
                <div className="flex-1 text-right text-sm text-muted-foreground">
                  <div>当前利润系数：{(1 + toNum(String(profitRate)) / 100).toFixed(2)}</div>
                  <div>当前汇率：{toNum(String(exchangeRate)).toFixed(2)} 元 / 美元</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                报价 = 成本价 × 损耗率 × 利润率（示例：10% 损耗→×1.10，10% 利润→×1.10）
              </div>
            </CardContent>
          </Card>

          {(() => {
            const f4 = (n: number) => n.toFixed(4);
            const f2 = (n: number) => n.toFixed(2);
            const usd = (cny: number) => cny / (toNum(String(exchangeRate)) || 1);
            const gc = gravureCosts;
            const priceUnit = "元/个";
            const priceUnitEn = "USD/pc";

            return (
              <div className="space-y-0" data-testid="calculation-breakdown">
                <div className="summary-panel mb-8">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap tracking-tight">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> 报价汇总 & 完整成本计算明细
                  </h2>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                    <div className="p-4 border rounded-[10px]" data-testid="card-exfactory">
                      <div className="text-xs font-semibold text-muted-foreground">
                        出厂价（不含版费，含损耗，含利润）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：<span className="font-bold">{f4(gc.exFactoryUnit)} {priceUnit}</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f4(usd(gc.exFactoryUnit))} {priceUnitEn}</span>
                      </div>
                      <div className="text-sm">
                        总价：<span className="font-bold">{f2(gc.exFactoryTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f2(usd(gc.exFactoryTotal))} USD</span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-[10px]" data-testid="card-withfreight">
                      <div className="text-xs font-semibold text-muted-foreground">
                        含运价（不含版费，含损耗，含利润，含运费 +3%）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：<span className="font-bold">{f4(gc.withFreightUnit)} {priceUnit}</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f4(usd(gc.withFreightUnit))} {priceUnitEn}</span>
                      </div>
                      <div className="text-sm">
                        总价：<span className="font-bold">{f2(gc.withFreightTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f2(usd(gc.withFreightTotal))} USD</span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-[10px]" data-testid="card-withfreighttax">
                      <div className="text-xs font-semibold text-muted-foreground">
                        含运含税价（不含版费，含损耗，含利润，含运费 +3%，含税 +9%）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：<span className="font-bold">{f4(gc.withFreightTaxUnit)} {priceUnit}</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f4(usd(gc.withFreightTaxUnit))} {priceUnitEn}</span>
                      </div>
                      <div className="text-sm">
                        总价：<span className="font-bold">{f2(gc.withFreightTaxTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">≈ {f2(usd(gc.withFreightTaxTotal))} USD</span>
                      </div>
                    </div>

                    <div className="p-4 border-2 border-primary rounded-[10px] bg-primary/5" data-testid="card-final-price">
                      <div className="text-xs font-semibold text-primary">
                        含版费含运含税价（含版费，含损耗，含利润，含运费 +3%，含税 +9%）
                      </div>
                      <div className="mt-1">
                        <span className="price-main text-primary">{f4(gc.withPlateFreightTaxUnit)}</span>
                        <span className="price-unit ml-1">{priceUnit}</span>
                        <span className="price-unit ml-2">≈ {f4(usd(gc.withPlateFreightTaxUnit))} {priceUnitEn}</span>
                      </div>
                      <div className="text-sm text-primary mt-1">
                        总价：<span className="font-bold">{f2(gc.withPlateFreightTaxTotal)} 元</span>
                        <span className="ml-1 text-xs opacity-80">≈ {f2(usd(gc.withPlateFreightTaxTotal))} USD</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3 mt-4 text-sm" data-testid="cost-breakdown-grid">
                    <div className="p-3 rounded-md border" data-testid="cost-material">
                      <div className="text-muted-foreground">材料</div>
                      <div className="font-semibold">{f4(gc.materialCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-print">
                      <div className="text-muted-foreground">印刷</div>
                      <div className="font-semibold">{f4(gc.printCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-lamination">
                      <div className="text-muted-foreground">复合</div>
                      <div className="font-semibold">{f4(gc.laminationCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-making">
                      <div className="text-muted-foreground">制袋</div>
                      <div className="font-semibold">{f4(gc.makingCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-postprocess">
                      <div className="text-muted-foreground">后加工</div>
                      <div className="font-semibold">{f4(gc.postProcessingCostPerUnit)} 元</div>
                    </div>
                  </div>

                  <div className="mt-5 text-sm font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
                    <Sparkles className="w-4 h-4 text-primary" /> 核心规则：基础单价 × 损耗 × 数量系数 × 利润 = 出厂价 → +运费3% → +税9% → +版费分摊 = 最终价
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">1</Badge> 材料成本【逐层精准计算】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      {gc.isEightSideDiff && (
                        <>
                          <div className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>八边封分区：正背底面积 {f4(gc.frontBackBottomArea)}㎡ + 两侧面积 {f4(gc.twoSideArea)}㎡ = 总 {f4(gc.area)}㎡</span>
                          </div>
                          <div className="flex items-start gap-2 flex-wrap font-medium text-xs">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>正背底面材料：</span>
                          </div>
                        </>
                      )}
                      {materialLayers.map((layer, i) => {
                        const material = config.materialLibrary.find(m => m.id === layer.materialId);
                        const materialName = material?.name || "未知材料";
                        const _area = gc.isEightSideDiff ? gc.frontBackBottomArea : gc.area;
                        const calcDetailCost = (a: number, thick: number, dens: number, prc: number) => {
                          if (dens === 0 || dens === undefined) return a * (thick / 1000) * prc;
                          return a * thick * dens * prc / 1000;
                        };
                        const formatFormula = (a: number, thick: number, dens: number, prc: number, cost: number) => {
                          if (dens === 0 || dens === undefined) {
                            return <>面积 {f4(a)}㎡ × (克重 {thick} ÷ 1000) × 单价 {prc} 元/kg = {f4(cost)} 元</>;
                          }
                          return <>面积 {f4(a)}㎡ × 厚度 {thick}μm × 密度 {dens} × 单价 {prc} ÷ 1000 = {f4(cost)} 元</>;
                        };
                        if (layer.splice?.enabled && gc.unfoldedWidthMm > 0) {
                          const wMm = Math.max(0, Math.min(layer.splice.windowWidthMm, gc.unfoldedWidthMm));
                          const mainMm = gc.unfoldedWidthMm - wMm;
                          const mainR = mainMm / gc.unfoldedWidthMm;
                          const winR = wMm / gc.unfoldedWidthMm;
                          const spliceMainArea = _area * mainR;
                          const winArea = _area * winR;
                          const mainCost = calcDetailCost(spliceMainArea, layer.thickness, layer.density, layer.price);
                          const winMat = config.materialLibrary.find(m => m.id === layer.splice!.windowMaterialId);
                          const winName = winMat?.name || "窗口膜";
                          const winCost = calcDetailCost(winArea, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>第{i + 1}层 {materialName}（开窗拼接）</span>
                              </div>
                              <div className="pl-5 text-muted-foreground">主材（{Math.round(mainMm)}mm / {Math.round(gc.unfoldedWidthMm)}mm）：{formatFormula(spliceMainArea, layer.thickness, layer.density, layer.price, mainCost)}</div>
                              <div className="pl-5 text-muted-foreground">窗口膜 {winName}（{Math.round(wMm)}mm / {Math.round(gc.unfoldedWidthMm)}mm）：{formatFormula(winArea, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice, winCost)}</div>
                              <div className="pl-5 font-medium">合计 = {f4(mainCost + winCost)} 元/个</div>
                            </div>
                          );
                        }
                        const cost = calcDetailCost(_area, layer.thickness, layer.density, layer.price);
                        const method = (layer.density === 0 || layer.density === undefined) ? "纸类gsm法" : "薄膜法";
                        return (
                          <div key={i} className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>第{i + 1}层 {materialName}（{method}）：{formatFormula(_area, layer.thickness, layer.density, layer.price, cost)}</span>
                          </div>
                        );
                      })}
                      {gc.isEightSideDiff && (
                        <>
                          <div className="flex items-start gap-2 flex-wrap font-medium text-xs mt-2">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>侧面材料（面积 {f4(gc.twoSideArea)}㎡）：</span>
                          </div>
                          {sideMaterialLayers.map((layer, i) => {
                            const material = config.materialLibrary.find(m => m.id === layer.materialId);
                            const materialName = material?.name || "未知材料";
                            const calcSideCost = (a: number, thick: number, dens: number, prc: number) => {
                              if (dens === 0 || dens === undefined) return a * (thick / 1000) * prc;
                              return a * thick * dens * prc / 1000;
                            };
                            const cost = calcSideCost(gc.twoSideArea, layer.thickness, layer.density, layer.price);
                            const method = (layer.density === 0 || layer.density === undefined) ? "纸类gsm法" : "薄膜法";
                            return (
                              <div key={`side-${i}`} className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>侧面第{i + 1}层 {materialName}（{method}）：
                                  {layer.density === 0 || layer.density === undefined
                                    ? <>面积 {f4(gc.twoSideArea)}㎡ × (克重 {layer.thickness} ÷ 1000) × 单价 {layer.price} 元/kg = {f4(cost)} 元</>
                                    : <>面积 {f4(gc.twoSideArea)}㎡ × 厚度 {layer.thickness}μm × 密度 {layer.density} × 单价 {layer.price} ÷ 1000 = {f4(cost)} 元</>
                                  }
                                </span>
                              </div>
                            );
                          })}
                          <div className="flex items-start gap-2 font-medium flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>侧面材料合计 = {f4(gc.sideMaterialCostPerUnit)} 元/个</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>材料总成本 = {f4(gc.materialCostPerUnit)} 元/个</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">2</Badge> 印刷成本【覆盖率定价】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      {(() => {
                        const printRule = config.printingPriceRules.find(r => r.coverage === selectedPrintCoverage);
                        const pricePerSqm = printRule?.pricePerSqm || 0;
                        if (gc.isEightSideDiff) {
                          const sidePrintRule = config.printingPriceRules.find(r => r.coverage === sidePrintCoverage);
                          const sidePricePerSqm = sidePrintRule?.pricePerSqm || 0;
                          const mainPrint = gc.frontBackBottomArea * pricePerSqm;
                          const sidePrint = gc.twoSideArea * sidePricePerSqm;
                          return (
                            <>
                              <div className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>正背底面印刷：{f4(gc.frontBackBottomArea)}㎡ × {pricePerSqm} 元/㎡ = {f4(mainPrint)} 元</span>
                              </div>
                              <div className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>侧面印刷：{f4(gc.twoSideArea)}㎡ × {sidePricePerSqm} 元/㎡ = {f4(sidePrint)} 元</span>
                              </div>
                            </>
                          );
                        }
                        return (
                          <>
                            <div className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>公式：印刷 = 展开面积 × 覆盖单价</span>
                            </div>
                            <div className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>代入：{f4(gc.area)} ㎡ × {pricePerSqm} 元/㎡</span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>印刷总成本 = {f4(gc.printCostPerUnit)} 元/个</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">3</Badge> 复合成本【分步叠加】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      {(() => {
                        const stepDetails = laminationSteps.map((step, i) => {
                          const rule = config.laminationPriceRules.find(r => r.id === step.laminationId);
                          return { label: rule?.name || `第${i + 1}步`, price: rule?.pricePerSqm || 0 };
                        });
                        const laminationSum = stepDetails.reduce((s, d) => s + d.price, 0);
                        if (gc.isEightSideDiff) {
                          const sideStepDetails = sideLaminationSteps.map((step, i) => {
                            const rule = config.laminationPriceRules.find(r => r.id === step.laminationId);
                            return { label: rule?.name || `第${i + 1}步`, price: rule?.pricePerSqm || 0 };
                          });
                          const sideLaminationSum = sideStepDetails.reduce((s, d) => s + d.price, 0);
                          const mainLam = gc.frontBackBottomArea * laminationSum;
                          const sideLam = gc.twoSideArea * sideLaminationSum;
                          return (
                            <>
                              <div className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>正背底面复合：{f4(gc.frontBackBottomArea)}㎡ × {laminationSum} 元/㎡ = {f4(mainLam)} 元</span>
                              </div>
                              <div className="flex items-start gap-2 flex-wrap">
                                <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                                <span>侧面复合：{f4(gc.twoSideArea)}㎡ × {sideLaminationSum} 元/㎡ = {f4(sideLam)} 元</span>
                              </div>
                            </>
                          );
                        }
                        return (
                          <>
                            <div className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>公式：复合 = 展开面积 × (各步单价之和)</span>
                            </div>
                            <div className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>{stepDetails.map((d, i) => `${i > 0 ? " + " : ""}${d.label} ${d.price}元/㎡`).join("")} = {laminationSum} 元/㎡</span>
                            </div>
                            <div className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>代入：{f4(gc.area)} ㎡ × {laminationSum}</span>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>复合总成本 = {f4(gc.laminationCostPerUnit)} 元/个</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">4</Badge> 制袋成本【公式+数值代入】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      {selectedBagType?.makingCostFormula && isValidMakingFormula(selectedBagType.makingCostFormula) ? (
                        <>
                          <div className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>公式：{selectedBagType.makingCostFormula}</span>
                          </div>
                          <div className="flex items-start gap-2 flex-wrap">
                            <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                            <span>代入尺寸：袋宽={toNum(String(dimensions.width)) / 1000}m 袋高={toNum(String(dimensions.height)) / 1000}m
                              {requiredDimensions.includes("bottomInsert") && ` 底插入=${toNum(String(dimensions.bottomInsert)) / 1000}m`}
                              {requiredDimensions.includes("sideExpansion") && ` 侧展开=${toNum(String(dimensions.sideExpansion)) / 1000}m`}
                              {requiredDimensions.includes("backSeal") && ` 背封边=${toNum(String(dimensions.backSeal)) / 1000}m`}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>制袋总成本 = {f4(gc.makingCostPerUnit)} 元/个</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>未配置制袋公式，制袋 = 0 元/个</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">5</Badge> 后加工成本【逐项拆解】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      {Object.entries(selectedPostProcessing).filter(([, v]) => v).length === 0 ? (
                        <div className="flex items-start gap-2 flex-wrap">
                          <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                          <span>未选择后加工，后加工费 = 0 元/个</span>
                        </div>
                      ) : (
                        Object.entries(selectedPostProcessing).filter(([, v]) => v).map(([id]) => {
                          const opt = config.postProcessingOptions.find(o => o.id === id);
                          if (!opt) return null;
                          const _wM = toNum(String(dimensions.width)) / 1000;
                          const _cost = calcPostProcessingCost(opt, _wM, gravureCosts.area, selectedBagType?.id, selectedSpecs[id]);
                          return (
                            <div key={id} className="flex items-start gap-2 flex-wrap">
                              <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                              <span>{opt.name}
                                {opt.pricingType === "specSelection" && selectedSpecs[id] && ` (${selectedSpecs[id]})`}
                                {opt.pricingType !== "free" && `：${_cost.toFixed(4)} 元/个`}
                                {opt.pricingType === "free" && "（免费）"}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>后加工总成本 = {f4(gc.postProcessingCostPerUnit)} 元/个</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">6</Badge> 单价合计与系数调整
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      <div className="flex items-start gap-2 flex-wrap" data-testid="text-base-cost">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>基础单价 = 材料 + 印刷 + 复合 + 制袋 + 后加工 = {f4(gc.materialCostPerUnit)} + {f4(gc.printCostPerUnit)} + {f4(gc.laminationCostPerUnit)} + {f4(gc.makingCostPerUnit)} + {f4(gc.postProcessingCostPerUnit)} = {f4(gc.baseCostPerUnit)} 元/个</span>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap" data-testid="text-waste-coeff">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>× 损耗系数 {gc.wasteCoefficient.toFixed(2)} = {f4(gc.costWithWaste)} 元/个</span>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap" data-testid="text-qty-coeff">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>× 数量系数 {gc.quantityCoefficient.toFixed(2)} = {f4(gc.costWithQuantity)} 元/个</span>
                      </div>
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap" data-testid="text-profit-coeff">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>× 利润系数 {gc.profitMultiplier.toFixed(2)} = {f4(gc.exFactoryUnit)} 元/个（出厂价）</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">7</Badge> 版费与上机费
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                      <div className="flex items-start gap-2 flex-wrap" data-testid="text-plate-cost">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>版费 = 版长 {plateConfig.plateLength}cm × 版周 {plateConfig.plateCircumference}cm × {plateConfig.colorCount}色 × {plateConfig.pricePerSqcm} 元/cm² = {f2(gc.plateCost)} 元</span>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap" data-testid="text-setup-fee">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>上机费 = {toNum(String(quantity)) >= 10000
                          ? `数量 ≥ 10,000，免上机费 = 0 元`
                          : `min(200 × ${plateConfig.colorCount}色, 1800) = ${f2(gc.setupFee)} 元`
                        }</span>
                      </div>
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>版费合计 = {f2(gc.plateCost)} + {f2(gc.setupFee)} = {f2(gc.plateCost + gc.setupFee)} 元</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-destructive pt-4 mt-6">
                    <h3 className="text-base font-bold text-destructive mb-3 flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-4 h-4 shrink-0" /> 最终价格推导【完整计算步骤】
                    </h3>
                    <div className="border-l-2 border-muted pl-4 space-y-3 text-sm">
                      <div>
                        <div className="font-medium mb-1" data-testid="text-exfactory-derivation">► 第一步：出厂单价</div>
                        <div className="text-primary font-medium">出厂单价 = {f4(gc.exFactoryUnit)} {priceUnit} → 总 {f2(gc.exFactoryTotal)} 元</div>
                      </div>
                      <div>
                        <div className="font-medium mb-1" data-testid="text-freight-derivation">► 第二步：含运价（+3%运费）</div>
                        <div className="text-muted-foreground">{f4(gc.exFactoryUnit)} × 1.03 = {f4(gc.withFreightUnit)} {priceUnit}</div>
                        <div className="text-primary font-medium mt-1">含运总价 = {f2(gc.withFreightTotal)} 元</div>
                      </div>
                      <div>
                        <div className="font-medium mb-1" data-testid="text-tax-derivation">► 第三步：含运含税价（+9%税）</div>
                        <div className="text-muted-foreground">{f4(gc.withFreightUnit)} × 1.09 = {f4(gc.withFreightTaxUnit)} {priceUnit}</div>
                        <div className="text-primary font-medium mt-1">含运含税总价 = {f2(gc.withFreightTaxTotal)} 元</div>
                      </div>
                      <div>
                        <div className="font-medium mb-1" data-testid="text-plate-derivation">► 第四步：含版费最终价</div>
                        <div className="text-muted-foreground">{f4(gc.withFreightTaxUnit)} + ({f2(gc.plateCost)} + {f2(gc.setupFee)}) / {quantity} = {f4(gc.withPlateFreightTaxUnit)} {priceUnit}</div>
                        <div className="text-destructive font-medium mt-1" data-testid="text-final-total">
                          含版费含运含税总价 = {f2(gc.withPlateFreightTaxTotal)} 元 ≈ {f2(usd(gc.withPlateFreightTaxTotal))} USD
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-6 pt-3 border-t">
                    注：材料成本公式=面积×厚度(μm)×密度(g/cm³)×单价(元/kg)/1000；纸类用面积×(gsm/1000)×单价。
                    印刷、复合、制袋等单价按㎡或m计入；数量系数按起订量规则。
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
