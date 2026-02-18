import { createContext, useContext, useState, type ReactNode } from "react";
import { type SoftBoxSurveyConfig, DEFAULT_SOFTBOX_CONFIG } from "./softbox-config";

interface SoftBoxState {
  config: SoftBoxSurveyConfig;
  setConfig: (config: SoftBoxSurveyConfig) => void;
  updateConfig: (partial: Partial<SoftBoxSurveyConfig>) => void;
}

const SoftBoxContext = createContext<SoftBoxState | null>(null);

export function SoftBoxProvider({ children, initial }: { children: ReactNode; initial?: SoftBoxSurveyConfig }) {
  const [config, setConfig] = useState<SoftBoxSurveyConfig>(initial || DEFAULT_SOFTBOX_CONFIG);

  const updateConfig = (partial: Partial<SoftBoxSurveyConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  return (
    <SoftBoxContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </SoftBoxContext.Provider>
  );
}

export function useSoftBox() {
  const ctx = useContext(SoftBoxContext);
  if (!ctx) throw new Error("useSoftBox must be used within SoftBoxProvider");
  return ctx;
}
