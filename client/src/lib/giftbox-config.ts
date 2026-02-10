export const BOX_TYPES = [
  "天地盖",
  "天地盖带内插",
  "书型盒（含磁吸）",
  "抽屉盒（含丝带）"
] as const;
export type BoxType = typeof BOX_TYPES[number];

export const LINER_TYPES = [
  "珍珠棉内衬",
  "EVA内衬",
  "卡纸内衬"
] as const;
export type LinerType = typeof LINER_TYPES[number];

export const PAPER_TYPES = [
  "艺术纸（无覆膜）",
  "金银卡+光膜",
  "铜版纸+光/哑膜",
  "铜版纸+防刮花膜/触感膜"
] as const;
export type PaperType = typeof PAPER_TYPES[number];

export const CRAFT_TYPES = [
  {
    id: "hotStamping" as const,
    name: "烫金",
    desc: "0.2元/个（起步价400元）",
    calcType: "perUnit" as const,
    price: 0.2
  },
  {
    id: "uv" as const,
    name: "UV",
    desc: "0.2元/个（起步价400元）",
    calcType: "perUnit" as const,
    price: 0.2
  },
  {
    id: "embossing" as const,
    name: "激凸",
    desc: "0.2元/个（起步价400元）",
    calcType: "perUnit" as const,
    price: 0.2
  },
  {
    id: "copperLaser" as const,
    name: "铜板+激光雕刻",
    desc: "2元/平方厘米",
    calcType: "perArea" as const,
    price: 2,
    areaLabel: "雕刻面积（平方厘米）"
  }
];
export type CraftId = typeof CRAFT_TYPES[number]["id"];

export const MOLD_FEE_RULES = [
  { minQty: 0, maxQty: 1999, price: 0.4, desc: "0.4元/个（含刀版及运费，合计600-800元）" },
  { minQty: 2000, maxQty: 4999, price: 0.1, desc: "0.1元/个" },
  { minQty: 5000, maxQty: Infinity, price: 0, desc: "免费" }
];

export const PAPER_PRICE: Record<PaperType, number> = {
  "艺术纸（无覆膜）": 3.5,
  "金银卡+光膜": 3.5,
  "铜版纸+光/哑膜": 2.5,
  "铜版纸+防刮花膜/触感膜": 3.5
};

export const BOX_PRICE_LADDER: Record<BoxType, Array<{ minQty: number; maxQty: number; price: number; minPrice?: number }>> = {
  "天地盖": [
    { minQty: 0, maxQty: 999, price: 5, minPrice: 3000 },
    { minQty: 1000, maxQty: 2999, price: 4 },
    { minQty: 3000, maxQty: 4999, price: 3.5 },
    { minQty: 5000, maxQty: 9999, price: 3 },
    { minQty: 10000, maxQty: Infinity, price: 3 }
  ],
  "天地盖带内插": [
    { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
    { minQty: 1000, maxQty: 2999, price: 5 },
    { minQty: 3000, maxQty: 4999, price: 4.5 },
    { minQty: 5000, maxQty: Infinity, price: 4 }
  ],
  "书型盒（含磁吸）": [
    { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
    { minQty: 1000, maxQty: 2999, price: 5 },
    { minQty: 3000, maxQty: 4999, price: 4.5 },
    { minQty: 5000, maxQty: Infinity, price: 4 }
  ],
  "抽屉盒（含丝带）": [
    { minQty: 0, maxQty: 999, price: 6, minPrice: 3000 },
    { minQty: 1000, maxQty: 2999, price: 5 },
    { minQty: 3000, maxQty: 4999, price: 4.5 },
    { minQty: 5000, maxQty: Infinity, price: 4 }
  ]
};

export const CRAFT_START_PRICE = 400;
export const BOARD_PRICE_PER_SQM = 7;
export const PAPER_AREA_RATIO = 1.3;
export const CARTON_PRICE_PER_BOX = 5;
export const HOLE_COST_PER_UNIT = 0.2;

export const LINER_CONFIG: Record<LinerType, { pricePerCubicM: number; minCost: number; baseProcessFee?: number }> = {
  "珍珠棉内衬": { pricePerCubicM: 850, minCost: 1000 },
  "EVA内衬": { pricePerCubicM: 2100, minCost: 1000, baseProcessFee: 0.2 },
  "卡纸内衬": { pricePerCubicM: 0, minCost: 800 }
};

export function getBoxPriceByQty(boxType: BoxType, qty: number) {
  const ladders = BOX_PRICE_LADDER[boxType];
  let currentLadderIndex = 0;
  let currentPrice = 0;
  let minPrice = 0;

  for (let i = 0; i < ladders.length; i++) {
    const ladder = ladders[i];
    if (qty >= ladder.minQty && qty <= ladder.maxQty) {
      currentPrice = ladder.price;
      minPrice = ladder.minPrice || 0;
      currentLadderIndex = i;
      break;
    }
  }

  let nextLadder: { qty: number; price: number } | undefined = undefined;
  if (currentLadderIndex < ladders.length - 1) {
    const next = ladders[currentLadderIndex + 1];
    nextLadder = { qty: next.minQty, price: next.price };
  }

  return { price: currentPrice, minPrice, currentLadder: currentLadderIndex, nextLadder };
}

export function getMoldFeeInfo(qty: number) {
  const validQty = qty || 1;
  let moldPrice = 0;
  let moldDesc = "";

  for (const rule of MOLD_FEE_RULES) {
    if (validQty >= rule.minQty && validQty <= rule.maxQty) {
      moldPrice = rule.price;
      moldDesc = rule.desc;
      break;
    }
  }

  const totalMoldFee = moldPrice * validQty;
  return { price: moldPrice, desc: moldDesc, total: totalMoldFee };
}

export interface GiftBoxSurveyConfig {
  boxType: BoxType;
  paperType: PaperType;
  linerType: LinerType;
  selectedCrafts: CraftId[];
}

export const DEFAULT_GIFTBOX_CONFIG: GiftBoxSurveyConfig = {
  boxType: "天地盖",
  paperType: "艺术纸（无覆膜）",
  linerType: "珍珠棉内衬",
  selectedCrafts: [],
};
