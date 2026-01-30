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
export type RowCount = 1 | 2 | 3;

export interface MaterialLayer {
  material: MaterialType;
  thickness: number;
  density: number;
  price: number;
  isGsm?: boolean;
  enableSplice?: boolean;
  windowWidth?: number;
  windowMaterial?: MaterialType;
  windowThickness?: number;
}

export interface BagDimensions {
  width: number;
  height: number;
  bottomInsert?: number;
  sideExpansion?: number;
  backSeal?: number;
}

export interface DimensionFieldState {
  key: string;
  enabled: boolean;
  value: number;
}

export interface PrintingConfig {
  coverage: PrintCoverage;
  sideCoverage?: PrintCoverage;
}

export interface LaminationStep {
  type: LaminationType;
  price: number;
}

export interface PlateConfig {
  enabled: boolean;
  plateLength: number;
  plateCircumference: number;
  colorCount: number;
  unitPrice: number;
}

export interface PostProcessing {
  zipper?: "normal" | "easyTear" | "eco";
  punchHole?: boolean;
  laserTear?: boolean;
  hotStamp?: boolean;
  hotStampArea?: number;
  wire?: boolean;
  handle?: boolean;
  airValve?: boolean;
  emboss?: boolean;
  windowCut?: boolean;
  spout?: string;
  matteOil?: boolean;
}

export interface BackendConfig {
  materialPrices: Record<MaterialType, number>;
  printPrices: Record<PrintCoverage, number>;
  laminationPrices: Record<LaminationType, number>;
  bagMakingRates: Record<BagType, number>;
  wasteCoefficients: Record<BagType, number>;
  wasteFees: Record<BagType, number>;
  quantityDiscounts: { min: number; coefficient: number }[];
  profitRate: number;
}

export interface GravureSurveyData {
  bagType?: BagType;
  rowCount?: RowCount;
  dimensions?: BagDimensions;
  dimensionFields?: DimensionFieldState[];
  layers?: MaterialLayer[];
  printing?: PrintingConfig;
  lamination?: LaminationStep[];
  plate?: PlateConfig;
  postProcessing?: PostProcessing;
  quantity?: number;
  backendConfig?: BackendConfig;
}

export interface SurveyData {
  quantity?: number;
  size?: string;
  material?: string;
  printing?: string;
  finish?: string;
}

export interface QuoteState {
  productType: ProductType;
  printingMethod: PrintingMethod;
  surveyData: SurveyData;
  gravureSurvey: GravureSurveyData;
}

interface QuoteContextType {
  state: QuoteState;
  setProductType: (type: ProductType) => void;
  setPrintingMethod: (method: PrintingMethod) => void;
  setSurveyData: (data: SurveyData) => void;
  setGravureSurvey: (data: GravureSurveyData) => void;
  resetQuote: () => void;
}

const initialState: QuoteState = {
  productType: null,
  printingMethod: null,
  surveyData: {},
  gravureSurvey: {},
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

  const setSurveyData = (data: SurveyData) => {
    setState((prev) => ({ ...prev, surveyData: data }));
  };

  const setGravureSurvey = (data: GravureSurveyData) => {
    setState((prev) => ({ ...prev, gravureSurvey: { ...prev.gravureSurvey, ...data } }));
  };

  const resetQuote = () => {
    setState(initialState);
  };

  return (
    <QuoteContext.Provider
      value={{ state, setProductType, setPrintingMethod, setSurveyData, setGravureSurvey, resetQuote }}
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
