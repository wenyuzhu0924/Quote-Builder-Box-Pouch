export interface BoxTypeConfig {
  id: string;
  name: string;
  enabled: boolean;
  isBuiltIn: boolean;
  areaFormula: string;
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

export const DEFAULT_GIFTBOX_CONFIG: GiftBoxSurveyConfig = {
  boxTypes: [
    {
      id: "tiandigai",
      name: "天地盖",
      enabled: true,
      isBuiltIn: true,
      areaFormula: "(长+高×2)×(宽+高×2)×2",
      ladder: [
        { minQty: 0, maxQty: 999, price: 5, minPrice: 3000 },
        { minQty: 1000, maxQty: 2999, price: 4 },
        { minQty: 3000, maxQty: 4999, price: 3.5 },
        { minQty: 5000, maxQty: 9999, price: 3 },
        { minQty: 10000, maxQty: Infinity, price: 3 },
      ],
    },
    {
      id: "tiandigai_insert",
      name: "天地盖带内插",
      enabled: true,
      isBuiltIn: true,
      areaFormula: "主体(长+(高÷2)×2)×(宽+(高÷2)×2)×2 + 内插(长×2+宽×2)×高",
      ladder: [
        { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
        { minQty: 1000, maxQty: 2999, price: 5 },
        { minQty: 3000, maxQty: 4999, price: 4.5 },
        { minQty: 5000, maxQty: Infinity, price: 4 },
      ],
    },
    {
      id: "book_box",
      name: "书型盒（含磁吸）",
      enabled: true,
      isBuiltIn: true,
      areaFormula: "(宽+高)×2×长",
      ladder: [
        { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
        { minQty: 1000, maxQty: 2999, price: 5 },
        { minQty: 3000, maxQty: 4999, price: 4.5 },
        { minQty: 5000, maxQty: Infinity, price: 4 },
      ],
    },
    {
      id: "drawer_box",
      name: "抽屉盒（含丝带）",
      enabled: true,
      isBuiltIn: true,
      areaFormula: "(长+高×2)×(宽×2+高×3)",
      ladder: [
        { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
        { minQty: 1000, maxQty: 2999, price: 5 },
        { minQty: 3000, maxQty: 4999, price: 4.5 },
        { minQty: 5000, maxQty: Infinity, price: 4 },
      ],
    },
  ],
  paperTypes: [
    { id: "art_paper", name: "艺术纸（无覆膜）", pricePerSqm: 3.5 },
    { id: "gold_silver", name: "金银卡+光膜", pricePerSqm: 3.5 },
    { id: "coated_film", name: "铜版纸+光/哑膜", pricePerSqm: 2.5 },
    { id: "coated_special", name: "铜版纸+防刮花膜/触感膜", pricePerSqm: 3.5 },
  ],
  linerTypes: [
    { id: "pearl_cotton", name: "珍珠棉内衬", calcMethod: "volume", pricePerCubicM: 850, minCost: 1000, baseProcessFee: 0 },
    { id: "eva", name: "EVA内衬", calcMethod: "volume", pricePerCubicM: 2100, minCost: 1000, baseProcessFee: 0.2 },
    { id: "cardboard", name: "卡纸内衬", calcMethod: "halfBoard", pricePerCubicM: 0, minCost: 800, baseProcessFee: 0 },
  ],
  crafts: [
    { id: "hotStamping", name: "烫金", enabled: true, calcType: "perUnit", price: 0.2, startPrice: 400, desc: "0.2元/个（起步价400元）" },
    { id: "uv", name: "UV", enabled: true, calcType: "perUnit", price: 0.2, startPrice: 400, desc: "0.2元/个（起步价400元）" },
    { id: "embossing", name: "激凸", enabled: true, calcType: "perUnit", price: 0.2, startPrice: 400, desc: "0.2元/个（起步价400元）" },
    { id: "copperLaser", name: "铜板+激光雕刻", enabled: true, calcType: "perArea", price: 2, startPrice: 0, desc: "2元/cm²", areaLabel: "雕刻面积（cm²）" },
  ],
  moldFeeRules: [
    { minQty: 0, maxQty: 1999, price: 0.4, desc: "0.4元/个（含刀版及运费，合计600-800元）" },
    { minQty: 2000, maxQty: 4999, price: 0.1, desc: "0.1元/个" },
    { minQty: 5000, maxQty: Infinity, price: 0, desc: "免费" },
  ],
  boardPricePerSqm: 7,
  paperAreaRatio: 1.3,
  cartonPricePerBox: 5,
  holeCostPerUnit: 0.2,
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
