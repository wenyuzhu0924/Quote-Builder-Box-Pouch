export interface SoftBoxTypeConfig {
  id: string;
  name: string;
  enabled: boolean;
  frameLengthFormula: string;
  frameWidthFormula: string;
  requiredDimensions: string[];
}

export interface SoftBoxPrintingSideOption {
  id: string;
  name: string;
  sides: number;
  enabled: boolean;
}

export interface SoftBoxPrintingTierConfig {
  baseCost: number;
  baseThreshold: number;
  stepCost: number;
  stepSize: number;
}

export interface SoftBoxLaminationOption {
  id: string;
  name: string;
  pricePerSqm: number;
  faces: number;
}

export interface SoftBoxFacePaperConfig {
  id: string;
  name: string;
  pricePerSqm: number;
}

export interface SoftBoxUVConfig {
  enabled: boolean;
  sheetWidth: number;
  sheetHeight: number;
  pricePerSheet: number;
  maxPerSheet: number;
  minTotalCharge: number;
}

export interface SoftBoxGluingConfig {
  feePerBox: number;
  minCharge: number;
}

export interface SoftBoxSurveyConfig {
  boxTypes: SoftBoxTypeConfig[];
  printingSideOptions: SoftBoxPrintingSideOption[];
  printingTier: SoftBoxPrintingTierConfig;
  facePapers: SoftBoxFacePaperConfig[];
  laminationOptions: SoftBoxLaminationOption[];
  laminationMinCharge: number;
  uvConfig: SoftBoxUVConfig;
  gluing: SoftBoxGluingConfig;
}

export const softBoxDimensionLabels: Record<string, string> = {
  length: "长",
  width: "宽",
  height: "高",
};

export function isValidSoftBoxFormula(formula: string): boolean {
  if (!formula || !formula.trim()) return false;
  const dimKeywords = ["长", "宽", "高"];
  const hasDim = dimKeywords.some(k => formula.includes(k));
  const hasOperator = /[×*÷/+\-]/.test(formula);
  const hasNumber = /\d/.test(formula);
  return hasDim && (hasOperator || hasNumber);
}

export function parseSoftBoxDimensionsFromFormula(formula: string): string[] {
  const dims: string[] = [];
  if (formula.includes("长")) dims.push("length");
  if (formula.includes("宽")) dims.push("width");
  if (formula.includes("高")) dims.push("height");
  return dims;
}

export function parseSoftBoxDimensionsFromDualFormulas(fL: string, fW: string): string[] {
  const combined = fL + fW;
  const dims: string[] = [];
  if (combined.includes("长")) dims.push("length");
  if (combined.includes("宽")) dims.push("width");
  if (combined.includes("高")) dims.push("height");
  return dims;
}

type Token = { type: "num"; value: number } | { type: "op"; value: string } | { type: "paren"; value: string };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      const val = parseFloat(num);
      if (isNaN(val)) return null;
      tokens.push({ type: "num", value: val });
      continue;
    }
    if ("+-*/".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
    if ("()".includes(ch)) { tokens.push({ type: "paren", value: ch }); i++; continue; }
    return null;
  }
  return tokens;
}

function parseExpr(tokens: Token[], pos: { i: number }): number | null {
  let left = parseTerm(tokens, pos);
  if (left === null) return null;
  while (pos.i < tokens.length) {
    const t = tokens[pos.i];
    if (t.type === "op" && (t.value === "+" || t.value === "-")) {
      pos.i++;
      const right = parseTerm(tokens, pos);
      if (right === null) return null;
      left = t.value === "+" ? left + right : left - right;
    } else break;
  }
  return left;
}

function parseTerm(tokens: Token[], pos: { i: number }): number | null {
  let left = parseFactor(tokens, pos);
  if (left === null) return null;
  while (pos.i < tokens.length) {
    const t = tokens[pos.i];
    if (t.type === "op" && (t.value === "*" || t.value === "/")) {
      pos.i++;
      const right = parseFactor(tokens, pos);
      if (right === null) return null;
      left = t.value === "*" ? left * right : left / right;
    } else break;
  }
  return left;
}

function parseFactor(tokens: Token[], pos: { i: number }): number | null {
  if (pos.i >= tokens.length) return null;
  const t = tokens[pos.i];
  if (t.type === "num") { pos.i++; return t.value; }
  if (t.type === "paren" && t.value === "(") {
    pos.i++;
    const val = parseExpr(tokens, pos);
    if (val === null) return null;
    if (pos.i >= tokens.length || tokens[pos.i].type !== "paren" || tokens[pos.i].value !== ")") return null;
    pos.i++;
    return val;
  }
  return null;
}

function safeEvalMath(expr: string): number | null {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;
  const pos = { i: 0 };
  const result = parseExpr(tokens, pos);
  if (result === null || pos.i !== tokens.length) return null;
  if (!isFinite(result) || result < 0) return null;
  return result;
}

function substituteFormula(formula: string, dims: { length: number; width: number; height: number }): string {
  let expr = formula;
  expr = expr.replace(/长/g, `(${dims.length})`);
  expr = expr.replace(/宽/g, `(${dims.width})`);
  expr = expr.replace(/高/g, `(${dims.height})`);
  expr = expr.replace(/×/g, "*");
  expr = expr.replace(/÷/g, "/");
  expr = expr.replace(/（/g, "(");
  expr = expr.replace(/）/g, ")");
  expr = expr.replace(/[\u4e00-\u9fff]/g, "");
  return expr.trim();
}

export function evaluateSoftBoxFormula(
  formula: string,
  dims: { length: number; width: number; height: number }
): number | null {
  try {
    const expr = substituteFormula(formula, dims);
    if (!expr) return null;
    return safeEvalMath(expr);
  } catch {
    return null;
  }
}

export function evaluateSoftBoxFrameAndArea(
  frameLengthFormula: string,
  frameWidthFormula: string,
  dims: { length: number; width: number; height: number }
): { frameLcm: number; frameWcm: number; areaCm2: number; error: boolean } {
  try {
    const frameLcm = evaluateSoftBoxFormula(frameLengthFormula, dims);
    const frameWcm = evaluateSoftBoxFormula(frameWidthFormula, dims);
    if (frameLcm === null || frameWcm === null || frameLcm <= 0 || frameWcm <= 0) {
      return { frameLcm: 0, frameWcm: 0, areaCm2: 0, error: true };
    }
    return { frameLcm, frameWcm, areaCm2: frameLcm * frameWcm, error: false };
  } catch {
    return { frameLcm: 0, frameWcm: 0, areaCm2: 0, error: true };
  }
}

export function evaluateSoftBoxAreaFormula(
  formula: string,
  dims: { length: number; width: number; height: number }
): { areaCm2: number; error: boolean } {
  try {
    const result = evaluateSoftBoxFormula(formula, dims);
    if (result !== null) {
      return { areaCm2: result, error: false };
    }
    return { areaCm2: 0, error: true };
  } catch {
    return { areaCm2: 0, error: true };
  }
}

export function calcPrintCostPerSide(qty: number, tier: SoftBoxPrintingTierConfig): number {
  if (qty <= tier.baseThreshold) return tier.baseCost;
  const extra = Math.ceil((qty - tier.baseThreshold) / tier.stepSize);
  return tier.baseCost + tier.stepCost * extra;
}

export function calcUVPiecesPerSheet(
  frameLcm: number, frameWcm: number,
  sheetW: number, sheetH: number, maxPerSheet: number
): number {
  const a = Math.floor(sheetW / frameLcm) * Math.floor(sheetH / frameWcm);
  const b = Math.floor(sheetW / frameWcm) * Math.floor(sheetH / frameLcm);
  let n = Math.max(a, b);
  if (n < 1) n = 1;
  if (n > maxPerSheet) n = maxPerSheet;
  return n;
}

export const DEFAULT_SOFTBOX_CONFIG: SoftBoxSurveyConfig = {
  boxTypes: [
    {
      id: "airplane",
      name: "飞机盒",
      enabled: true,
      frameLengthFormula: "长+4×高+2",
      frameWidthFormula: "2×宽+3×高",
      requiredDimensions: ["length", "width", "height"],
    },
    {
      id: "whiteCard",
      name: "白卡盒",
      enabled: true,
      frameLengthFormula: "(长+宽)×2+2",
      frameWidthFormula: "2×宽+高+4",
      requiredDimensions: ["length", "width", "height"],
    },
  ],
  printingSideOptions: [
    { id: "single", name: "单面", sides: 1, enabled: true },
    { id: "double", name: "双面", sides: 2, enabled: true },
  ],
  printingTier: {
    baseCost: 450,
    baseThreshold: 3000,
    stepCost: 80,
    stepSize: 1000,
  },
  facePapers: [
    { id: "eLeng", name: "300gE楞单面", pricePerSqm: 3.41 },
    { id: "sbsBaika", name: "350g单层白卡", pricePerSqm: 1.995 },
  ],
  laminationOptions: [
    { id: "none", name: "无覆膜", pricePerSqm: 0, faces: 0 },
    { id: "matteSingle", name: "哑单面", pricePerSqm: 1.10, faces: 1 },
    { id: "glossSingle", name: "亮单面", pricePerSqm: 0.80, faces: 1 },
    { id: "matteDouble", name: "哑双面", pricePerSqm: 1.10, faces: 2 },
    { id: "glossDouble", name: "亮双面", pricePerSqm: 0.80, faces: 2 },
  ],
  laminationMinCharge: 150,
  uvConfig: {
    enabled: true,
    sheetWidth: 59,
    sheetHeight: 88,
    pricePerSheet: 0.15,
    maxPerSheet: 8,
    minTotalCharge: 150,
  },
  gluing: {
    feePerBox: 0.10,
    minCharge: 150,
  },
};
