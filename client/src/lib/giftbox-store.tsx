import { createContext, useContext, useState, type ReactNode } from "react";
import { type GiftBoxSurveyConfig, DEFAULT_GIFTBOX_CONFIG } from "./giftbox-config";

interface GiftBoxState {
  config: GiftBoxSurveyConfig;
  setConfig: (config: GiftBoxSurveyConfig) => void;
  updateConfig: (partial: Partial<GiftBoxSurveyConfig>) => void;
}

const GiftBoxContext = createContext<GiftBoxState | null>(null);

export function GiftBoxProvider({ children, initial }: { children: ReactNode; initial?: GiftBoxSurveyConfig }) {
  const [config, setConfig] = useState<GiftBoxSurveyConfig>(initial || DEFAULT_GIFTBOX_CONFIG);

  const updateConfig = (partial: Partial<GiftBoxSurveyConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  return (
    <GiftBoxContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </GiftBoxContext.Provider>
  );
}

export function useGiftBox() {
  const ctx = useContext(GiftBoxContext);
  if (!ctx) throw new Error("useGiftBox must be used within GiftBoxProvider");
  return ctx;
}
