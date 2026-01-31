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
  | "rollFilm"
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
  isBuiltIn: boolean;
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

export interface PostProcessingOptionConfig {
  id: string;
  name: string;
  enabled: boolean;
  priceFormula: string;
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
}

export interface DigitalSpecialProcess {
  id: string;
  name: string;
  enabled: boolean;
  priceFormula: string;
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
  maxMeters: number;
  pricePerMeter: number;
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

export interface DigitalNoPrintMinPrice {
  bagTypes: string[];
  minPrice: number;
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
  noPrintMinPrices: DigitalNoPrintMinPrice[];
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
  { id: "standup", name: "自立袋", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.1, isBuiltIn: true },
  { id: "threeSide", name: "三边封", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.1, isBuiltIn: true },
  { id: "centerSeal", name: "中封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal"], wasteCoefficient: 1.1, isBuiltIn: true },
  { id: "gusset", name: "风琴袋", formula: "(袋宽 + 侧面展开 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "sideExpansion", "backSeal"], wasteCoefficient: 1.1, isBuiltIn: true },
  { id: "eightSide", name: "八边封袋", formula: "袋宽 × 袋高 × 2 + 侧面展开 × 袋高 × 2", requiredDimensions: ["width", "height", "sideExpansion"], wasteCoefficient: 1.1, isBuiltIn: true },
];

const defaultDigitalBagTypes: CustomBagType[] = [
  { id: "threeSide", name: "三边封", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "threeSideDouble", name: "三边封双放", formula: "袋宽 × 袋高 × 2", requiredDimensions: ["width", "height"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "standupNoZip", name: "自立袋（无拉链）", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "standupWithZip", name: "自立袋（有拉链）", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "standupDouble", name: "自立袋双放", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "standupSplitBottom", name: "自立袋分底", formula: "袋宽 × (袋高 + 底插入) × 2", requiredDimensions: ["width", "height", "bottomInsert"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "centerSeal", name: "中封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideGusset"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "sideSeal", name: "侧封袋", formula: "(袋宽 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideGusset"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "gusset", name: "风琴袋", formula: "(袋宽 + 侧面展开 + 背封边) × 2 × 袋高", requiredDimensions: ["width", "height", "backSeal", "sideExpansion"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "eightSideNoZip", name: "八边封（无拉链）", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "eightSideWithZip", name: "八边封（有拉链）", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset", "sealEdge"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "eightSideDouble", name: "八边封双放", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "eightSideSplitBottom", name: "八边封分底", formula: "袋宽 × 袋高 × 2 + 底插入 × 袋高 × 2", requiredDimensions: ["width", "height", "bottomInsert", "sideGusset"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "rollFilm", name: "卷膜", formula: "袋宽 × 袋高", requiredDimensions: ["width", "height", "quantityUnit"], wasteCoefficient: 1.0, isBuiltIn: true },
  { id: "shapedBag", name: "异形袋", formula: "袋宽 × 袋高 × 面积系数", requiredDimensions: ["width", "height", "areaCoefficient"], wasteCoefficient: 1.0, isBuiltIn: true },
];

const defaultDigitalPrintLayerMaterials: DigitalMaterial[] = [
  { id: "mopp25", name: "MOPP25", thickness: 25, density: 0.91, price: 18.6, squarePrice: 0.42, category: "print", notes: "" },
  { id: "mopp40", name: "MOPP40", thickness: 40, density: 0.91, price: 20.0, squarePrice: 0.73, category: "print", notes: "" },
  { id: "bopp25", name: "BOPP25", thickness: 25, density: 0.93, price: 15, squarePrice: 0.35, category: "print", notes: "" },
  { id: "bopp38", name: "BOPP38", thickness: 38, density: 0.93, price: 15, squarePrice: 0.53, category: "print", notes: "" },
  { id: "pet12", name: "PET12", thickness: 12, density: 1.41, price: 17, squarePrice: 0.29, category: "print", notes: "不建议与VMPET复合，需要外发干复，容易产生气泡白点，建议改材料为BOPP，相同透明。" },
  { id: "pet25", name: "PET25", thickness: 25, density: 1.41, price: 17, squarePrice: 0.60, category: "print", notes: "" },
  { id: "matpet12", name: "哑油PET12", thickness: 12, density: 1.41, price: 48, squarePrice: 0.81, category: "print", notes: "" },
  { id: "matmdope50", name: "哑油MDOPE50", thickness: 50, density: 0.95, price: 48, squarePrice: 2.28, category: "print", notes: "" },
  { id: "nybopa", name: "NY/BOPA", thickness: 15, density: 1.14, price: 35, squarePrice: 0.60, category: "print", notes: "" },
  { id: "pe_print", name: "PE(印刷用)", thickness: 50, density: 0.95, price: 45, squarePrice: 2.14, category: "print", notes: "" },
  { id: "matpe_print", name: "哑油PE(印刷用)", thickness: 32, density: 0.95, price: 45, squarePrice: 1.37, category: "print", notes: "" },
  { id: "touchmopp", name: "触感膜MOPP", thickness: 27, density: 0.91, price: 60, squarePrice: 1.47, category: "print", notes: "" },
  { id: "yellowkraft50", name: "黄牛皮纸50", thickness: 50, density: 1, price: 20, squarePrice: 1.00, category: "print", notes: "" },
  { id: "whitekraft50", name: "白牛皮纸50", thickness: 50, density: 1, price: 20, squarePrice: 1.00, category: "print", notes: "" },
  { id: "yellowkraft70", name: "黄牛70", thickness: 70, density: 1, price: 20, squarePrice: 1.40, category: "print", notes: "" },
  { id: "whitekraft60", name: "白牛60", thickness: 60, density: 1, price: 20, squarePrice: 1.20, category: "print", notes: "" },
  { id: "whitekraft80", name: "白牛80", thickness: 80, density: 1, price: 20, squarePrice: 1.60, category: "print", notes: "" },
  { id: "blackkraft80", name: "黑牛80", thickness: 80, density: 1, price: 25, squarePrice: 2.00, category: "print", notes: "" },
  { id: "custom_print", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "print", notes: "" },
];

const defaultDigitalCompositeLayerMaterials: DigitalMaterial[] = [
  { id: "vmpet12", name: "VMPET普通12", thickness: 12, density: 1.41, price: 17, squarePrice: 0.29, category: "composite", notes: "" },
  { id: "vmpet_laser", name: "VMPET素面镭射", thickness: 12, density: 1.41, price: 65, squarePrice: 1.10, category: "composite", notes: "" },
  { id: "vmpet_yinyang", name: "VMPET/PET阴阳", thickness: 12, density: 1.41, price: 20, squarePrice: 0.34, category: "composite", notes: "一半镀铝一半透明" },
  { id: "al7", name: "AL", thickness: 7, density: 2.7, price: 40, squarePrice: 0.76, category: "composite", notes: "建议在AL材料前加一层PET，油墨问题不建议与印刷层直接复合" },
  { id: "pet12_comp", name: "PET", thickness: 12, density: 1.41, price: 15, squarePrice: 0.25, category: "composite", notes: "" },
  { id: "ny15", name: "NY", thickness: 15, density: 1.14, price: 35, squarePrice: 0.60, category: "composite", notes: "" },
  { id: "yellowkraft50_comp", name: "黄牛50", thickness: 50, density: 1, price: 20, squarePrice: 1.00, category: "composite", notes: "表层通常为BOPP、MOPP、PET这三种材料" },
  { id: "whitekraft50_comp", name: "白牛50", thickness: 50, density: 1, price: 20, squarePrice: 1.00, category: "composite", notes: "" },
  { id: "yellowkraft70_comp", name: "黄牛70", thickness: 70, density: 1, price: 20, squarePrice: 1.40, category: "composite", notes: "" },
  { id: "whitekraft60_comp", name: "白牛60", thickness: 60, density: 1, price: 20, squarePrice: 1.20, category: "composite", notes: "" },
  { id: "whitekraft80_comp", name: "白牛80", thickness: 80, density: 1, price: 20, squarePrice: 1.60, category: "composite", notes: "" },
  { id: "evohpe40", name: "EVOH PE40", thickness: 40, density: 0.95, price: 45, squarePrice: 1.71, category: "composite", notes: "（厚度不够时使用）" },
  { id: "evohpe65", name: "EVOH PE65", thickness: 65, density: 0.95, price: 45, squarePrice: 2.78, category: "composite", notes: "" },
  { id: "cpp30", name: "CPP30", thickness: 30, density: 0.91, price: 16.5, squarePrice: 0.45, category: "composite", notes: "" },
  { id: "cpp60", name: "CPP60", thickness: 60, density: 0.91, price: 16.5, squarePrice: 0.90, category: "composite", notes: "" },
  { id: "vmcpp25", name: "VMCPP25", thickness: 25, density: 0.91, price: 20, squarePrice: 0.46, category: "composite", notes: "" },
  { id: "vmpla15", name: "VMPLA", thickness: 15, density: 1.27, price: 120, squarePrice: 2.29, category: "composite", notes: "" },
  { id: "vmpe40", name: "VMPE40", thickness: 40, density: 0.95, price: 48, squarePrice: 1.82, category: "composite", notes: "通常为PE可回收袋使用" },
  { id: "pla_barrier", name: "PLA透明高阻隔", thickness: 60, density: 1.3, price: 75, squarePrice: 5.85, category: "composite", notes: "" },
  { id: "menk_al", name: "MENK镀铝", thickness: 20, density: 1.45, price: 260, squarePrice: 7.54, category: "composite", notes: "表层通常为牛皮纸" },
  { id: "pcrpe40", name: "PCR PE40", thickness: 40, density: 0.95, price: 40, squarePrice: 1.52, category: "composite", notes: "" },
  { id: "pe40_comp", name: "PE40", thickness: 40, density: 0.93, price: 16.5, squarePrice: 0.61, category: "composite", notes: "（厚度不够时使用）" },
  { id: "milkpe40", name: "奶白PE40", thickness: 40, density: 0.93, price: 20, squarePrice: 0.74, category: "composite", notes: "（厚度不够时使用）" },
  { id: "custom_comp", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "composite", notes: "" },
];

const defaultDigitalSealLayerMaterials: DigitalMaterial[] = [
  { id: "pla30", name: "PLA30", thickness: 30, density: 1.27, price: 48, squarePrice: 1.83, category: "seal", notes: "" },
  { id: "pla50", name: "PLA50", thickness: 50, density: 1.27, price: 48, squarePrice: 3.05, category: "seal", notes: "" },
  { id: "pla60", name: "PLA60", thickness: 60, density: 1.27, price: 48, squarePrice: 3.66, category: "seal", notes: "" },
  { id: "pe40_seal", name: "PE40", thickness: 40, density: 0.93, price: 16.5, squarePrice: 0.61, category: "seal", notes: "" },
  { id: "pe50", name: "PE50", thickness: 50, density: 0.93, price: 16.5, squarePrice: 0.77, category: "seal", notes: "" },
  { id: "pe60", name: "PE60", thickness: 60, density: 0.93, price: 16.5, squarePrice: 0.92, category: "seal", notes: "" },
  { id: "pe80", name: "PE80", thickness: 80, density: 0.93, price: 16.5, squarePrice: 1.23, category: "seal", notes: "" },
  { id: "pe90", name: "PE90", thickness: 90, density: 0.93, price: 16.5, squarePrice: 1.38, category: "seal", notes: "" },
  { id: "pe100", name: "PE100", thickness: 100, density: 0.93, price: 16.5, squarePrice: 1.53, category: "seal", notes: "" },
  { id: "pe120", name: "PE120", thickness: 120, density: 0.93, price: 16.5, squarePrice: 1.84, category: "seal", notes: "" },
  { id: "evohpe50_seal", name: "EVOH PE50", thickness: 50, density: 0.95, price: 45, squarePrice: 2.14, category: "seal", notes: "" },
  { id: "evohpe65_seal", name: "EVOH PE65", thickness: 65, density: 0.95, price: 45, squarePrice: 2.78, category: "seal", notes: "" },
  { id: "evohpe40_seal", name: "EVOH PE40", thickness: 40, density: 0.95, price: 45, squarePrice: 1.71, category: "seal", notes: "" },
  { id: "ape40", name: "APE 40", thickness: 40, density: 0.95, price: 35, squarePrice: 1.33, category: "seal", notes: "" },
  { id: "milkape40", name: "奶白APE 40", thickness: 40, density: 0.95, price: 40, squarePrice: 1.52, category: "seal", notes: "" },
  { id: "ape50", name: "APE 50", thickness: 50, density: 0.95, price: 35, squarePrice: 1.66, category: "seal", notes: "" },
  { id: "milkape50", name: "奶白APE 50", thickness: 50, density: 0.95, price: 40, squarePrice: 1.90, category: "seal", notes: "" },
  { id: "milkpe60", name: "奶白PE60", thickness: 60, density: 0.93, price: 20, squarePrice: 1.12, category: "seal", notes: "" },
  { id: "milkpe80", name: "奶白PE80", thickness: 80, density: 0.93, price: 20, squarePrice: 1.49, category: "seal", notes: "" },
  { id: "milkpe40_seal", name: "奶白PE40", thickness: 40, density: 0.93, price: 20, squarePrice: 0.74, category: "seal", notes: "" },
  { id: "milkpe100", name: "奶白PE100", thickness: 100, density: 0.93, price: 20, squarePrice: 1.86, category: "seal", notes: "" },
  { id: "cpp30_seal", name: "CPP30", thickness: 30, density: 0.91, price: 16, squarePrice: 0.44, category: "seal", notes: "" },
  { id: "cpp60_seal", name: "CPP60", thickness: 60, density: 0.91, price: 16, squarePrice: 0.87, category: "seal", notes: "" },
  { id: "vmcpp25_seal", name: "VMCPP25", thickness: 25, density: 0.91, price: 20, squarePrice: 0.46, category: "seal", notes: "" },
  { id: "pla_barrier_seal", name: "PLA 高阻隔", thickness: 50, density: 1.3, price: 75, squarePrice: 4.88, category: "seal", notes: "" },
  { id: "custom_seal", name: "客料", thickness: 0, density: 0, price: 0, squarePrice: 0, category: "seal", notes: "" },
];

const defaultDigitalPrintModes: DigitalPrintMode[] = [
  { id: "none", name: "无印刷", enabled: true },
  { id: "singleBlack", name: "单黑", enabled: true },
  { id: "singleWhite", name: "单白", enabled: true },
  { id: "doubleWhite", name: "双层白", enabled: true },
];

const defaultDigitalSpecialProcesses: DigitalSpecialProcess[] = [
  { id: "doubleSide", name: "双面印刷", enabled: true, priceFormula: "印刷费×2", minPrice: 0, notes: "又称里印" },
  { id: "shapedBag", name: "异形袋", enabled: true, priceFormula: "0.05×总数量", minPrice: 0, notes: "自动增加模具费" },
  { id: "variableCode", name: "可变码", enabled: true, priceFormula: "0.05×总数量", minPrice: 300, notes: "" },
  { id: "uniqueImage", name: "一袋一图", enabled: true, priceFormula: "0.05×总数量", minPrice: 300, notes: "" },
  { id: "stripWindow", name: "条形窗", enabled: true, priceFormula: "0.2×总数量", minPrice: 300, notes: "" },
  { id: "shapedWindow", name: "异形窗", enabled: true, priceFormula: "0.2×总数量", minPrice: 800, notes: "需要额外收取模具费" },
  { id: "hotStamp", name: "烫金", enabled: true, priceFormula: "咨询我们，铜版价格需要根据客户设计面积定制铜版，袋子尺寸越大价格越贵", minPrice: 0, notes: "铜版烫金(牛皮纸烫金使用)" },
  { id: "digitalUV", name: "数码局部UV", enabled: true, priceFormula: "1×印刷米数", minPrice: 400, notes: "" },
  { id: "digitalFoil", name: "数码烫金/银", enabled: true, priceFormula: "1.5×印刷米数", minPrice: 600, notes: "" },
  { id: "embossUV", name: "强凸感局部UV", enabled: true, priceFormula: "1.3×印刷米数", minPrice: 400, notes: "" },
  { id: "laserFoil", name: "镭射烫金/银", enabled: true, priceFormula: "2×印刷米数", minPrice: 800, notes: "" },
  { id: "uvEmbossSmall", name: "普通+强凸感局部UV(UV幅宽<=320)", enabled: true, priceFormula: "1.6×印刷米数", minPrice: 600, notes: "" },
  { id: "uvEmbossLarge", name: "普通+强凸感局部UV(UV幅宽>=320)", enabled: true, priceFormula: "2×印刷米数", minPrice: 600, notes: "" },
  { id: "uvFoil", name: "局部UV+烫金", enabled: true, priceFormula: "2×印刷米数", minPrice: 1000, notes: "" },
  { id: "embossLaserFoil", name: "强凸感烫镭射金/银", enabled: true, priceFormula: "2.3×印刷米数", minPrice: 1000, notes: "" },
];

const defaultDigitalZipperTypes: DigitalZipperType[] = [
  { id: "none", name: "无", pricePerMeter: 0, enabled: true },
  { id: "normal", name: "普通拉链", pricePerMeter: 0.2, enabled: true },
  { id: "easyTear", name: "单边易撕拉链", pricePerMeter: 0.35, enabled: true },
  { id: "childProof", name: "防儿童拉链", pricePerMeter: 0.5, enabled: true },
  { id: "pla", name: "PLA拉链", pricePerMeter: 0.85, enabled: true },
  { id: "ecoEasyTear", name: "可降易撕拉链", pricePerMeter: 1.6, enabled: true },
  { id: "plaChildProof", name: "PLA防儿童拉链", pricePerMeter: 3.3, enabled: true },
  { id: "dotted", name: "点状拉链", pricePerMeter: 0.7, enabled: true },
];

const defaultDigitalValveTypes: DigitalValveType[] = [
  { id: "none", name: "无", pricePerUnit: 0, enabled: true },
  { id: "peValve", name: "PE气阀", pricePerUnit: 0.5, enabled: true },
  { id: "plaValve", name: "PLA气阀", pricePerUnit: 1, enabled: true },
];

const defaultDigitalAccessories: DigitalAccessory[] = [
  { id: "largeSpout", name: "大吸嘴", price: 16, enabled: true, isStackable: false },
  { id: "smallSpout", name: "小吸嘴", price: 8.6, enabled: true, isStackable: false },
  { id: "handle", name: "手挽", price: 1, enabled: true, isStackable: true },
  { id: "easyTearCorner", name: "易撕角", price: 0, enabled: true, isStackable: true },
  { id: "handleHook", name: "手提扣", price: 0, enabled: true, isStackable: true },
  { id: "drawstring", name: "束口条", price: 0, enabled: true, isStackable: true },
  { id: "ctpPrint", name: "CTP印刷", price: 0, enabled: true, isStackable: true },
  { id: "laserTear", name: "激光易撕线", price: 0, enabled: true, isStackable: true },
];

const defaultDigitalPrintingTiers: DigitalPrintingTier[] = [
  { maxMeters: 500, pricePerMeter: 6, label: "≤500m" },
  { maxMeters: 1000, pricePerMeter: 5, label: "500m-1000m" },
  { maxMeters: 2000, pricePerMeter: 4.5, label: "1000m-2000m" },
  { maxMeters: 5000, pricePerMeter: 4.25, label: "2000m-5000m" },
  { maxMeters: Infinity, pricePerMeter: 4, label: ">5000m" },
];

const defaultDigitalSystemConstants: DigitalSystemConstants = {
  maxPrintWidth: 740,
  maxPrintCircumference: 1120,
  materialWidth: 760,
  skuWaste: 600,
  adjustmentWaste: 100,
  idleMaterialMin: 50,
};

const defaultDigitalNoPrintMinPrices: DigitalNoPrintMinPrice[] = [
  { bagTypes: ["threeSide", "standupNoZip", "standupWithZip", "centerSeal", "gusset", "shapedBag"], minPrice: 1000 },
  { bagTypes: ["eightSideNoZip", "eightSideWithZip"], minPrice: 3000 },
];

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
  noPrintMinPrices: defaultDigitalNoPrintMinPrices,
  vatRate: 13,
};

const defaultMaterialLibrary: CustomMaterial[] = [
  { id: "1", name: "PET", thickness: 12, density: 1.4, grammage: 16.8, price: 8, notes: "" },
  { id: "2", name: "VMPET", thickness: 12, density: 1.4, grammage: 16.8, price: 9, notes: "" },
  { id: "3", name: "PE (LDPE)", thickness: 90, density: 0.92, grammage: 82.8, price: 9.5, notes: "" },
];

const defaultPrintingPriceRules: PrintingPriceRule[] = [
  { coverage: 25, label: "25% 覆盖率", pricePerSqm: 0.11 },
  { coverage: 50, label: "50% 覆盖率", pricePerSqm: 0.13 },
  { coverage: 100, label: "100% 覆盖率", pricePerSqm: 0.16 },
  { coverage: 150, label: "150% 覆盖率", pricePerSqm: 0.21 },
  { coverage: 200, label: "200% 覆盖率", pricePerSqm: 0.26 },
  { coverage: 300, label: "300% 覆盖率", pricePerSqm: 0.36 },
];

const defaultLaminationPriceRules: LaminationPriceRule[] = [
  { id: "dry", name: "干式复合", pricePerSqm: 0.13 },
  { id: "dryRetort", name: "干式复合（蒸煮型）", pricePerSqm: 0.18 },
  { id: "solventless", name: "无溶剂复合", pricePerSqm: 0.065 },
];

const defaultPostProcessingOptions: PostProcessingOptionConfig[] = [
  { id: "zipper_normal", name: "普通拉链", enabled: true, priceFormula: "仅适用于自立袋/八边封袋；自立袋：0.10 元/米×袋宽；八边封袋：0.22 元/米×袋宽", description: "" },
  { id: "zipper_easyTear", name: "易撕拉链", enabled: true, priceFormula: "仅适用于自立袋/八边封袋；自立袋：0.20 元/米×袋宽；八边封袋：0.47 元/米×袋宽", description: "" },
  { id: "zipper_eco", name: "可降解拉链", enabled: true, priceFormula: "仅适用于自立袋；自立袋：0.50 元/米×袋宽", description: "" },
  { id: "punchHole", name: "冲孔", enabled: true, priceFormula: "包含易撕口与挂孔，0 元/个（标配免费）", description: "" },
  { id: "laserTear", name: "激光易撕线", enabled: true, priceFormula: "0.2 元/米 × 袋宽", description: "" },
  { id: "hotStamp", name: "烫金", enabled: true, priceFormula: "烫金面积×1.2 元/㎡ + 0.02 元/次", description: "" },
  { id: "wire", name: "加铁丝", enabled: true, priceFormula: "铁丝成本=(袋宽+40mm)×0.00013元/mm；贴铁丝人工费：≤140mm=0.024元/个，>140mm=0.026元/个", description: "" },
  { id: "handle", name: "手提", enabled: true, priceFormula: "+0.15 元/个", description: "" },
  { id: "airValve", name: "透气阀", enabled: true, priceFormula: "+0.11 元/个", description: "" },
  { id: "emboss", name: "激凸", enabled: true, priceFormula: "0.2 元/次", description: "" },
  { id: "windowCut", name: "定点开窗", enabled: true, priceFormula: "工钱：0.03 元/个", description: "" },
  { id: "spout", name: "吸嘴（含吸嘴+压费）", enabled: true, priceFormula: "勾选后请选择规格；不同规格单价不同（元/个）", description: "" },
  { id: "matteOil", name: "哑油工艺", enabled: true, priceFormula: "表面哑油处理，按展开面积计价：0.15 元/㎡", description: "" },
];

const defaultPlatePriceConfig: PlatePriceConfig = {
  defaultPlateLength: 86,
  defaultPlateCircumference: 19,
  defaultColorCount: 3,
  pricePerSqcm: 0.11,
};

const defaultQuantityDiscounts: QuantityDiscountRule[] = [
  { minQuantity: 100000, coefficient: 0.96, label: "≥10万 大单" },
  { minQuantity: 50000, coefficient: 0.98, label: "≥5万 中单" },
  { minQuantity: 30000, coefficient: 1.00, label: "≥3万 标准" },
  { minQuantity: 20000, coefficient: 1.15, label: "≥2万 小单" },
  { minQuantity: 10000, coefficient: 1.30, label: "≥1万 微单" },
  { minQuantity: 0, coefficient: 1.50, label: "<1万 特殊订单" },
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
