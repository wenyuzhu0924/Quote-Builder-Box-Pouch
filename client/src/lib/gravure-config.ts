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
  PET: { name: "PET", nameZh: "PET", density: 1.4, defaultThickness: 12, defaultPrice: 0 },
  VMPET: { name: "VMPET", nameZh: "镀铝PET", density: 1.4, defaultThickness: 12, defaultPrice: 0 },
  BOPP: { name: "BOPP", nameZh: "BOPP", density: 0.91, defaultThickness: 23, defaultPrice: 0 },
  MOPP: { name: "MOPP", nameZh: "哑光OPP", density: 0.86, defaultThickness: 19, defaultPrice: 0 },
  MPET: { name: "MPET", nameZh: "哑光PET", density: 1.4, defaultThickness: 15, defaultPrice: 0 },
  CPP: { name: "CPP", nameZh: "CPP", density: 0.91, defaultThickness: 40, defaultPrice: 0 },
  VMCPP: { name: "VMCPP", nameZh: "镀铝CPP", density: 0.91, defaultThickness: 25, defaultPrice: 0 },
  PE: { name: "PE", nameZh: "PE(LDPE)", density: 0.92, defaultThickness: 70, defaultPrice: 0 },
  BOPA: { name: "BOPA", nameZh: "BOPA尼龙", density: 1.16, defaultThickness: 15, defaultPrice: 0 },
  Kraft: { name: "Kraft", nameZh: "牛皮纸", density: 0, defaultThickness: 70, defaultPrice: 0, isGsm: true },
  WhiteKraft: { name: "WhiteKraft", nameZh: "白牛皮纸", density: 0, defaultThickness: 70, defaultPrice: 0, isGsm: true },
  CottonPaper: { name: "CottonPaper", nameZh: "棉纸", density: 0, defaultThickness: 19, defaultPrice: 0, isGsm: true },
  AL: { name: "AL", nameZh: "纯铝箔", density: 2.7, defaultThickness: 7, defaultPrice: 0 },
  GoldSandFilm: { name: "GoldSandFilm", nameZh: "金砂膜/拉丝膜", density: 0.56, defaultThickness: 55, defaultPrice: 0 },
  TouchOPP: { name: "TouchOPP", nameZh: "触感膜OPP", density: 0.81, defaultThickness: 18, defaultPrice: 0 },
  PLA: { name: "PLA", nameZh: "PLA可降解", density: 1.26, defaultThickness: 25, defaultPrice: 0 },
  KPA: { name: "KPA", nameZh: "KPA", density: 1.2, defaultThickness: 17, defaultPrice: 0 },
  AlOxPET_Composite: { name: "AlOxPET_Composite", nameZh: "氧化铝PET(复合级)", density: 1.4, defaultThickness: 12, defaultPrice: 0 },
  AlOxPET_Print: { name: "AlOxPET_Print", nameZh: "氧化铝PET(印刷级)", density: 1.4, defaultThickness: 12, defaultPrice: 0 },
  KPET: { name: "KPET", nameZh: "KPET", density: 1.4, defaultThickness: 14, defaultPrice: 0 },
  KOP: { name: "KOP", nameZh: "KOP", density: 0.99, defaultThickness: 21, defaultPrice: 0 },
  LaserPETAl: { name: "LaserPETAl", nameZh: "镭射PET铝", density: 1.4, defaultThickness: 12, defaultPrice: 0 },
  Custom: { name: "Custom", nameZh: "自定义", density: 1.0, defaultThickness: 50, defaultPrice: 0 },
};

export const BAG_TYPES: Record<BagType, BagTypeConfig> = {
  standup: {
    name: "standup",
    nameZh: "站立袋/自立拉链袋",
    description: "拉链费用不在制袋费中，走附加工艺",
    requiredDimensions: ["width", "height", "bottomInsert"],
    wasteCoefficient: 1.12,
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
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
    wasteFee: 0,
    bagMakingRate: 0,
    bagMakingUnit: "width",
    bagMakingFormula: "(0.09 × 袋宽(m)) + 0.018",
    areaFormula: "{ (高 + 底插入)×2 + 0.03 } × (宽 + 0.005)",
  },
};

export const PRINT_COVERAGE: Record<PrintCoverage, { label: string; labelShort: string; price: number; description: string }> = {
  25: { label: "25% - 少量印刷", labelShort: "25%", price: 0, description: "少量印刷" },
  50: { label: "50% - 中等覆盖", labelShort: "50%", price: 0, description: "中等覆盖" },
  100: { label: "100% - 满版印刷", labelShort: "100%", price: 0, description: "满版印刷" },
  150: { label: "150% - 满版+底色", labelShort: "150%", price: 0, description: "满版 + 底色" },
  200: { label: "200% - 白底+镀铝", labelShort: "200%", price: 0, description: "白底 + 镀铝印刷" },
  300: { label: "300% - 含哑油", labelShort: "300%", price: 0, description: "含哑油印刷" },
};

export const LAMINATION_TYPES: Record<LaminationType, { label: string; price: number; description: string }> = {
  dry: { label: "干式复合", price: 0, description: "普通结构" },
  dryRetort: { label: "干式复合（蒸煮型）", price: 0, description: "高温、杀菌级" },
  solventless: { label: "无溶剂复合", price: 0, description: "仅适用于简单结构，不可用于蒸煮/镀铝膜" },
};

export const THREE_SIDE_ROW_RATES = {
  1: { rate: 0, label: "单排", dieCutFee: 0 },
  2: { rate: 0, label: "双排", dieCutFee: 0 },
  3: { rate: 0, label: "三排", dieCutFee: 0 },
};

export const QUANTITY_DISCOUNTS = [
  { min: 100000, coefficient: 1.00, label: "≥10万 大单" },
  { min: 50000, coefficient: 1.00, label: "≥5万 中单" },
  { min: 30000, coefficient: 1.00, label: "≥3万 标准" },
  { min: 20000, coefficient: 1.00, label: "≥2万 小单" },
  { min: 10000, coefficient: 1.00, label: "≥1万 微单" },
  { min: 0, coefficient: 1.00, label: "<1万 特殊订单" },
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
      { value: "normal", label: "普通拉链", priceFormula: "按袋宽计算" },
      { value: "easyTear", label: "易撕拉链", priceFormula: "按袋宽计算" },
      { value: "eco", label: "可降解拉链", priceFormula: "按袋宽计算" },
    ],
    applicableBagTypes: ["standup", "eightSide", "taperShape"],
  },
  { id: "punchHole", nameZh: "冲孔", priceFormula: "标配免费" },
  { id: "laserTear", nameZh: "激光易撕线", priceFormula: "按袋宽计算" },
  { id: "hotStamp", nameZh: "烫金", priceFormula: "按烫金面积计算" },
  { id: "wire", nameZh: "加铁丝", priceFormula: "按袋宽计算" },
  { id: "handle", nameZh: "手提", priceFormula: "按个计算" },
  { id: "airValve", nameZh: "透气阀", priceFormula: "按个计算" },
  { id: "emboss", nameZh: "激凸", priceFormula: "按次计算" },
  { id: "windowCut", nameZh: "定点开窗", priceFormula: "按个计算" },
  { id: "matteOil", nameZh: "哑油工艺", priceFormula: "按展开面积计算" },
];

export const SPOUT_PRICES: Record<string, number> = {
  "8.2mm": 0,
  "8.6mm": 0,
  "9.6mm": 0,
  "10mm": 0,
  "13mm": 0,
  "15mm": 0,
  "16mm单卡": 0,
  "16mm双卡": 0,
  "20mm": 0,
  "22mm": 0,
  "26mm": 0,
  "33mm": 0,
  "40mm": 0,
};

export const ZIPPER_PRICES = {
  normal: { standup: 0, eightSide: 0 },
  easyTear: { standup: 0, eightSide: 0 },
  eco: { standup: 0, eightSide: 0 },
};

export const DEFAULT_PLATE_CONFIG = {
  plateLength: 86,
  plateCircumference: 19,
  colorCount: 3,
  unitPrice: 0,
};

export const SETUP_FEE_PER_COLOR = 0;
export const MAX_SETUP_FEE = 0;
export const SETUP_FEE_THRESHOLD = 10000;

export const SLITTING_PRICE = 0;

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
