export interface BoxTypeConfig {
  id: string;
  name: string;
  enabled: boolean;
  areaFormula: string;
  requiredDimensions: string[];
  ladder: Array<{ minQty: number; maxQty: number; price: number; minPrice?: number }>;
}

export interface PaperTypeConfig {
  id: string;
  name: string;
  pricePerSqm: number;
}

export interface LinerTypeConfig {
  id: string;
  name: string;
  calcMethod: "volume" | "halfBoard";
  pricePerCubicM: number;
  minCost: number;
  baseProcessFee: number;
}

export interface CraftConfig {
  id: string;
  name: string;
  enabled: boolean;
  calcType: "perUnit" | "perArea";
  price: number;
  startPrice: number;
  desc: string;
  areaLabel?: string;
}

export interface MoldFeeRule {
  minQty: number;
  maxQty: number;
  price: number;
  desc: string;
}

export interface GiftBoxSurveyConfig {
  boxTypes: BoxTypeConfig[];
  paperTypes: PaperTypeConfig[];
  linerTypes: LinerTypeConfig[];
  crafts: CraftConfig[];
  moldFeeRules: MoldFeeRule[];
  boardPricePerSqm: number;
  paperAreaRatio: number;
  cartonPricePerBox: number;
  holeCostPerUnit: number;
}

export const giftBoxDimensionLabels: Record<string, string> = {
  length: "长",
  width: "宽",
  height: "高",
};

export function parseGiftBoxDimensionsFromFormula(formula: string): string[] {
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

export function evaluateGiftBoxAreaFormula(
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

export const DEFAULT_GIFTBOX_CONFIG: GiftBoxSurveyConfig = {
  boxTypes: [
    {
      id: "tiandigai",
      name: "天地盖",
      enabled: true,
      areaFormula: "(长+高×2)×(宽+高×2)×2",
      requiredDimensions: ["length", "width", "height"],
      ladder: [
        { minQty: 0, maxQty: 999, price: 0, minPrice: 0 },
        { minQty: 1000, maxQty: 2999, price: 0 },
        { minQty: 3000, maxQty: 4999, price: 0 },
        { minQty: 5000, maxQty: 9999, price: 0 },
        { minQty: 10000, maxQty: Infinity, price: 0 },
      ],
    },
    {
      id: "tiandigai_insert",
      name: "天地盖带内插",
      enabled: true,
      areaFormula: "(长+(高÷2)×2)×(宽+(高÷2)×2)×2+(长×2+宽×2)×高",
      requiredDimensions: ["length", "width", "height"],
      ladder: [
        { minQty: 0, maxQty: 999, price: 0, minPrice: 0 },
        { minQty: 1000, maxQty: 2999, price: 0 },
        { minQty: 3000, maxQty: 4999, price: 0 },
        { minQty: 5000, maxQty: Infinity, price: 0 },
      ],
    },
    {
      id: "book_box",
      name: "书型盒（含磁吸）",
      enabled: true,
      areaFormula: "(宽+高)×2×长",
      requiredDimensions: ["length", "width", "height"],
      ladder: [
        { minQty: 0, maxQty: 999, price: 0, minPrice: 0 },
        { minQty: 1000, maxQty: 2999, price: 0 },
        { minQty: 3000, maxQty: 4999, price: 0 },
        { minQty: 5000, maxQty: Infinity, price: 0 },
      ],
    },
    {
      id: "drawer_box",
      name: "抽屉盒（含丝带）",
      enabled: true,
      areaFormula: "(长+高×2)×(宽×2+高×3)",
      requiredDimensions: ["length", "width", "height"],
      ladder: [
        { minQty: 0, maxQty: 999, price: 0, minPrice: 0 },
        { minQty: 1000, maxQty: 2999, price: 0 },
        { minQty: 3000, maxQty: 4999, price: 0 },
        { minQty: 5000, maxQty: Infinity, price: 0 },
      ],
    },
  ],
  paperTypes: [
    { id: "art_paper", name: "艺术纸（无覆膜）", pricePerSqm: 0 },
    { id: "gold_silver", name: "金银卡+光膜", pricePerSqm: 0 },
    { id: "coated_film", name: "铜版纸+光/哑膜", pricePerSqm: 0 },
    { id: "coated_special", name: "铜版纸+防刮花膜/触感膜", pricePerSqm: 0 },
  ],
  linerTypes: [
    { id: "pearl_cotton", name: "珍珠棉内衬", calcMethod: "volume", pricePerCubicM: 0, minCost: 0, baseProcessFee: 0 },
    { id: "eva", name: "EVA内衬", calcMethod: "volume", pricePerCubicM: 0, minCost: 0, baseProcessFee: 0 },
    { id: "cardboard", name: "卡纸内衬", calcMethod: "halfBoard", pricePerCubicM: 0, minCost: 0, baseProcessFee: 0 },
  ],
  crafts: [
    { id: "hotStamping", name: "烫金", enabled: true, calcType: "perUnit", price: 0, startPrice: 0, desc: "按个计算" },
    { id: "uv", name: "UV", enabled: true, calcType: "perUnit", price: 0, startPrice: 0, desc: "按个计算" },
    { id: "embossing", name: "激凸", enabled: true, calcType: "perUnit", price: 0, startPrice: 0, desc: "按个计算" },
    { id: "copperLaser", name: "铜板+激光雕刻", enabled: true, calcType: "perArea", price: 0, startPrice: 0, desc: "按面积计算", areaLabel: "雕刻面积（cm²）" },
  ],
  moldFeeRules: [
    { minQty: 0, maxQty: 1999, price: 0, desc: "按个计算" },
    { minQty: 2000, maxQty: 4999, price: 0, desc: "按个计算" },
    { minQty: 5000, maxQty: Infinity, price: 0, desc: "免费" },
  ],
  boardPricePerSqm: 0,
  paperAreaRatio: 1.3,
  cartonPricePerBox: 0,
  holeCostPerUnit: 0,
};

export function getBoxPriceByQty(ladder: BoxTypeConfig["ladder"], qty: number) {
  let currentLadderIndex = 0;
  let currentPrice = 0;
  let minPrice = 0;

  for (let i = 0; i < ladder.length; i++) {
    const l = ladder[i];
    if (qty >= l.minQty && qty <= l.maxQty) {
      currentPrice = l.price;
      minPrice = l.minPrice || 0;
      currentLadderIndex = i;
      break;
    }
  }

  let nextLadder: { qty: number; price: number } | undefined = undefined;
  if (currentLadderIndex < ladder.length - 1) {
    const next = ladder[currentLadderIndex + 1];
    nextLadder = { qty: next.minQty, price: next.price };
  }

  return { price: currentPrice, minPrice, currentLadder: currentLadderIndex, nextLadder };
}

export function getMoldFeeInfo(rules: MoldFeeRule[], qty: number) {
  const validQty = qty || 1;
  let moldPrice = 0;
  let moldDesc = "";

  for (const rule of rules) {
    if (validQty >= rule.minQty && validQty <= rule.maxQty) {
      moldPrice = rule.price;
      moldDesc = rule.desc;
      break;
    }
  }

  const totalMoldFee = moldPrice * validQty;
  return { price: moldPrice, desc: moldDesc, total: totalMoldFee };
}
