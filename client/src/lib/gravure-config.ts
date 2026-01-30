import type { MaterialType, BagType, PrintCoverage, LaminationType } from "./quote-store";

export interface MaterialConfig {
  name: string;
  nameZh: string;
  density: number;
  defaultThickness: number;
  defaultPrice: number;
  isGsm?: boolean;
}

export interface BagTypeConfig {
  name: string;
  nameZh: string;
  description: string;
  requiredDimensions: string[];
  wasteCoefficient: number;
  wasteFee: number;
  bagMakingRate: number;
  bagMakingUnit: string;
  bagMakingFormula: string;
  areaFormula: string;
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  PET: { name: "PET", nameZh: "PET", density: 1.4, defaultThickness: 12, defaultPrice: 8 },
  VMPET: { name: "VMPET", nameZh: "镀铝PET", density: 1.4, defaultThickness: 12, defaultPrice: 9 },
  BOPP: { name: "BOPP", nameZh: "BOPP", density: 0.91, defaultThickness: 23, defaultPrice: 8.8 },
  MOPP: { name: "MOPP", nameZh: "哑光OPP", density: 0.86, defaultThickness: 19, defaultPrice: 9 },
  MPET: { name: "MPET", nameZh: "哑光PET", density: 1.4, defaultThickness: 15, defaultPrice: 12.5 },
  CPP: { name: "CPP", nameZh: "CPP", density: 0.91, defaultThickness: 40, defaultPrice: 9 },
  VMCPP: { name: "VMCPP", nameZh: "镀铝CPP", density: 0.91, defaultThickness: 25, defaultPrice: 11 },
  PE: { name: "PE", nameZh: "PE(LDPE)", density: 0.92, defaultThickness: 70, defaultPrice: 9.5 },
  BOPA: { name: "BOPA", nameZh: "BOPA尼龙", density: 1.16, defaultThickness: 15, defaultPrice: 17 },
  Kraft: { name: "Kraft", nameZh: "牛皮纸", density: 0, defaultThickness: 70, defaultPrice: 7, isGsm: true },
  WhiteKraft: { name: "WhiteKraft", nameZh: "白牛皮纸", density: 0, defaultThickness: 70, defaultPrice: 8, isGsm: true },
  CottonPaper: { name: "CottonPaper", nameZh: "棉纸", density: 0, defaultThickness: 19, defaultPrice: 11, isGsm: true },
  AL: { name: "AL", nameZh: "纯铝箔", density: 2.7, defaultThickness: 7, defaultPrice: 26 },
  GoldSandFilm: { name: "GoldSandFilm", nameZh: "金砂膜/拉丝膜", density: 0.56, defaultThickness: 55, defaultPrice: 11.5 },
  TouchOPP: { name: "TouchOPP", nameZh: "触感膜OPP", density: 0.81, defaultThickness: 18, defaultPrice: 42 },
  PLA: { name: "PLA", nameZh: "PLA可降解", density: 1.26, defaultThickness: 25, defaultPrice: 48 },
  KPA: { name: "KPA", nameZh: "KPA", density: 1.2, defaultThickness: 17, defaultPrice: 21 },
  AlOxPET_Composite: { name: "AlOxPET_Composite", nameZh: "氧化铝PET(复合级)", density: 1.4, defaultThickness: 12, defaultPrice: 12 },
  AlOxPET_Print: { name: "AlOxPET_Print", nameZh: "氧化铝PET(印刷级)", density: 1.4, defaultThickness: 12, defaultPrice: 20 },
  KPET: { name: "KPET", nameZh: "KPET", density: 1.4, defaultThickness: 14, defaultPrice: 13 },
  KOP: { name: "KOP", nameZh: "KOP", density: 0.99, defaultThickness: 21, defaultPrice: 14.5 },
  LaserPETAl: { name: "LaserPETAl", nameZh: "镭射PET铝", density: 1.4, defaultThickness: 12, defaultPrice: 23 },
  Custom: { name: "Custom", nameZh: "自定义", density: 1.0, defaultThickness: 50, defaultPrice: 10 },
};

export const BAG_TYPES: Record<BagType, BagTypeConfig> = {
  standup: {
    name: "standup",
    nameZh: "站立袋/自立拉链袋",
    description: "拉链费用不在制袋费中，走附加工艺",
    requiredDimensions: ["width", "height", "bottomInsert"],
    wasteCoefficient: 1.12,
    wasteFee: 600,
    bagMakingRate: 0.09,
    bagMakingUnit: "width",
    bagMakingFormula: "0.09 × 袋宽(m)",
    areaFormula: "宽 × (高 + 底插入) × 2",
  },
  threeSide: {
    name: "threeSide",
    nameZh: "三边封袋",
    description: "制袋费与排数相关（单/双/三排）",
    requiredDimensions: ["width", "height"],
    wasteCoefficient: 1.10,
    wasteFee: 150,
    bagMakingRate: 0.045,
    bagMakingUnit: "shortSide",
    bagMakingFormula: "单排0.045/双排0.03/三排0.0225 × 短边(m)",
    areaFormula: "宽 × 高 × 2",
  },
  centerSeal: {
    name: "centerSeal",
    nameZh: "中封袋",
    description: "背封边单位：mm（默认10mm）",
    requiredDimensions: ["width", "height", "backSeal"],
    wasteCoefficient: 1.10,
    wasteFee: 150,
    bagMakingRate: 0.04,
    bagMakingUnit: "height",
    bagMakingFormula: "0.04 × 袋高(m)",
    areaFormula: "(宽 + 背封边) × 2 × 高",
  },
  gusset: {
    name: "gusset",
    nameZh: "风琴袋",
    description: "侧面展开+背封边均为mm",
    requiredDimensions: ["width", "height", "sideExpansion", "backSeal"],
    wasteCoefficient: 1.10,
    wasteFee: 150,
    bagMakingRate: 0.04,
    bagMakingUnit: "height",
    bagMakingFormula: "0.04 × 袋高(m)",
    areaFormula: "(宽 + 侧面展开 + 背封边) × 2 × 高",
  },
  eightSide: {
    name: "eightSide",
    nameZh: "八边封袋",
    description: "支持侧边不同材质/工艺模式",
    requiredDimensions: ["width", "height", "sideExpansion"],
    wasteCoefficient: 1.15,
    wasteFee: 2500,
    bagMakingRate: 0.28,
    bagMakingUnit: "width",
    bagMakingFormula: "0.28 × 袋宽(m)",
    areaFormula: "正背底面积 + 两个侧面面积（拆分计算）",
  },
  taperBottom: {
    name: "taperBottom",
    nameZh: "尖底袋",
    description: "公式中的0.02/0.01单位：m",
    requiredDimensions: ["width", "height", "sideExpansion"],
    wasteCoefficient: 1.12,
    wasteFee: 600,
    bagMakingRate: 0.22,
    bagMakingUnit: "height",
    bagMakingFormula: "0.22 × 袋高(m)",
    areaFormula: "{ (宽 + 侧面展开) × 2 + 0.02 } × (高 + 0.01)",
  },
  flatBottom: {
    name: "flatBottom",
    nameZh: "方底袋",
    description: "常用于方底结构",
    requiredDimensions: ["width", "height", "sideExpansion"],
    wasteCoefficient: 1.12,
    wasteFee: 600,
    bagMakingRate: 0.25,
    bagMakingUnit: "height",
    bagMakingFormula: "0.25 × 袋高(m)",
    areaFormula: "{ (宽 + 侧面展开) × 2 + 0.03 } × (高 + 侧面展开/2 + 0.015)",
  },
  threeSideShape: {
    name: "threeSideShape",
    nameZh: "三边封异形袋",
    description: "公式中的0.01/0.005单位：m",
    requiredDimensions: ["width", "height"],
    wasteCoefficient: 1.15,
    wasteFee: 2000,
    bagMakingRate: 0.045,
    bagMakingUnit: "shortSide",
    bagMakingFormula: "(按三边封系数 × 短边) + 模切费",
    areaFormula: "(宽×2 + 0.01) × (高 + 0.005)",
  },
  taperShape: {
    name: "taperShape",
    nameZh: "自立（拉链）异形袋",
    description: "拉链费用走附加工艺；另有模切费",
    requiredDimensions: ["width", "height", "bottomInsert"],
    wasteCoefficient: 1.15,
    wasteFee: 2500,
    bagMakingRate: 0.09,
    bagMakingUnit: "width",
    bagMakingFormula: "(0.09 × 袋宽(m)) + 0.018",
    areaFormula: "{ (高 + 底插入)×2 + 0.03 } × (宽 + 0.005)",
  },
  rollFilm: {
    name: "rollFilm",
    nameZh: "卷膜",
    description: "按kg计价：材料+印刷+复合+分切",
    requiredDimensions: ["width"],
    wasteCoefficient: 1.10,
    wasteFee: 150,
    bagMakingRate: 0.05,
    bagMakingUnit: "area",
    bagMakingFormula: "0.05元/㎡（分切费）",
    areaFormula: "按kg计价，不按袋展开面积",
  },
};

export const PRINT_COVERAGE: Record<PrintCoverage, { label: string; labelShort: string; price: number; description: string }> = {
  25: { label: "25% - 少量印刷", labelShort: "25%", price: 0.11, description: "少量印刷" },
  50: { label: "50% - 中等覆盖", labelShort: "50%", price: 0.13, description: "中等覆盖" },
  100: { label: "100% - 满版印刷", labelShort: "100%", price: 0.16, description: "满版印刷" },
  150: { label: "150% - 满版+底色", labelShort: "150%", price: 0.21, description: "满版 + 底色" },
  200: { label: "200% - 白底+镀铝", labelShort: "200%", price: 0.26, description: "白底 + 镀铝印刷" },
  300: { label: "300% - 含哑油", labelShort: "300%", price: 0.36, description: "含哑油印刷" },
};

export const LAMINATION_TYPES: Record<LaminationType, { label: string; price: number; description: string }> = {
  dry: { label: "干式复合", price: 0.13, description: "普通结构" },
  dryRetort: { label: "干式复合（蒸煮型）", price: 0.18, description: "高温、杀菌级" },
  solventless: { label: "无溶剂复合", price: 0.065, description: "仅适用于简单结构，不可用于蒸煮/镀铝膜" },
};

export const THREE_SIDE_ROW_RATES = {
  1: { rate: 0.045, label: "单排", dieCutFee: 0.018 },
  2: { rate: 0.03, label: "双排", dieCutFee: 0.009 },
  3: { rate: 0.0225, label: "三排", dieCutFee: 0.006 },
};

export const QUANTITY_DISCOUNTS = [
  { min: 100000, coefficient: 0.96, label: "≥10万 大单" },
  { min: 50000, coefficient: 0.98, label: "≥5万 中单" },
  { min: 30000, coefficient: 1.00, label: "≥3万 标准" },
  { min: 20000, coefficient: 1.15, label: "≥2万 小单" },
  { min: 10000, coefficient: 1.30, label: "≥1万 微单" },
  { min: 0, coefficient: 1.50, label: "<1万 特殊订单" },
];

export const ROLL_FILM_DISCOUNTS = [
  { min: 1000, coefficient: 0.95, label: "≥1000kg" },
  { min: 500, coefficient: 0.98, label: "≥500kg" },
  { min: 0, coefficient: 1.00, label: "<500kg" },
];

export interface PostProcessingConfig {
  id: string;
  nameZh: string;
  hasSubTypes?: boolean;
  subTypes?: { value: string; label: string; priceFormula: string }[];
  priceFormula?: string;
  applicableBagTypes?: BagType[];
}

export const POST_PROCESSING_OPTIONS: PostProcessingConfig[] = [
  {
    id: "zipper",
    nameZh: "拉链",
    hasSubTypes: true,
    subTypes: [
      { value: "normal", label: "普通拉链", priceFormula: "自立：0.10元/m×袋宽；八边封：0.22元/m×袋宽" },
      { value: "easyTear", label: "易撕拉链", priceFormula: "自立：0.20元/m×袋宽；八边封：0.47元/m×袋宽" },
      { value: "eco", label: "可降解拉链", priceFormula: "自立：0.50元/m×袋宽" },
    ],
    applicableBagTypes: ["standup", "eightSide", "taperShape"],
  },
  { id: "punchHole", nameZh: "冲孔", priceFormula: "0元/个（标配免费）" },
  { id: "laserTear", nameZh: "激光易撕线", priceFormula: "0.2元/m × 袋宽(m)" },
  { id: "hotStamp", nameZh: "烫金", priceFormula: "烫金面积×1.2元/㎡ + 0.02元/次" },
  { id: "wire", nameZh: "加铁丝", priceFormula: "(袋宽+40mm)×0.00013元/mm + 人工费" },
  { id: "handle", nameZh: "手提", priceFormula: "+0.15元/个" },
  { id: "airValve", nameZh: "透气阀", priceFormula: "+0.11元/个" },
  { id: "emboss", nameZh: "激凸", priceFormula: "0.2元/次" },
  { id: "windowCut", nameZh: "定点开窗", priceFormula: "工钱：0.03元/个" },
  { id: "matteOil", nameZh: "哑油工艺", priceFormula: "0.15元/㎡ × 展开面积" },
];

export const SPOUT_PRICES: Record<string, number> = {
  "8.2mm": 0.04,
  "8.6mm": 0.056,
  "9.6mm": 0.10,
  "10mm": 0.08,
  "13mm": 0.12,
  "15mm": 0.125,
  "16mm单卡": 0.145,
  "16mm双卡": 0.16,
  "20mm": 0.24,
  "22mm": 0.24,
  "26mm": 0.29,
  "33mm": 0.34,
  "40mm": 0.80,
};

export const ZIPPER_PRICES = {
  normal: { standup: 0.10, eightSide: 0.22 },
  easyTear: { standup: 0.20, eightSide: 0.47 },
  eco: { standup: 0.50, eightSide: 0 },
};

export const DEFAULT_PLATE_CONFIG = {
  plateLength: 86,
  plateCircumference: 19,
  colorCount: 3,
  unitPrice: 0.11,
};

export const SETUP_FEE_PER_COLOR = 200;
export const MAX_SETUP_FEE = 1800;
export const SETUP_FEE_THRESHOLD = 10000;

export const SLITTING_PRICE = 0.05;

export function getQuantityCoefficient(quantity: number): number {
  for (const tier of QUANTITY_DISCOUNTS) {
    if (quantity >= tier.min) {
      return tier.coefficient;
    }
  }
  return 1.5;
}

export function getRollFilmCoefficient(weight: number): number {
  for (const tier of ROLL_FILM_DISCOUNTS) {
    if (weight >= tier.min) {
      return tier.coefficient;
    }
  }
  return 1.0;
}

export interface DimensionFieldConfig {
  key: string;
  label: string;
  labelEn: string;
  defaultValue: number;
  unit: string;
  tooltip: string;
  isUserInput: boolean;
}

export const DIMENSION_FIELDS: DimensionFieldConfig[] = [
  { key: "width", label: "袋宽", labelEn: "Width", defaultValue: 100, unit: "mm", tooltip: "袋子的宽度", isUserInput: true },
  { key: "height", label: "袋高", labelEn: "Height", defaultValue: 150, unit: "mm", tooltip: "袋子的高度", isUserInput: true },
  { key: "bottomInsert", label: "底插入", labelEn: "Bottom Insert", defaultValue: 40, unit: "mm", tooltip: "站立袋底部插入深度", isUserInput: true },
  { key: "sideExpansion", label: "侧面展开", labelEn: "Side Expansion", defaultValue: 30, unit: "mm", tooltip: "侧面展开宽度", isUserInput: true },
  { key: "backSeal", label: "背封边", labelEn: "Back Seal", defaultValue: 10, unit: "mm", tooltip: "背封边宽度", isUserInput: true },
];
