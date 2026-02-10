import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, RefreshCw, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuote, type CustomMaterial, type CustomBagType, type DigitalMaterial, type PostProcessingOptionConfig } from "@/lib/quote-store";

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

export default function QuotePage() {
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

  if (!state.productType) {
    navigate("/");
    return null;
  }

  const currentBagTypes = isDigital ? digitalConfig.customBagTypes : config.customBagTypes;
  const selectedBagType = currentBagTypes.find((b) => b.id === selectedBagTypeId);
  const requiredDimensions = selectedBagType?.requiredDimensions || [];

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

  const calculateDigitalCosts = useMemo(() => {
    const _qty = toNum(String(quantity));
    const _sku = toNum(String(skuCount));
    const _tax = toNum(String(taxRate));
    const _exr = toNum(String(exchangeRate));
    const _mold = toNum(String(moldCost));
    const _spp = toNum(String(specialProcessPlateCost));
    const w = toNum(String(dimensions.width));
    const h = toNum(String(dimensions.height));
    const bi = toNum(String(dimensions.bottomInsert));
    const se = toNum(String(dimensions.sideExpansion));
    const bs = toNum(String(dimensions.backSeal));
    const sg = toNum(String(dimensions.sideGusset));
    const sealE = toNum(String(dimensions.sealEdge));
    const areaCoef = toNum(String(dimensions.areaCoefficient));

    let unfoldedLengthMM = 0;
    let unfoldedWidthMM = 0;

    switch (selectedBagType?.id) {
      case "threeSide":
      case "threeSideDouble":
        unfoldedLengthMM = h * 2 + sealE * 2;
        unfoldedWidthMM = w + sealE;
        break;
      case "standupNoZip":
      case "standupWithZip":
      case "standupDouble":
      case "standupSplitBottom":
        unfoldedLengthMM = (h + bi) * 2;
        unfoldedWidthMM = w + sealE;
        break;
      case "centerSeal":
      case "sideSeal":
        unfoldedLengthMM = h;
        unfoldedWidthMM = (w + bs) * 2;
        break;
      case "gusset":
        unfoldedLengthMM = h;
        unfoldedWidthMM = (w + se + bs) * 2;
        break;
      case "eightSideNoZip":
      case "eightSideWithZip":
      case "eightSideDouble":
      case "eightSideSplitBottom":
        unfoldedLengthMM = h * 2 + sg * 2;
        unfoldedWidthMM = w + sg * 2;
        break;
      case "rollFilm":
        unfoldedLengthMM = h;
        unfoldedWidthMM = w;
        break;
      case "shapedBag":
        unfoldedLengthMM = h * 2 * areaCoef;
        unfoldedWidthMM = w;
        break;
      default:
        unfoldedLengthMM = h * 2;
        unfoldedWidthMM = w;
    }

    const { maxPrintWidth, maxPrintCircumference, materialWidth } = digitalConfig.systemConstants;

    const acrossCount = Math.floor(maxPrintWidth / unfoldedWidthMM);
    const aroundCount = Math.floor(maxPrintCircumference / unfoldedLengthMM);
    const bagsPerRevolution = acrossCount * aroundCount;

    const orderRevolutions = Math.ceil((_qty * _sku) / bagsPerRevolution);
    const wasteRevolutions = _sku * digitalConfig.systemConstants.skuWaste;
    const totalRevolutions = orderRevolutions + wasteRevolutions;

    const orderMeters = (orderRevolutions * maxPrintCircumference) / 1000;
    const wasteMeters = (wasteRevolutions * maxPrintCircumference) / 1000;
    const idleMeters = digitalConfig.systemConstants.idleMaterialMin;
    const totalMeters = orderMeters + wasteMeters + idleMeters;

    const feedAreaSqm = (totalMeters * materialWidth) / 1000;

    const bagAreaSqm = (unfoldedLengthMM * unfoldedWidthMM) / 1000000;

    const materialCostTotal = feedAreaSqm * totalSquarePrice;
    const materialCostPerUnit = materialCostTotal / (_qty * _sku || 1);

    let printCostPerMeter = 0;
    const selectedMode = digitalConfig.printModes.find(m => m.id === selectedPrintModeId);
    if (selectedMode && selectedMode.id !== "none") {
      for (const tier of digitalConfig.printingTiers) {
        if (totalMeters <= tier.maxMeters) {
          printCostPerMeter = tier.pricePerMeter;
          break;
        }
      }
      if (printCostPerMeter === 0 && digitalConfig.printingTiers.length > 0) {
        printCostPerMeter = digitalConfig.printingTiers[digitalConfig.printingTiers.length - 1].pricePerMeter;
      }
      if (selectedMode.id === "doubleWhite") {
        printCostPerMeter *= 2;
      }
    }
    const printCostTotal = totalMeters * printCostPerMeter;
    const printCostPerUnit = printCostTotal / (_qty * _sku || 1);

    let specialProcessCostTotal = 0;
    Object.entries(selectedSpecialProcesses).forEach(([id, isSelected]) => {
      if (!isSelected) return;
      const process = digitalConfig.specialProcesses.find(p => p.id === id);
      if (!process) return;
      
      let cost = 0;
      if (process.priceFormula.includes("×总数量")) {
        const match = process.priceFormula.match(/(\d+\.?\d*)/);
        const rate = match ? parseFloat(match[1]) : 0.05;
        cost = rate * _qty * _sku;
      } else if (process.priceFormula.includes("×印刷米数") || process.priceFormula.includes("×投料米数")) {
        const match = process.priceFormula.match(/(\d+\.?\d*)/);
        const rate = match ? parseFloat(match[1]) : 1;
        cost = rate * totalMeters;
      } else if (process.priceFormula.includes("印刷费×2")) {
        cost = printCostTotal;
      }
      
      if (process.minPrice > 0 && cost < process.minPrice) {
        cost = process.minPrice;
      }
      specialProcessCostTotal += cost;
    });
    const specialProcessCostPerUnit = specialProcessCostTotal / (_qty * _sku || 1);

    let accessoryCostPerUnit = 0;
    
    if (selectedZipperId !== "none") {
      const zipper = digitalConfig.zipperTypes.find(z => z.id === selectedZipperId);
      if (zipper) {
        accessoryCostPerUnit += (w / 1000) * zipper.pricePerMeter;
      }
    }
    
    if (selectedValveId !== "none") {
      const valve = digitalConfig.valveTypes.find(v => v.id === selectedValveId);
      if (valve) {
        accessoryCostPerUnit += valve.pricePerUnit;
      }
    }
    
    if (selectedSpoutId) {
      const spout = digitalConfig.accessories.find(a => a.id === selectedSpoutId);
      if (spout) {
        accessoryCostPerUnit += spout.price;
      }
    }
    
    Object.entries(selectedAccessories).forEach(([id, isSelected]) => {
      if (!isSelected) return;
      const acc = digitalConfig.accessories.find(a => a.id === id);
      if (acc) {
        if (acc.price > 0) {
          accessoryCostPerUnit += acc.price;
        } else if (acc.name.includes("束口条")) {
          if (w <= 140) accessoryCostPerUnit += 0.5;
          else if (w <= 200) accessoryCostPerUnit += 0.6;
          else if (w <= 250) accessoryCostPerUnit += 0.7;
          else accessoryCostPerUnit += 0.8;
        } else if (acc.name.includes("激光易撕线")) {
          accessoryCostPerUnit += 0.35 * totalMeters / (_qty * _sku || 1);
        }
      }
    });

    const baseCostPerUnit = materialCostPerUnit + printCostPerUnit + specialProcessCostPerUnit + accessoryCostPerUnit;
    
    const fixedCosts = _mold + _spp;
    const fixedCostPerUnit = fixedCosts / (_qty * _sku || 1);
    
    const subtotalPerUnit = baseCostPerUnit + fixedCostPerUnit;
    const taxMultiplier = 1 + _tax / 100;
    const finalCostPerUnit = subtotalPerUnit * taxMultiplier;
    
    const totalCostCNY = finalCostPerUnit * _qty * _sku + fixedCosts;
    const totalCostUSD = totalCostCNY / (_exr || 1);

    return {
      unfoldedLength: unfoldedLengthMM,
      unfoldedWidth: unfoldedWidthMM,
      acrossCount,
      aroundCount,
      bagsPerRevolution,
      orderRevolutions,
      wasteRevolutions,
      totalRevolutions,
      orderMeters,
      wasteMeters,
      idleMeters,
      totalMeters,
      feedAreaSqm,
      bagAreaSqm,
      materialCostTotal,
      materialCostPerUnit,
      printCostPerMeter,
      printCostTotal,
      printCostPerUnit,
      specialProcessCostTotal,
      specialProcessCostPerUnit,
      accessoryCostPerUnit,
      baseCostPerUnit,
      fixedCosts,
      fixedCostPerUnit,
      subtotalPerUnit,
      finalCostPerUnit,
      totalCostCNY,
      totalCostUSD,
    };
  }, [dimensions, selectedBagType, quantity, skuCount, digitalConfig, totalSquarePrice, selectedPrintModeId, selectedSpecialProcesses, selectedZipperId, selectedValveId, selectedSpoutId, selectedAccessories, moldCost, specialProcessPlateCost, taxRate, exchangeRate]);

  const getMaterialById = (id: string): CustomMaterial | undefined => {
    return config.materialLibrary.find((m) => m.id === id);
  };

  const parseMakingCostFormula = (formula: string, dims: { width: number; height: number; bottomInsert: number; sideExpansion: number; backSeal: number }): number => {
    try {
      let expr = formula
        .replace(/min\(袋宽[,，]袋高\)/gi, String(Math.min(dims.width, dims.height)))
        .replace(/min\(袋高[,，]袋宽\)/gi, String(Math.min(dims.width, dims.height)))
        .replace(/袋宽/g, String(dims.width))
        .replace(/袋高/g, String(dims.height))
        .replace(/底插入|底琴/g, String(dims.bottomInsert))
        .replace(/侧面展开|侧琴/g, String(dims.sideExpansion))
        .replace(/背封边/g, String(dims.backSeal))
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
      const result = new Function('return ' + expr)();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch {
      return 0;
    }
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
          const frontBackBottom = (h + h + se + 0.03) * (w + 0.006);
          const twoSide = (se + 0.006) * 2 * (h + 0.01);
          area = frontBackBottom + twoSide;
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

    let materialCostPerUnit = 0;
    materialLayers.forEach((layer) => {
      const calcLayerCost = (a: number, thick: number, dens: number, prc: number) => {
        if (dens === 0 || dens === undefined) {
          return a * (thick / 1000) * prc;
        }
        return a * thick * dens * prc / 1000;
      };

      if (layer.splice?.enabled && unfoldedWidthMm > 0) {
        const windowMm = Math.max(0, Math.min(layer.splice.windowWidthMm, unfoldedWidthMm));
        const mainMm = unfoldedWidthMm - windowMm;
        const mainRatio = mainMm / unfoldedWidthMm;
        const windowRatio = windowMm / unfoldedWidthMm;
        const mainArea = area * mainRatio;
        const windowArea = area * windowRatio;
        materialCostPerUnit += calcLayerCost(mainArea, layer.thickness, layer.density, layer.price);
        materialCostPerUnit += calcLayerCost(windowArea, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice);
      } else {
        materialCostPerUnit += calcLayerCost(area, layer.thickness, layer.density, layer.price);
      }
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
      unfoldedWidthMm,
      materialCostPerUnit,
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
    };
  }, [
    dimensions,
    materialLayers,
    selectedPrintCoverage,
    laminationSteps,
    selectedPostProcessing,
    plateConfig,
    quantity,
    profitRate,
    config,
    selectedBagType,
    selectedSpecs,
    exchangeRate,
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
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">包装袋自动报价器</h1>
                <Badge variant="secondary">数码印刷</Badge>
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
                <CardTitle className="text-lg">袋型与尺寸</CardTitle>
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
                <CardTitle className="text-lg">订单信息配置</CardTitle>
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
                <CardTitle className="text-lg">材料层结构</CardTitle>
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
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="add-composite-layer"
                  >
                    + 复合层
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => addDigitalLayer("seal")}
                    className="bg-green-600 hover:bg-green-700"
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
                <CardTitle className="text-lg">印刷工艺</CardTitle>
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
                <CardTitle className="text-lg">特殊工艺（可多选）</CardTitle>
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
                            {process.minPrice > 0 && `最低${process.minPrice}元，`}
                            {process.priceFormula}
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
                <CardTitle className="text-lg">附件配置</CardTitle>
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
                        <SelectItem value="none">无</SelectItem>
                        {digitalConfig.zipperTypes.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name} ({z.pricePerMeter}元/米)
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
                        <SelectItem value="none">无</SelectItem>
                        {digitalConfig.valveTypes.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.pricePerUnit}元/个)
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
                <CardTitle className="text-lg">自定义成本设置</CardTitle>
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

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">中间过程数据（核对用）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>展开尺寸：</strong>长度 {calculateDigitalCosts.unfoldedLength.toFixed(2)} mm，宽度 {calculateDigitalCosts.unfoldedWidth.toFixed(2)} mm</div>
                  <div><strong>排版参数：</strong>横排 {calculateDigitalCosts.acrossCount} 个，周排 {calculateDigitalCosts.aroundCount} 个，每转产出 {calculateDigitalCosts.bagsPerRevolution} 个</div>
                  <div><strong>转数：</strong>订单转数 {calculateDigitalCosts.orderRevolutions.toFixed(2)} 转，损耗转数 {calculateDigitalCosts.wasteRevolutions.toFixed(2)} 转</div>
                  <div><strong>米数：</strong>订单 {calculateDigitalCosts.orderMeters.toFixed(2)} m，损耗 {calculateDigitalCosts.wasteMeters.toFixed(2)} m，闲置 {calculateDigitalCosts.idleMeters.toFixed(2)} m，总投料 {calculateDigitalCosts.totalMeters.toFixed(2)} m</div>
                  <div><strong>投料面积：</strong>{calculateDigitalCosts.feedAreaSqm.toFixed(2)} ㎡</div>
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
                    <div className="text-sm text-muted-foreground">材料成本/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.materialCostPerUnit.toFixed(4)} 元</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">印刷成本/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.printCostPerUnit.toFixed(4)} 元</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">特殊工艺成本/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.specialProcessCostPerUnit.toFixed(4)} 元</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">附件成本/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.accessoryCostPerUnit.toFixed(4)} 元</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">基础成本/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.baseCostPerUnit.toFixed(4)} 元</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">固定费用分摊/个</div>
                    <div className="text-xl font-semibold">{calculateDigitalCosts.fixedCostPerUnit.toFixed(4)} 元</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">税率</div>
                    <div className="text-xl font-semibold">{taxRate}%</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <div className="text-sm text-muted-foreground">汇率</div>
                    <div className="text-xl font-semibold">{toNum(String(exchangeRate)).toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-primary text-primary-foreground rounded-lg">
                  <div>
                    <div className="text-sm opacity-80">单价（含税）</div>
                    <div className="text-3xl font-bold">¥{calculateDigitalCosts.finalCostPerUnit.toFixed(4)}/个</div>
                    <div className="text-sm opacity-80 mt-1">
                      ${(calculateDigitalCosts.finalCostPerUnit / (toNum(String(exchangeRate)) || 1)).toFixed(4)}/个
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-80">总价（{(toNum(String(quantity)) * toNum(String(skuCount))).toLocaleString()} 个 + 固定费用）</div>
                    <div className="text-3xl font-bold">¥{calculateDigitalCosts.totalCostCNY.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-sm opacity-80 mt-1">
                      ${calculateDigitalCosts.totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {calculateDigitalCosts.fixedCosts > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <strong>固定费用明细：</strong>模具费 {toNum(String(moldCost)).toFixed(2)} 元 + 特殊工艺版费 {toNum(String(specialProcessPlateCost)).toFixed(2)} 元 = {calculateDigitalCosts.fixedCosts.toFixed(2)} 元
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full gap-2 py-6 text-lg" 
              data-testid="button-generate"
            >
              生成报价
            </Button>
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
                      value={numStr(dimensions[dim as keyof typeof dimensions])}
                      onChange={(e) =>
                        setDimensions({ ...dimensions, [dim]: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      data-testid={`input-${dim}`}
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">数量 (个)</Label>
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">材料层结构（{materialLayers.length}层，自动{Math.max(0, materialLayers.length - 1)}次复合）</CardTitle>
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
                <CardTitle className="text-lg">复合工艺（自动{laminationSteps.length}次复合）</CardTitle>
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

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">附加工艺（可多选）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config.postProcessingOptions
                  .filter((opt) => opt.enabled)
                  .map((option) => {
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
              {config.postProcessingOptions
                .filter(opt => opt.enabled && opt.pricingType === "specSelection" && selectedPostProcessing[opt.id])
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
                  <span className="font-semibold text-lg ml-2">{gravureCosts.plateCost.toFixed(2)} 元</span>
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

            return (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg" data-testid="text-quote-result-title">报价结果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="p-3 rounded-md border" data-testid="card-exfactory">
                      <div className="text-xs font-semibold text-muted-foreground">
                        出厂价（不含版费，含损耗，含利润）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：
                        <span className="font-bold">{f4(gc.exFactoryUnit)} 元/个</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f4(usd(gc.exFactoryUnit))} USD/pc
                        </span>
                      </div>
                      <div className="text-sm">
                        总价：
                        <span className="font-bold">{f2(gc.exFactoryTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f2(usd(gc.exFactoryTotal))} USD
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-md border" data-testid="card-withfreight">
                      <div className="text-xs font-semibold text-muted-foreground">
                        含运价（不含版费，含损耗，含利润，含运费 +3%）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：
                        <span className="font-bold">{f4(gc.withFreightUnit)} 元/个</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f4(usd(gc.withFreightUnit))} USD/pc
                        </span>
                      </div>
                      <div className="text-sm">
                        总价：
                        <span className="font-bold">{f2(gc.withFreightTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f2(usd(gc.withFreightTotal))} USD
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-md border" data-testid="card-withfreighttax">
                      <div className="text-xs font-semibold text-muted-foreground">
                        含运含税价（不含版费，含损耗，含利润，含运费 +3%，含税 +9%）
                      </div>
                      <div className="mt-1 text-sm">
                        单价：
                        <span className="font-bold">{f4(gc.withFreightTaxUnit)} 元/个</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f4(usd(gc.withFreightTaxUnit))} USD/pc
                        </span>
                      </div>
                      <div className="text-sm">
                        总价：
                        <span className="font-bold">{f2(gc.withFreightTaxTotal)} 元</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ≈ {f2(usd(gc.withFreightTaxTotal))} USD
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-md border border-destructive bg-destructive/5" data-testid="card-final-price">
                      <div className="text-xs font-semibold text-destructive">
                        含版费含运含税价（含版费，含损耗，含利润，含运费 +3%，含税 +9%）
                      </div>
                      <div className="mt-1 text-sm text-destructive">
                        单价：
                        <span className="font-bold">{f4(gc.withPlateFreightTaxUnit)} 元/个</span>
                        <span className="ml-1 text-xs opacity-80">
                          ≈ {f4(usd(gc.withPlateFreightTaxUnit))} USD/pc
                        </span>
                      </div>
                      <div className="text-sm text-destructive">
                        总价：
                        <span className="font-bold">{f2(gc.withPlateFreightTaxTotal)} 元</span>
                        <span className="ml-1 text-xs opacity-80">
                          ≈ {f2(usd(gc.withPlateFreightTaxTotal))} USD
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-sm" data-testid="cost-breakdown-grid">
                    <div className="p-3 rounded-md border" data-testid="cost-material">
                      <div className="text-muted-foreground">材料</div>
                      <div className="font-semibold" data-testid="text-cost-material">{f4(gc.materialCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-print">
                      <div className="text-muted-foreground">印刷</div>
                      <div className="font-semibold" data-testid="text-cost-print">{f4(gc.printCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-lamination">
                      <div className="text-muted-foreground">复合</div>
                      <div className="font-semibold" data-testid="text-cost-lamination">{f4(gc.laminationCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-making">
                      <div className="text-muted-foreground">制袋</div>
                      <div className="font-semibold" data-testid="text-cost-making">{f4(gc.makingCostPerUnit)} 元</div>
                    </div>
                    <div className="p-3 rounded-md border" data-testid="cost-postprocess">
                      <div className="text-muted-foreground">后加工</div>
                      <div className="font-semibold" data-testid="text-cost-postprocess">{f4(gc.postProcessingCostPerUnit)} 元</div>
                    </div>
                  </div>

                  <div className="text-xs md:text-sm space-y-2 p-4 bg-muted/30 rounded-lg" data-testid="calculation-detail">
                    <div className="font-medium text-base mb-3">计算明细</div>

                    <div className="font-medium">一、材料成本（合计 {f4(gc.materialCostPerUnit)} 元/个）</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {materialLayers.map((layer, i) => {
                        const material = config.materialLibrary.find(m => m.id === layer.materialId);
                        const materialName = material?.name || "未知材料";

                        const calcDetailCost = (a: number, thick: number, dens: number, prc: number) => {
                          if (dens === 0 || dens === undefined) return a * (thick / 1000) * prc;
                          return a * thick * dens * prc / 1000;
                        };

                        const formatFormula = (a: number, thick: number, dens: number, prc: number, cost: number) => {
                          if (dens === 0 || dens === undefined) {
                            return <>面积 {f4(a)}㎡ × (克重 {thick} ÷ 1000) × 单价 {prc} 元/kg = <b>{f4(cost)} 元</b></>;
                          }
                          return <>面积 {f4(a)}㎡ × 厚度 {thick}μm × 密度 {dens} × 单价 {prc} ÷ 1000 = <b>{f4(cost)} 元</b></>;
                        };

                        if (layer.splice?.enabled && gc.unfoldedWidthMm > 0) {
                          const wMm = Math.max(0, Math.min(layer.splice.windowWidthMm, gc.unfoldedWidthMm));
                          const mainMm = gc.unfoldedWidthMm - wMm;
                          const mainR = mainMm / gc.unfoldedWidthMm;
                          const winR = wMm / gc.unfoldedWidthMm;
                          const mainArea = gc.area * mainR;
                          const winArea = gc.area * winR;
                          const mainCost = calcDetailCost(mainArea, layer.thickness, layer.density, layer.price);
                          const winMat = config.materialLibrary.find(m => m.id === layer.splice!.windowMaterialId);
                          const winName = winMat?.name || "窗口膜";
                          const winCost = calcDetailCost(winArea, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice);
                          return (
                            <li key={i}>
                              第{i + 1}层 {materialName}（开窗拼接）：<br />
                              <span className="ml-4">主材 {materialName}（{Math.round(mainMm)}mm / {Math.round(gc.unfoldedWidthMm)}mm）：{formatFormula(mainArea, layer.thickness, layer.density, layer.price, mainCost)}</span><br />
                              <span className="ml-4">窗口膜 {winName}（{Math.round(wMm)}mm / {Math.round(gc.unfoldedWidthMm)}mm）：{formatFormula(winArea, layer.splice.windowThicknessUm, layer.splice.windowDensity, layer.splice.windowPrice, winCost)}</span><br />
                              <span className="ml-4">合计 = <b>{f4(mainCost + winCost)} 元/个</b></span>
                            </li>
                          );
                        }

                        const cost = calcDetailCost(gc.area, layer.thickness, layer.density, layer.price);
                        const method = (layer.density === 0 || layer.density === undefined) ? "纸类gsm法" : "薄膜法";
                        return (
                          <li key={i}>
                            第{i + 1}层 {materialName}（{method}）：{formatFormula(gc.area, layer.thickness, layer.density, layer.price, cost)}
                          </li>
                        );
                      })}
                    </ul>

                    <div className="font-medium mt-3">二、印刷成本</div>
                    <div className="pl-5">
                      {(() => {
                        const printRule = config.printingPriceRules.find(r => r.coverage === selectedPrintCoverage);
                        const pricePerSqm = printRule?.pricePerSqm || 0;
                        return (
                          <>
                            公式：印刷 = 展开面积 × 覆盖单价<br />
                            代入：{f4(gc.area)} ㎡/个 × {pricePerSqm} 元/㎡ = <b>{f4(gc.printCostPerUnit)} 元/个</b>
                          </>
                        );
                      })()}
                    </div>

                    <div className="font-medium mt-3">三、复合成本</div>
                    <div className="pl-5">
                      {(() => {
                        const stepDetails = laminationSteps.map((step, i) => {
                          const rule = config.laminationPriceRules.find(r => r.id === step.laminationId);
                          return { label: rule?.name || `第${i + 1}步`, price: rule?.pricePerSqm || 0 };
                        });
                        const laminationSum = stepDetails.reduce((s, d) => s + d.price, 0);
                        return (
                          <>
                            公式：复合 = 展开面积 × (各步单价之和)<br />
                            {stepDetails.map((d, i) => (
                              <span key={i}>{i > 0 ? " + " : ""}{d.label} {d.price}元/㎡</span>
                            ))}
                            {" = "}{laminationSum} 元/㎡<br />
                            代入：{f4(gc.area)} ㎡/个 × {laminationSum} = <b>{f4(gc.laminationCostPerUnit)} 元/个</b>
                          </>
                        );
                      })()}
                    </div>

                    <div className="font-medium mt-3">四、制袋成本</div>
                    <div className="pl-5">
                      {selectedBagType?.makingCostFormula ? (
                        <>
                          公式：{selectedBagType.makingCostFormula}<br />
                          代入尺寸：袋宽={toNum(String(dimensions.width)) / 1000}m 袋高={toNum(String(dimensions.height)) / 1000}m
                          {requiredDimensions.includes("bottomInsert") && <> 底插入={toNum(String(dimensions.bottomInsert)) / 1000}m</>}
                          {requiredDimensions.includes("sideExpansion") && <> 侧展开={toNum(String(dimensions.sideExpansion)) / 1000}m</>}
                          {requiredDimensions.includes("backSeal") && <> 背封边={toNum(String(dimensions.backSeal)) / 1000}m</>}
                          <br />
                          结果 = <b>{f4(gc.makingCostPerUnit)} 元/个</b>
                        </>
                      ) : (
                        <>未配置制袋公式，制袋 = <b>0 元/个</b></>
                      )}
                    </div>

                    <div className="font-medium mt-3">五、后加工成本</div>
                    <div className="pl-5">
                      {Object.entries(selectedPostProcessing).filter(([, v]) => v).length === 0 ? (
                        <>未选择后加工，后加工费 = <b>0 元/个</b></>
                      ) : (
                        <ul className="list-disc pl-5 space-y-1">
                          {Object.entries(selectedPostProcessing).filter(([, v]) => v).map(([id]) => {
                            const opt = config.postProcessingOptions.find(o => o.id === id);
                            if (!opt) return null;
                            const _wM = toNum(String(dimensions.width)) / 1000;
                            const _cost = calcPostProcessingCost(opt, _wM, gravureCosts.area, selectedBagType?.id, selectedSpecs[id]);
                            return (
                              <li key={id}>
                                {opt.name}
                                {opt.pricingType === "specSelection" && selectedSpecs[id] && (
                                  <span className="text-muted-foreground"> ({selectedSpecs[id]})</span>
                                )}
                                {opt.pricingType !== "free" && (
                                  <span>：{_cost.toFixed(4)} 元/个</span>
                                )}
                                {opt.pricingType === "free" && (
                                  <span className="text-muted-foreground">（免费）</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      合计后加工 = <b>{f4(gc.postProcessingCostPerUnit)} 元/个</b>
                    </div>

                    <div className="font-medium mt-3 pt-3 border-t">六、单价合计与系数</div>
                    <div className="pl-5 space-y-1">
                      <div data-testid="text-base-cost">
                        基础单价 = 材料 + 印刷 + 复合 + 制袋 + 后加工<br />
                        = {f4(gc.materialCostPerUnit)} + {f4(gc.printCostPerUnit)} + {f4(gc.laminationCostPerUnit)} + {f4(gc.makingCostPerUnit)} + {f4(gc.postProcessingCostPerUnit)} = <b>{f4(gc.baseCostPerUnit)} 元/个</b>
                      </div>
                      <div data-testid="text-waste-coeff">
                        × 损耗系数 {gc.wasteCoefficient.toFixed(2)} = {f4(gc.costWithWaste)} 元/个
                      </div>
                      <div data-testid="text-qty-coeff">
                        × 数量系数 {gc.quantityCoefficient.toFixed(2)} = {f4(gc.costWithQuantity)} 元/个
                      </div>
                      <div data-testid="text-profit-coeff">
                        × 利润系数 {gc.profitMultiplier.toFixed(2)} = <b>{f4(gc.exFactoryUnit)} 元/个</b>（出厂价）
                      </div>
                    </div>

                    <div className="font-medium mt-3 pt-3 border-t">七、版费与上机费</div>
                    <div className="pl-5 space-y-1">
                      <div data-testid="text-plate-cost">
                        版费 = 版长 {plateConfig.plateLength}cm × 版周 {plateConfig.plateCircumference}cm × {plateConfig.colorCount}色 × {plateConfig.pricePerSqcm} 元/cm² = <b>{f2(gc.plateCost)} 元</b>
                      </div>
                      <div data-testid="text-setup-fee">
                        上机费 = {toNum(String(quantity)) >= 10000
                          ? <>数量 ≥ 10,000，免上机费 = <b>0 元</b></>
                          : <>min(200 × {plateConfig.colorCount}色, 1800) = <b>{f2(gc.setupFee)} 元</b></>
                        }
                      </div>
                    </div>

                    <div className="font-medium mt-3 pt-3 border-t">八、最终价格推导</div>
                    <div className="pl-5 space-y-1">
                      <div data-testid="text-exfactory-derivation">出厂单价 = <b>{f4(gc.exFactoryUnit)}</b> 元/个 → 总 {f2(gc.exFactoryTotal)} 元</div>
                      <div data-testid="text-freight-derivation">+ 运费 3% → 含运单价 = {f4(gc.exFactoryUnit)} × 1.03 = <b>{f4(gc.withFreightUnit)}</b> 元/个 → 总 {f2(gc.withFreightTotal)} 元</div>
                      <div data-testid="text-tax-derivation">+ 税 9% → 含运含税单价 = {f4(gc.withFreightUnit)} × 1.09 = <b>{f4(gc.withFreightTaxUnit)}</b> 元/个 → 总 {f2(gc.withFreightTaxTotal)} 元</div>
                      <div data-testid="text-plate-derivation">+ 版费分摊 → 含版费单价 = {f4(gc.withFreightTaxUnit)} + ({f2(gc.plateCost)} + {f2(gc.setupFee)}) / {quantity} = <b>{f4(gc.withPlateFreightTaxUnit)}</b> 元/个</div>
                      <div data-testid="text-final-total">含版费含运含税总价 = <b>{f2(gc.withPlateFreightTaxTotal)} 元</b> ≈ <b>{f2(usd(gc.withPlateFreightTaxTotal))} USD</b></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
