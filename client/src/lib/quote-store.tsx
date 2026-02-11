import { createContext, useContext, useState, type ReactNode } from "react";

export type ProductType = "box" | "pouch" | null;
export type PrintingMethod = "gravure" | "digital" | null;

export type BagType =
  | "standup"
  | "threeSide"
  | "centerSeal"
  | "gusset"
  | "eightSide"
  | "taperBottom"
  | "flatBottom"
  | "threeSideShape"
  | "taperShape"
  | string;

export type MaterialType =
  | "PET"
  | "VMPET"
  | "BOPP"
  | "MOPP"
  | "MPET"
  | "CPP"
  | "VMCPP"
  | "PE"
  | "BOPA"
  | "Kraft"
  | "WhiteKraft"
  | "CottonPaper"
  | "AL"
  | "GoldSandFilm"
  | "TouchOPP"
  | "PLA"
  | "KPA"
  | "AlOxPET_Composite"
  | "AlOxPET_Print"
  | "KPET"
  | "KOP"
  | "LaserPETAl"
  | "Custom";

export type LaminationType = "dry" | "dryRetort" | "solventless";
export type PrintCoverage = 25 | 50 | 100 | 150 | 200 | 300;

export interface CustomBagType {
  id: string;
  name: string;
  formula: string;
  requiredDimensions: string[];
  wasteCoefficient: number;
  makingCostFormula: string;
  makingCoefficient: number;
  makingMinPrice: number;
  isBuiltIn: boolean;
  enabled: boolean;
}

export interface CustomMaterial {
  id: string;
  name: string;
  thickness: number;
  density: number;
  grammage: number;
  price: number;
  notes: string;
}

export type PostProcessingPricingType = 'fixed' | 'perMeterWidth' | 'perArea' | 'perMeterWidthByBagType' | 'free' | 'specSelection';

export interface BagTypePrice {
  bagTypeId: string;
  bagTypeName: string;
  pricePerMeter: number | string;
}

export interface SpecOption {
  specName: string;
  price: number | string;
}

export type PostProcessingCategory = "additionalProcess" | "surfaceTreatment";

export interface PostProcessingOptionConfig {
  id: string;
  name: string;
  enabled: boolean;
  category?: PostProcessingCategory;
  pricingType: PostProcessingPricingType;
  fixedPrice?: number | string;
  pricePerMeter?: number | string;
  pricePerSqm?: number | string;
  fixedAddition?: number | string;
  defaultPricePerMeter?: number | string;
  bagTypePrices?: BagTypePrice[];
  specOptions?: SpecOption[];
  description: string;
}

export interface PrintingPriceRule {
  coverage: number;
  label: string;
  pricePerSqm: number;
}

export interface LaminationPriceRule {
  id: string;
  name: string;
  pricePerSqm: number;
}

export interface PlatePriceConfig {
  defaultPlateLength: number;
  defaultPlateCircumference: number;
  defaultColorCount: number;
  pricePerSqcm: number;
}

export interface QuantityDiscountRule {
  minQuantity: number;
  coefficient: number;
  label: string;
}

export interface GeneratorConfig {
  customBagTypes: CustomBagType[];
  materialLibrary: CustomMaterial[];
  printingPriceRules: PrintingPriceRule[];
  laminationPriceRules: LaminationPriceRule[];
  postProcessingOptions: PostProcessingOptionConfig[];
  platePriceConfig: PlatePriceConfig;
  quantityDiscounts: QuantityDiscountRule[];
}

export interface DigitalMaterial {
  id: string;
  name: string;
  thickness: number;
  density: number;
  price: number;
  squarePrice: number;
  category: "print" | "composite" | "seal";
  notes: string;
}

export interface DigitalPrintMode {
  id: string;
  name: string;
  enabled: boolean;
  coefficient: number;
}

export type DigitalSpecialCalcBasis = "perQuantity" | "perMeter" | "printMultiplier";

export interface DigitalSpecialProcess {
  id: string;
  name: string;
  enabled: boolean;
  unitPrice: number;
  calcBasis: DigitalSpecialCalcBasis;
  minPrice: number;
  notes: string;
}

export interface DigitalZipperType {
  id: string;
  name: string;
  pricePerMeter: number;
  enabled: boolean;
}

export interface DigitalValveType {
  id: string;
  name: string;
  pricePerUnit: number;
  enabled: boolean;
}

export interface DigitalAccessory {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  isStackable: boolean;
}

export interface DigitalPrintingTier {
  maxRevolutions: number;
  pricePerRevolution: number;
  maxMeters?: number;
  pricePerMeter?: number;
  label: string;
}

export interface DigitalSystemConstants {
  maxPrintWidth: number;
  maxPrintCircumference: number;
  materialWidth: number;
  skuWaste: number;
  adjustmentWaste: number;
  idleMaterialMin: number;
}

export interface DigitalGeneratorConfig {
  customBagTypes: CustomBagType[];
  printLayerMaterials: DigitalMaterial[];
  compositeLayerMaterials: DigitalMaterial[];
  sealLayerMaterials: DigitalMaterial[];
  printModes: DigitalPrintMode[];
  specialProcesses: DigitalSpecialProcess[];
  zipperTypes: DigitalZipperType[];
  valveTypes: DigitalValveType[];
  accessories: DigitalAccessory[];
  printingTiers: DigitalPrintingTier[];
  systemConstants: DigitalSystemConstants;
  laminationUnitPrice: number;
  laminationPerMeter: number;
  vatRate: number;
}

export interface QuoteGeneratorOutput {
  name: string;
  productType: ProductType;
  printingMethod: PrintingMethod;
  config: GeneratorConfig;
  digitalConfig?: DigitalGeneratorConfig;
}

export interface QuoteState {
  productType: ProductType;
  printingMethod: PrintingMethod;
  config: GeneratorConfig;
  digitalConfig: DigitalGeneratorConfig;
  generatorOutput: QuoteGeneratorOutput | null;
}

const defaultCustomBagTypes: CustomBagType[] = [
  { id: "standup", name: "自立袋", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.12, makingCostFormula: "0.09 × 袋宽", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "threeSide", name: "三边封", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.10, makingCostFormula: "0.03 × min(袋宽,袋高)", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "centerSeal", name: "中封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal"], wasteCoefficient: 1.10, makingCostFormula: "0.04 × 袋高", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "gusset", name: "风琴袋", formula: "(袋宽 + 侧面展开 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "sideExpansion", "backSeal"], wasteCoefficient: 1.10, makingCostFormula: "0.04 × 袋高", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "taperBottom", name: "锥底袋", formula: "{(袋宽 + 侧面展开) × 2 + 0.02} × (袋高 + 0.01)", requiredDimensions: ["width", "height", "sideExpansion"], wasteCoefficient: 1.12, makingCostFormula: "0.22 × 袋高", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "flatBottom", name: "平底袋", formula: "{(袋宽 + 侧面展开) × 2 + 0.03} × (袋高 + 侧面展开/2 + 0.015)", requiredDimensions: ["width", "height", "sideExpansion"], wasteCoefficient: 1.12, makingCostFormula: "0.25 × 袋高", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "threeSideShape", name: "三边封异形袋", formula: "{袋宽 × 2 + 0.01} × (袋高 + 0.005)", requiredDimensions: ["width", "height"], wasteCoefficient: 1.15, makingCostFormula: "0.03 × min(袋宽,袋高) + 0.009", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "taperShape", name: "自立异形袋", formula: "{(袋高 + 底插入) × 2 + 0.03} × (袋宽 + 0.005)", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.15, makingCostFormula: "0.09 × 袋宽 + 0.018", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "eightSide", name: "八边封", formula: "{(袋宽 + 侧面展开) × 2 + 0.03} × (袋高 + 侧面展开/2 + 0.015)", requiredDimensions: ["width", "height", "sideExpansion"], wasteCoefficient: 1.12, makingCostFormula: "0.25 × 袋高", makingCoefficient: 0, makingMinPrice: 0, isBuiltIn: false, enabled: true },
];

const defaultDigitalBagTypes: CustomBagType[] = [
  { id: "threeSide", name: "三边封", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "threeSideDouble", name: "三边封双放", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "standupNoZip", name: "自立袋（无拉链）", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "standupWithZip", name: "自立袋（有拉链）", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "standupDouble", name: "自立袋双放", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "standupSplitBottom", name: "自立袋分底", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "centerSeal", name: "中封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideGusset"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "sideSeal", name: "侧封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideGusset"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.25, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "gusset", name: "风琴袋", formula: "(袋宽 + 侧面展开 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideExpansion"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 0.4, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "eightSideNoZip", name: "八边封（无拉链）", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 1.8, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "eightSideWithZip", name: "八边封（有拉链）", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset", "sealEdge"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 1.8, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "eightSideDouble", name: "八边封双放", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 1.8, makingMinPrice: 0, isBuiltIn: false, enabled: true },
  { id: "eightSideSplitBottom", name: "八边封分底", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, makingCostFormula: "", makingCoefficient: 1.8, makingMinPrice: 0, isBuiltIn: false, enabled: true },
];

const defaultDigitalPrintLayerMaterials: DigitalMaterial[] = [
  { id: "MOPP25", name: "MOPP25", thickness: 25, density: 0.91, price: 0, squarePrice: 0, category: "print", notes: "八边封袋型不可使用" },
  { id: "哑油MOPP25", name: "哑油MOPP25", thickness: 25, density: 0.91, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "MOPP40", name: "MOPP40", thickness: 40, density: 0.91, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "BOPP25", name: "BOPP25", thickness: 25, density: 0.93, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "BOPP38", name: "BOPP38", thickness: 38, density: 0.93, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "PET12", name: "PET12", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "print", notes: "不建议与VMPET复合，容易产生气泡白点，建议改材料为BOPP" },
  { id: "PET25", name: "PET25", thickness: 25, density: 1.41, price: 0, squarePrice: 0, category: "print", notes: "不建议与VMPET复合，容易产生气泡白点，建议改材料为BOPP" },
  { id: "哑油PET12", name: "哑油PET12", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "print", notes: "不建议与VMPET复合，容易产生气泡白点，建议改材料为BOPP" },
  { id: "哑油MDOPE50", name: "哑油MDOPE50", thickness: 50, density: 0.95, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "NY/BOPA", name: "NY/BOPA", thickness: 15, density: 1.14, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "PE(印刷用)", name: "PE(印刷用)", thickness: 50, density: 0.95, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "哑油PE(印刷用)", name: "哑油PE(印刷用)", thickness: 32, density: 0.95, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "触感膜MOPP", name: "触感膜MOPP", thickness: 27, density: 0.91, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "黄牛皮纸50", name: "黄牛皮纸50", thickness: 50, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "白牛皮纸50", name: "白牛皮纸50", thickness: 50, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "黄牛70", name: "黄牛70", thickness: 70, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "白牛60", name: "白牛60", thickness: 60, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "白牛80", name: "白牛80", thickness: 80, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "黑牛80", name: "黑牛80", thickness: 80, density: 1, price: 0, squarePrice: 0, category: "print", notes: "" },
  { id: "客料", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "print", notes: "" },
];

const defaultDigitalCompositeLayerMaterials: DigitalMaterial[] = [
  { id: "VMPET普通12", name: "VMPET普通12", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "VMPET素面镭射", name: "VMPET素面镭射", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "VMPET/PET阴阳", name: "VMPET/PET阴阳", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "composite", notes: "一半镀铝一半透明" },
  { id: "AL", name: "AL", thickness: 7, density: 2.7, price: 0, squarePrice: 0, category: "composite", notes: "建议在AL前加PET，不建议与印刷层直接复合" },
  { id: "PET", name: "PET", thickness: 12, density: 1.41, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "NY", name: "NY", thickness: 15, density: 1.14, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "黄牛50", name: "黄牛50", thickness: 50, density: 1, price: 0, squarePrice: 0, category: "composite", notes: "表层仅BOPP/MOPP/PET" },
  { id: "白牛50", name: "白牛50", thickness: 50, density: 1, price: 0, squarePrice: 0, category: "composite", notes: "表层仅BOPP/MOPP/PET" },
  { id: "黄牛70", name: "黄牛70", thickness: 70, density: 1, price: 0, squarePrice: 0, category: "composite", notes: "表层仅BOPP/MOPP/PET" },
  { id: "白牛60", name: "白牛60", thickness: 60, density: 1, price: 0, squarePrice: 0, category: "composite", notes: "表层仅BOPP/MOPP/PET" },
  { id: "白牛80", name: "白牛80", thickness: 80, density: 1, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "EVOH PE40", name: "EVOH PE40", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "composite", notes: "厚度不够时使用" },
  { id: "EVOH PE65", name: "EVOH PE65", thickness: 65, density: 0.95, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "CPP30", name: "CPP30", thickness: 30, density: 0.91, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "CPP60", name: "CPP60", thickness: 60, density: 0.91, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "VMCPP25", name: "VMCPP25", thickness: 25, density: 0.91, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "VMPLA", name: "VMPLA", thickness: 15, density: 1.27, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "VMPE40", name: "VMPE40", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "composite", notes: "PE可回收袋使用" },
  { id: "PLA透明高阻隔", name: "PLA透明高阻隔", thickness: 60, density: 1.3, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "MENK镀铝", name: "MENK镀铝", thickness: 20, density: 1.45, price: 0, squarePrice: 0, category: "composite", notes: "表层仅牛皮纸" },
  { id: "PCR PE40", name: "PCR PE40", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "composite", notes: "" },
  { id: "PE40", name: "PE40", thickness: 40, density: 0.93, price: 0, squarePrice: 0, category: "composite", notes: "厚度不够时使用" },
  { id: "奶白PE40", name: "奶白PE40", thickness: 40, density: 0.93, price: 0, squarePrice: 0, category: "composite", notes: "厚度不够时使用" },
  { id: "客料", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "composite", notes: "" },
];

const defaultDigitalSealLayerMaterials: DigitalMaterial[] = [
  { id: "PLA30", name: "PLA30", thickness: 30, density: 1.27, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PLA50", name: "PLA50", thickness: 50, density: 1.27, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PLA60", name: "PLA60", thickness: 60, density: 1.27, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE40", name: "PE40", thickness: 40, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE60", name: "PE60", thickness: 60, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE50", name: "PE50", thickness: 50, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE80", name: "PE80", thickness: 80, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE90", name: "PE90", thickness: 90, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE100", name: "PE100", thickness: 100, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PE120", name: "PE120", thickness: 120, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "EVOH PE50", name: "EVOH PE50", thickness: 50, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "EVOH PE65", name: "EVOH PE65", thickness: 65, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "EVOH PE40", name: "EVOH PE40", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "APE", name: "APE", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白APE", name: "奶白APE", thickness: 40, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "APE50", name: "APE50", thickness: 50, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白APE50", name: "奶白APE50", thickness: 50, density: 0.95, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白PE60", name: "奶白PE60", thickness: 60, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白PE80", name: "奶白PE80", thickness: 80, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白PE40", name: "奶白PE40", thickness: 40, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "奶白PE100", name: "奶白PE100", thickness: 100, density: 0.93, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "CPP30", name: "CPP30", thickness: 30, density: 0.91, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "CPP60", name: "CPP60", thickness: 60, density: 0.91, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "VMCPP25", name: "VMCPP25", thickness: 25, density: 0.91, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "PLA 高阻隔", name: "PLA 高阻隔", thickness: 50, density: 1.3, price: 0, squarePrice: 0, category: "seal", notes: "" },
  { id: "客料", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "seal", notes: "" },
];

const defaultDigitalPrintModes: DigitalPrintMode[] = [
  { id: "none", name: "无印刷", enabled: true, coefficient: 0 },
  { id: "singleBlack", name: "单黑", enabled: true, coefficient: 1 },
  { id: "singleWhite", name: "单白", enabled: true, coefficient: 1 },
  { id: "doubleWhite", name: "双层白", enabled: true, coefficient: 2 },
];

const defaultDigitalSpecialProcesses: DigitalSpecialProcess[] = [
  { id: "doubleSide", name: "双面印刷", enabled: true, unitPrice: 0, calcBasis: "printMultiplier", minPrice: 0, notes: "又称里印" },
  { id: "shapedBag", name: "异形袋", enabled: true, unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "自动增加模具费" },
  { id: "variableCode", name: "可变码", enabled: true, unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "" },
  { id: "uniqueImage", name: "一袋一图", enabled: true, unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "" },
  { id: "stripWindow", name: "条形窗", enabled: true, unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "" },
  { id: "shapedWindow", name: "异形窗", enabled: true, unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "需要额外收取模具费" },
  { id: "digitalUV", name: "数码局部UV", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "digitalFoil", name: "数码烫金/银", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "embossUV", name: "强凸感局部UV", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "laserFoil", name: "镭射烫金/银", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "uvEmbossSmall", name: "普通+强凸感局部UV(UV幅宽<=320)", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "uvEmbossLarge", name: "普通+强凸感局部UV(UV幅宽>=320)", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "uvFoil", name: "局部UV+烫金", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
  { id: "embossLaserFoil", name: "强凸感烫镭射金/银", enabled: true, unitPrice: 0, calcBasis: "perMeter", minPrice: 0, notes: "" },
];

const defaultDigitalZipperTypes: DigitalZipperType[] = [
  { id: "none", name: "无", pricePerMeter: 0, enabled: true },
  { id: "normal", name: "普通拉链", pricePerMeter: 0, enabled: true },
  { id: "easyTear", name: "单边易撕拉链", pricePerMeter: 0, enabled: true },
  { id: "childProof", name: "防儿童拉链", pricePerMeter: 0, enabled: true },
  { id: "pla", name: "PLA拉链", pricePerMeter: 0, enabled: true },
  { id: "ecoEasyTear", name: "可降易撕拉链", pricePerMeter: 0, enabled: true },
  { id: "plaChildProof", name: "PLA防儿童拉链", pricePerMeter: 0, enabled: true },
  { id: "dotted", name: "点状拉链", pricePerMeter: 0, enabled: true },
];

const defaultDigitalValveTypes: DigitalValveType[] = [
  { id: "none", name: "无", pricePerUnit: 0, enabled: true },
  { id: "peValve", name: "PE气阀", pricePerUnit: 0, enabled: true },
  { id: "plaValve", name: "PLA气阀", pricePerUnit: 0, enabled: true },
];

const defaultDigitalAccessories: DigitalAccessory[] = [
  { id: "largeSpout", name: "大吸嘴", price: 0, enabled: true, isStackable: false },
  { id: "smallSpout", name: "小吸嘴", price: 0, enabled: true, isStackable: false },
  { id: "handle", name: "手挽", price: 0, enabled: true, isStackable: true },
  { id: "easyTearCorner", name: "易撕角", price: 0, enabled: true, isStackable: true },
  { id: "handleHook", name: "手提扣", price: 0, enabled: true, isStackable: true },
  { id: "drawstring", name: "束口条", price: 0, enabled: true, isStackable: true },
  { id: "ctpPrint", name: "CTP印刷", price: 0, enabled: true, isStackable: true },
  { id: "laserTear", name: "激光易撕线", price: 0, enabled: true, isStackable: true },
];

const defaultDigitalPrintingTiers: DigitalPrintingTier[] = [
  { maxRevolutions: 500, pricePerRevolution: 0, label: "≤500转" },
  { maxRevolutions: 1000, pricePerRevolution: 0, label: "500-1000转" },
  { maxRevolutions: 2000, pricePerRevolution: 0, label: "1000-2000转" },
  { maxRevolutions: 5000, pricePerRevolution: 0, label: "2000-5000转" },
  { maxRevolutions: Infinity, pricePerRevolution: 0, label: ">5000转" },
];

const defaultDigitalSystemConstants: DigitalSystemConstants = {
  maxPrintWidth: 740,
  maxPrintCircumference: 1120,
  materialWidth: 760,
  skuWaste: 600,
  adjustmentWaste: 100,
  idleMaterialMin: 50,
};

const defaultDigitalConfig: DigitalGeneratorConfig = {
  customBagTypes: defaultDigitalBagTypes,
  printLayerMaterials: defaultDigitalPrintLayerMaterials,
  compositeLayerMaterials: defaultDigitalCompositeLayerMaterials,
  sealLayerMaterials: defaultDigitalSealLayerMaterials,
  printModes: defaultDigitalPrintModes,
  specialProcesses: defaultDigitalSpecialProcesses,
  zipperTypes: defaultDigitalZipperTypes,
  valveTypes: defaultDigitalValveTypes,
  accessories: defaultDigitalAccessories,
  printingTiers: defaultDigitalPrintingTiers,
  systemConstants: defaultDigitalSystemConstants,
  laminationUnitPrice: 0,
  laminationPerMeter: 0,
  vatRate: 13,
};

const defaultMaterialLibrary: CustomMaterial[] = [
  { id: "1", name: "PET", thickness: 12, density: 1.4, grammage: 16.8, price: 0, notes: "" },
  { id: "2", name: "VMPET", thickness: 12, density: 1.4, grammage: 16.8, price: 0, notes: "" },
  { id: "3", name: "BOPP", thickness: 23, density: 0.91, grammage: 20.93, price: 0, notes: "" },
  { id: "4", name: "哑光OPP", thickness: 19, density: 0.86, grammage: 16.34, price: 0, notes: "" },
  { id: "5", name: "哑光PET", thickness: 15, density: 1.4, grammage: 21, price: 0, notes: "" },
  { id: "6", name: "CPP", thickness: 40, density: 0.91, grammage: 36.4, price: 0, notes: "" },
  { id: "7", name: "VMCPP", thickness: 25, density: 0.91, grammage: 22.75, price: 0, notes: "" },
  { id: "8", name: "PE (LDPE)", thickness: 70, density: 0.92, grammage: 64.4, price: 0, notes: "" },
  { id: "9", name: "BOPA", thickness: 15, density: 1.16, grammage: 17.4, price: 0, notes: "" },
  { id: "10", name: "牛皮纸 (gsm)", thickness: 70, density: 0, grammage: 70, price: 0, notes: "纸类，厚度即克重" },
  { id: "11", name: "白牛皮纸 (gsm)", thickness: 70, density: 0, grammage: 70, price: 0, notes: "纸类，厚度即克重" },
  { id: "12", name: "棉纸 (gsm)", thickness: 19, density: 0, grammage: 19, price: 0, notes: "纸类，厚度即克重" },
  { id: "13", name: "AL (纯铝箔)", thickness: 7, density: 2.7, grammage: 18.9, price: 0, notes: "" },
  { id: "14", name: "金砂膜/拉丝膜", thickness: 55, density: 0.56, grammage: 30.8, price: 0, notes: "" },
  { id: "15", name: "触感膜OPP", thickness: 18, density: 0.81, grammage: 14.58, price: 0, notes: "" },
  { id: "16", name: "PLA可降解材料", thickness: 25, density: 1.26, grammage: 31.5, price: 0, notes: "默认25μm，可改为15μm" },
  { id: "17", name: "KPA", thickness: 17, density: 1.2, grammage: 20.4, price: 0, notes: "" },
  { id: "18", name: "氧化铝PET(复合级)", thickness: 12, density: 1.4, grammage: 16.8, price: 0, notes: "" },
  { id: "19", name: "氧化铝PET(印刷级)", thickness: 12, density: 1.4, grammage: 16.8, price: 0, notes: "" },
  { id: "20", name: "KPET", thickness: 14, density: 1.4, grammage: 19.6, price: 0, notes: "" },
  { id: "21", name: "KOP", thickness: 21, density: 0.99, grammage: 20.79, price: 0, notes: "" },
  { id: "22", name: "镭射PET铝", thickness: 12, density: 1.4, grammage: 16.8, price: 0, notes: "" },
];

const defaultPrintingPriceRules: PrintingPriceRule[] = [
  { coverage: 0, label: "0% 覆盖率", pricePerSqm: 0 },
  { coverage: 25, label: "25% 覆盖率", pricePerSqm: 0 },
  { coverage: 50, label: "50% 覆盖率", pricePerSqm: 0 },
  { coverage: 100, label: "100% 覆盖率", pricePerSqm: 0 },
  { coverage: 150, label: "150% 覆盖率", pricePerSqm: 0 },
  { coverage: 200, label: "200% 覆盖率", pricePerSqm: 0 },
  { coverage: 300, label: "300% 覆盖率", pricePerSqm: 0 },
];

const defaultLaminationPriceRules: LaminationPriceRule[] = [
  { id: "dry", name: "干式复合", pricePerSqm: 0 },
  { id: "dryRetort", name: "干式复合（蒸煮型）", pricePerSqm: 0 },
  { id: "solventless", name: "无溶剂复合", pricePerSqm: 0 },
];

const defaultPostProcessingOptions: PostProcessingOptionConfig[] = [
  {
    id: "zipper_normal", name: "普通拉链", enabled: true, category: "additionalProcess", pricingType: "perMeterWidthByBagType",
    defaultPricePerMeter: 0,
    bagTypePrices: [{ bagTypeId: "eightSide", bagTypeName: "八边封", pricePerMeter: 0 }],
    description: "",
  },
  {
    id: "zipper_easyTear", name: "易撕拉链", enabled: true, category: "additionalProcess", pricingType: "perMeterWidthByBagType",
    defaultPricePerMeter: 0,
    bagTypePrices: [{ bagTypeId: "eightSide", bagTypeName: "八边封", pricePerMeter: 0 }],
    description: "",
  },
  {
    id: "zipper_eco", name: "可降解拉链", enabled: true, category: "additionalProcess", pricingType: "perMeterWidth",
    pricePerMeter: 0, description: "",
  },
  {
    id: "punchHole", name: "冲孔", enabled: true, category: "additionalProcess", pricingType: "free", description: "",
  },
  {
    id: "laserTear", name: "激光易撕线", enabled: true, category: "additionalProcess", pricingType: "perMeterWidth",
    pricePerMeter: 0, description: "",
  },
  {
    id: "hotStamp", name: "烫金", enabled: true, category: "surfaceTreatment", pricingType: "perArea",
    pricePerSqm: 0, fixedAddition: 0, description: "",
  },
  {
    id: "wire", name: "加铁丝", enabled: true, category: "additionalProcess", pricingType: "fixed",
    fixedPrice: 0, description: "",
  },
  {
    id: "handle", name: "手提", enabled: true, category: "additionalProcess", pricingType: "fixed",
    fixedPrice: 0, description: "",
  },
  {
    id: "airValve", name: "透气阀", enabled: true, category: "additionalProcess", pricingType: "fixed",
    fixedPrice: 0, description: "",
  },
  {
    id: "emboss", name: "激凸", enabled: true, category: "surfaceTreatment", pricingType: "fixed",
    fixedPrice: 0, description: "",
  },
  {
    id: "windowCut", name: "定点开窗", enabled: true, category: "additionalProcess", pricingType: "fixed",
    fixedPrice: 0, description: "",
  },
  {
    id: "spout", name: "吸嘴（含吸嘴+压费）", enabled: true, category: "additionalProcess", pricingType: "specSelection",
    specOptions: [
      { specName: "8.2mm", price: 0 },
      { specName: "8.6mm", price: 0 },
      { specName: "9.6mm", price: 0 },
      { specName: "10mm", price: 0 },
      { specName: "13mm", price: 0 },
      { specName: "15mm", price: 0 },
      { specName: "16mm 单卡", price: 0 },
      { specName: "16mm 双卡", price: 0 },
      { specName: "20mm", price: 0 },
      { specName: "22mm", price: 0 },
      { specName: "26mm", price: 0 },
      { specName: "33mm", price: 0 },
      { specName: "40mm", price: 0 },
    ],
    description: "",
  },
  {
    id: "matteOil", name: "哑油工艺", enabled: true, category: "surfaceTreatment", pricingType: "perArea",
    pricePerSqm: 0, description: "",
  },
];

const defaultPlatePriceConfig: PlatePriceConfig = {
  defaultPlateLength: 86,
  defaultPlateCircumference: 19,
  defaultColorCount: 3,
  pricePerSqcm: 0,
};

const defaultQuantityDiscounts: QuantityDiscountRule[] = [
  { minQuantity: 100000, coefficient: 1, label: "≥10万 大单" },
  { minQuantity: 50000, coefficient: 1, label: "≥5万 中单" },
  { minQuantity: 30000, coefficient: 1, label: "≥3万 标准" },
  { minQuantity: 20000, coefficient: 1, label: "≥2万 小单" },
  { minQuantity: 10000, coefficient: 1, label: "≥1万 微单" },
  { minQuantity: 0, coefficient: 1, label: "<1万 特殊订单" },
];

const defaultConfig: GeneratorConfig = {
  customBagTypes: defaultCustomBagTypes,
  materialLibrary: defaultMaterialLibrary,
  printingPriceRules: defaultPrintingPriceRules,
  laminationPriceRules: defaultLaminationPriceRules,
  postProcessingOptions: defaultPostProcessingOptions,
  platePriceConfig: defaultPlatePriceConfig,
  quantityDiscounts: defaultQuantityDiscounts,
};

interface QuoteContextType {
  state: QuoteState;
  setProductType: (type: ProductType) => void;
  setPrintingMethod: (method: PrintingMethod) => void;
  setConfig: (config: GeneratorConfig) => void;
  updateConfig: (updates: Partial<GeneratorConfig>) => void;
  setDigitalConfig: (config: DigitalGeneratorConfig) => void;
  updateDigitalConfig: (updates: Partial<DigitalGeneratorConfig>) => void;
  generateOutput: () => QuoteGeneratorOutput;
  resetQuote: () => void;
}

const initialState: QuoteState = {
  productType: null,
  printingMethod: null,
  config: defaultConfig,
  digitalConfig: defaultDigitalConfig,
  generatorOutput: null,
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuoteState>(initialState);

  const setProductType = (type: ProductType) => {
    setState((prev) => ({ ...prev, productType: type }));
  };

  const setPrintingMethod = (method: PrintingMethod) => {
    setState((prev) => ({ ...prev, printingMethod: method }));
  };

  const setConfig = (config: GeneratorConfig) => {
    setState((prev) => ({ ...prev, config }));
  };

  const updateConfig = (updates: Partial<GeneratorConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  };

  const setDigitalConfig = (digitalConfig: DigitalGeneratorConfig) => {
    setState((prev) => ({ ...prev, digitalConfig }));
  };

  const updateDigitalConfig = (updates: Partial<DigitalGeneratorConfig>) => {
    setState((prev) => ({
      ...prev,
      digitalConfig: { ...prev.digitalConfig, ...updates },
    }));
  };

  const generateOutput = (): QuoteGeneratorOutput => {
    const output: QuoteGeneratorOutput = {
      name: `${state.productType === "pouch" ? "包装袋" : "礼盒"}-${state.printingMethod === "gravure" ? "凹版" : "数码"}报价器`,
      productType: state.productType,
      printingMethod: state.printingMethod,
      config: state.config,
      digitalConfig: state.printingMethod === "digital" ? state.digitalConfig : undefined,
    };
    setState((prev) => ({ ...prev, generatorOutput: output }));
    return output;
  };

  const resetQuote = () => {
    setState(initialState);
  };

  return (
    <QuoteContext.Provider
      value={{
        state,
        setProductType,
        setPrintingMethod,
        setConfig,
        updateConfig,
        setDigitalConfig,
        updateDigitalConfig,
        generateOutput,
        resetQuote,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const context = useContext(QuoteContext);
  if (context === undefined) {
    throw new Error("useQuote must be used within a QuoteProvider");
  }
  return context;
}

export function isValidBagFormula(formula: string): boolean {
  if (!formula || !formula.trim()) return false;
  const dimKeywords = ["袋宽", "袋高", "底插入", "底部插入", "底插", "侧面展开", "背封边", "侧琴", "封边"];
  const hasDim = dimKeywords.some(k => formula.includes(k));
  const hasOperator = /[×*÷/+\-]/.test(formula);
  const hasNumber = /\d/.test(formula);
  return hasDim && hasOperator && hasNumber;
}

export function isValidMakingFormula(formula: string): boolean {
  if (!formula || !formula.trim()) return false;
  const hasFormulaPattern = /[\d.]+\s*[×*]\s*[\u4e00-\u9fff(]/.test(formula) || (/min|max/i.test(formula) && /[\d.]/.test(formula));
  if (!hasFormulaPattern) return false;
  const cleaned = formula
    .replace(/min|max/gi, "")
    .replace(/袋宽|袋高|底插入|底琴|侧面展开|侧琴|背封边/g, "")
    .replace(/[\d.\s+\-×*÷/(),，()]+/g, "");
  return cleaned.length === 0;
}

export function safeEvalMakingFormula(formula: string, dims: { width: number; height: number; bottomInsert: number; sideExpansion: number; backSeal: number }): number {
  try {
    let expr = formula
      .replace(/min\(袋宽[,，]袋高\)/gi, String(Math.min(dims.width, dims.height)))
      .replace(/min\(袋高[,，]袋宽\)/gi, String(Math.min(dims.width, dims.height)))
      .replace(/max\(袋宽[,，]袋高\)/gi, String(Math.max(dims.width, dims.height)))
      .replace(/max\(袋高[,，]袋宽\)/gi, String(Math.max(dims.width, dims.height)))
      .replace(/袋宽/g, String(dims.width))
      .replace(/袋高/g, String(dims.height))
      .replace(/底插入|底琴/g, String(dims.bottomInsert))
      .replace(/侧面展开|侧琴/g, String(dims.sideExpansion))
      .replace(/背封边/g, String(dims.backSeal))
      .replace(/×/g, '*')
      .replace(/÷/g, '/');
    const allowedChars = /^[\d\s+\-*/().]+$/;
    if (!allowedChars.test(expr)) return 0;
    const tokens: Array<{ type: "num"; value: number } | { type: "op"; value: string } | { type: "paren"; value: string }> = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let num = "";
        while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
        const val = parseFloat(num);
        if (isNaN(val)) return 0;
        tokens.push({ type: "num", value: val });
        continue;
      }
      if ("+-*/".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
      if ("()".includes(ch)) { tokens.push({ type: "paren", value: ch }); i++; continue; }
      return 0;
    }
    const pos = { i: 0 };
    function pExpr(): number | null {
      let left = pTerm();
      if (left === null) return null;
      while (pos.i < tokens.length && tokens[pos.i].type === "op" && (tokens[pos.i].value === "+" || tokens[pos.i].value === "-")) {
        const op = tokens[pos.i].value; pos.i++;
        const right = pTerm();
        if (right === null) return null;
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function pTerm(): number | null {
      let left = pFactor();
      if (left === null) return null;
      while (pos.i < tokens.length && tokens[pos.i].type === "op" && (tokens[pos.i].value === "*" || tokens[pos.i].value === "/")) {
        const op = tokens[pos.i].value; pos.i++;
        const right = pFactor();
        if (right === null) return null;
        left = op === "*" ? left * right : (right !== 0 ? left / right : 0);
      }
      return left;
    }
    function pFactor(): number | null {
      if (pos.i >= tokens.length) return null;
      const t = tokens[pos.i];
      if (t.type === "num") { pos.i++; return t.value; }
      if (t.type === "paren" && t.value === "(") {
        pos.i++;
        const val = pExpr();
        if (val === null) return null;
        if (pos.i >= tokens.length || tokens[pos.i].type !== "paren" || tokens[pos.i].value !== ")") return null;
        pos.i++;
        return val;
      }
      return null;
    }
    const result = pExpr();
    if (result === null || pos.i !== tokens.length) return 0;
    return isFinite(result) && result >= 0 ? result : 0;
  } catch {
    return 0;
  }
}

export function parseDimensionsFromFormula(formula: string): string[] {
  const dimensionMap: Record<string, string> = {
    "袋宽": "width",
    "袋高": "height",
    "底插入": "bottomInsert",
    "底部插入": "bottomInsert",
    "底插": "bottomInsert",
    "侧面展开": "sideExpansion",
    "背封边": "backSeal",
    "侧琴": "sideGusset",
    "封边": "sealEdge",
    "面积系数": "areaCoefficient",
    "数量单位": "quantityUnit",
  };
  
  const dimensions: string[] = [];
  for (const [chinese, english] of Object.entries(dimensionMap)) {
    if (formula.includes(chinese) && !dimensions.includes(english)) {
      dimensions.push(english);
    }
  }
  return dimensions;
}
