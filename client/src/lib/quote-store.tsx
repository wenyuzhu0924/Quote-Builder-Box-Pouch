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

export interface ParameterField {
  id: string;
  label: string;
  category: string;
  type: "input" | "select" | "checkbox";
  unit?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  isUserInput: boolean;
  tooltip?: string;
}

export interface SelectedParameters {
  bagType: boolean;
  dimensions: {
    width: boolean;
    height: boolean;
    bottomInsert: boolean;
    sideExpansion: boolean;
    backSeal: boolean;
  };
  materials: {
    enabled: boolean;
    layerCount: number;
    showThickness: boolean;
    showDensity: boolean;
    showPrice: boolean;
  };
  printing: {
    coverage: boolean;
  };
  lamination: {
    enabled: boolean;
    showPrice: boolean;
  };
  postProcessing: {
    zipper: boolean;
    punchHole: boolean;
    laserTear: boolean;
    hotStamp: boolean;
    spout: boolean;
    matteOil: boolean;
  };
  plate: {
    enabled: boolean;
    showLength: boolean;
    showCircumference: boolean;
    showColorCount: boolean;
    showUnitPrice: boolean;
  };
  quantity: boolean;
  profitRate: boolean;
}

export interface BackendDefaults {
  materialPrices: Record<string, number>;
  printPrices: Record<number, number>;
  laminationPrices: Record<string, number>;
  bagMakingRates: Record<string, number>;
  wasteCoefficients: Record<string, number>;
  wasteFees: Record<string, number>;
  quantityDiscounts: { min: number; coefficient: number }[];
  profitRate: number;
}

export interface QuoteGeneratorConfig {
  name: string;
  productType: ProductType;
  printingMethod: PrintingMethod;
  selectedParams: SelectedParameters;
  backendDefaults: BackendDefaults;
}

export interface QuoteState {
  productType: ProductType;
  printingMethod: PrintingMethod;
  selectedParams: SelectedParameters;
  backendDefaults: BackendDefaults;
  generatorConfig: QuoteGeneratorConfig | null;
}

const defaultSelectedParams: SelectedParameters = {
  bagType: true,
  dimensions: {
    width: true,
    height: true,
    bottomInsert: true,
    sideExpansion: false,
    backSeal: false,
  },
  materials: {
    enabled: true,
    layerCount: 2,
    showThickness: true,
    showDensity: false,
    showPrice: false,
  },
  printing: {
    coverage: true,
  },
  lamination: {
    enabled: true,
    showPrice: false,
  },
  postProcessing: {
    zipper: true,
    punchHole: false,
    laserTear: false,
    hotStamp: false,
    spout: true,
    matteOil: false,
  },
  plate: {
    enabled: false,
    showLength: false,
    showCircumference: false,
    showColorCount: true,
    showUnitPrice: false,
  },
  quantity: true,
  profitRate: false,
};

const defaultBackendDefaults: BackendDefaults = {
  materialPrices: {},
  printPrices: { 25: 1800, 50: 2200, 100: 2800, 150: 3200, 200: 3600, 300: 4200 },
  laminationPrices: { dry: 1200, dryRetort: 1500, solventless: 1000 },
  bagMakingRates: {},
  wasteCoefficients: {},
  wasteFees: {},
  quantityDiscounts: [
    { min: 10000, coefficient: 1.0 },
    { min: 30000, coefficient: 0.95 },
    { min: 50000, coefficient: 0.90 },
    { min: 100000, coefficient: 0.85 },
  ],
  profitRate: 15,
};

interface QuoteContextType {
  state: QuoteState;
  setProductType: (type: ProductType) => void;
  setPrintingMethod: (method: PrintingMethod) => void;
  setSelectedParams: (params: SelectedParameters) => void;
  setBackendDefaults: (defaults: BackendDefaults) => void;
  generateConfig: () => QuoteGeneratorConfig;
  resetQuote: () => void;
}

const initialState: QuoteState = {
  productType: null,
  printingMethod: null,
  selectedParams: defaultSelectedParams,
  backendDefaults: defaultBackendDefaults,
  generatorConfig: null,
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

  const setSelectedParams = (params: SelectedParameters) => {
    setState((prev) => ({ ...prev, selectedParams: params }));
  };

  const setBackendDefaults = (defaults: BackendDefaults) => {
    setState((prev) => ({ ...prev, backendDefaults: defaults }));
  };

  const generateConfig = (): QuoteGeneratorConfig => {
    const config: QuoteGeneratorConfig = {
      name: `${state.productType === "pouch" ? "包装袋" : "礼盒"}-${state.printingMethod === "gravure" ? "凹版" : "数码"}报价器`,
      productType: state.productType,
      printingMethod: state.printingMethod,
      selectedParams: state.selectedParams,
      backendDefaults: state.backendDefaults,
    };
    setState((prev) => ({ ...prev, generatorConfig: config }));
    return config;
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
        setSelectedParams,
        setBackendDefaults,
        generateConfig,
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
