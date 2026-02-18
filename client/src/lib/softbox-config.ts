export interface SoftBoxTypeConfig {
  id: string;
  name: string;
  enabled: boolean;
  areaFormula: string;
  requiredDimensions: string[];
}

export interface SoftBoxPrintingConfig {
  id: string;
  name: string;
  enabled: boolean;
  pricePerSqm: number;
}

export interface SoftBoxPostProcessConfig {
  id: string;
  name: string;
  enabled: boolean;
  pricePerSqm: number;
}

export interface SoftBoxSurveyConfig {
  boxTypes: SoftBoxTypeConfig[];
  printingSides: SoftBoxPrintingConfig[];
  postProcesses: SoftBoxPostProcessConfig[];
  paperPricePerSqm: number;
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

export function evaluateSoftBoxAreaFormula(
  formula: string,
  dims: { length: number; width: number; height: number }
): { areaCm2: number; error: boolean } {
  try {
    let expr = formula;
    expr = expr.replace(/长/g, `(${dims.length})`);
    expr = expr.replace(/宽/g, `(${dims.width})`);
    expr = expr.replace(/高/g, `(${dims.height})`);
    expr = expr.replace(/×/g, "*");
    expr = expr.replace(/÷/g, "/");
    expr = expr.replace(/（/g, "(");
    expr = expr.replace(/）/g, ")");
    expr = expr.replace(/[\u4e00-\u9fff]/g, "");
    expr = expr.trim();
    if (!expr) return { areaCm2: 0, error: true };
    const result = safeEvalMath(expr);
    if (result !== null) {
      return { areaCm2: result, error: false };
    }
    return { areaCm2: 0, error: true };
  } catch {
    return { areaCm2: 0, error: true };
  }
}

export const DEFAULT_SOFTBOX_CONFIG: SoftBoxSurveyConfig = {
  boxTypes: [
    {
      id: "airplane",
      name: "飞机盒",
      enabled: true,
      areaFormula: "(长+宽×2+4)×(宽+高×2+2)",
      requiredDimensions: ["length", "width", "height"],
    },
    {
      id: "whiteCard",
      name: "白卡盒",
      enabled: true,
      areaFormula: "(长+高×2+2)×(宽+高×2+2)",
      requiredDimensions: ["length", "width", "height"],
    },
  ],
  printingSides: [
    { id: "single", name: "单面印刷", enabled: true, pricePerSqm: 0 },
    { id: "double", name: "双面印刷", enabled: true, pricePerSqm: 0 },
  ],
  postProcesses: [
    { id: "lamination", name: "覆膜", enabled: true, pricePerSqm: 0 },
    { id: "uvCoating", name: "UV上光", enabled: true, pricePerSqm: 0 },
  ],
  paperPricePerSqm: 0,
};
