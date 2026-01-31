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
  | "rollFilm";

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

export interface CustomMaterial {
  id: string;
  name: string;
  category: string;
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
  selectedBagTypes: BagType[];
  materialLibrary: CustomMaterial[];
  printingPriceRules: PrintingPriceRule[];
  laminationPriceRules: LaminationPriceRule[];
  postProcessingOptions: PostProcessingOptionConfig[];
  platePriceConfig: PlatePriceConfig;
  quantityDiscounts: QuantityDiscountRule[];
  materialLayerCount: number;
  laminationStepCount: number;
}

export interface QuoteGeneratorOutput {
  name: string;
  productType: ProductType;
  printingMethod: PrintingMethod;
  config: GeneratorConfig;
}

export interface QuoteState {
  productType: ProductType;
  printingMethod: PrintingMethod;
  config: GeneratorConfig;
  generatorOutput: QuoteGeneratorOutput | null;
}

const defaultMaterialLibrary: CustomMaterial[] = [
  { id: "1", name: "PET", category: "薄膜", thickness: 12, density: 1.4, grammage: 16.8, price: 8, notes: "" },
  { id: "2", name: "VMPET", category: "镀铝膜", thickness: 12, density: 1.4, grammage: 16.8, price: 9, notes: "" },
  { id: "3", name: "PE (LDPE)", category: "热封层", thickness: 90, density: 0.92, grammage: 82.8, price: 9.5, notes: "" },
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
  selectedBagTypes: ["standup", "threeSide", "centerSeal"],
  materialLibrary: defaultMaterialLibrary,
  printingPriceRules: defaultPrintingPriceRules,
  laminationPriceRules: defaultLaminationPriceRules,
  postProcessingOptions: defaultPostProcessingOptions,
  platePriceConfig: defaultPlatePriceConfig,
  quantityDiscounts: defaultQuantityDiscounts,
  materialLayerCount: 3,
  laminationStepCount: 2,
};

interface QuoteContextType {
  state: QuoteState;
  setProductType: (type: ProductType) => void;
  setPrintingMethod: (method: PrintingMethod) => void;
  setConfig: (config: GeneratorConfig) => void;
  updateConfig: (updates: Partial<GeneratorConfig>) => void;
  generateOutput: () => QuoteGeneratorOutput;
  resetQuote: () => void;
}

const initialState: QuoteState = {
  productType: null,
  printingMethod: null,
  config: defaultConfig,
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

  const generateOutput = (): QuoteGeneratorOutput => {
    const output: QuoteGeneratorOutput = {
      name: `${state.productType === "pouch" ? "包装袋" : "礼盒"}-${state.printingMethod === "gravure" ? "凹版" : "数码"}报价器`,
      productType: state.productType,
      printingMethod: state.printingMethod,
      config: state.config,
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
