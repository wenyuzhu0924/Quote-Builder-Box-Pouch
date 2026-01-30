import { createContext, useContext, useState, type ReactNode } from "react";

export type ProductType = "box" | "pouch" | null;

export interface SurveyData {
  quantity?: number;
  size?: string;
  material?: string;
  printing?: string;
  finish?: string;
}

export interface QuoteState {
  productType: ProductType;
  surveyData: SurveyData;
}

interface QuoteContextType {
  state: QuoteState;
  setProductType: (type: ProductType) => void;
  setSurveyData: (data: SurveyData) => void;
  resetQuote: () => void;
}

const initialState: QuoteState = {
  productType: null,
  surveyData: {},
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuoteState>(initialState);

  const setProductType = (type: ProductType) => {
    setState((prev) => ({ ...prev, productType: type }));
  };

  const setSurveyData = (data: SurveyData) => {
    setState((prev) => ({ ...prev, surveyData: data }));
  };

  const resetQuote = () => {
    setState(initialState);
  };

  return (
    <QuoteContext.Provider
      value={{ state, setProductType, setSurveyData, resetQuote }}
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
