import type {
  DigitalGeneratorConfig,
  CustomBagType,
  DigitalPrintMode,
  DigitalSpecialProcess,
  DigitalZipperType,
  DigitalValveType,
  DigitalAccessory,
  DigitalPrintingTier,
} from "./quote-store";

export interface DigitalCalcInput {
  bagTypeId: string;
  dimensions: {
    width: number;
    height: number;
    bottomInsert: number;
    sideExpansion: number;
    backSeal: number;
    sideGusset: number;
    sealEdge: number;
    areaCoefficient: number;
  };
  quantity: number;
  skuCount: number;
  taxRate: number;
  exchangeRate: number;
  printModeId: string;
  selectedSpecialProcessIds: string[];
  zipperId: string;
  valveId: string;
  spoutId: string | null;
  selectedAccessoryIds: string[];
  moldCost: number;
  plateCost: number;
  materialLayers: {
    id: string;
    layerType: "print" | "composite" | "seal";
    materialId: string;
    squarePrice: number;
    name: string;
  }[];
  isSidePrint?: boolean;
}

export interface DigitalCalcProcessData {
  expandSize: { L_exp: number; W_exp: number };
  layout: { N_row: number; N_circ: number; N_rev: number };
  rotation: { R_order: number; R_loss: number };
  meterage: { L_rev: number; M_order: number; M_loss: number; M_idle: number; M_total: number };
  feedArea: number;
  materialWidth: number;
}

export interface DigitalCalcCostBreakdown {
  material: number;
  lamination: number;
  print: number;
  bagMaking: number;
  accessories: number;
  specialProcess: number;
  custom: number;
  fileFee: number;
  total: number;
  totalWithTax: number;
}

export interface DigitalCalcQuote {
  exFactory: { unit: number; total: number; unitUSD: number; totalUSD: number };
  withTax: { unit: number; total: number; unitUSD: number; totalUSD: number };
}

export interface DigitalCalcResult {
  processData: DigitalCalcProcessData;
  costBreakdown: DigitalCalcCostBreakdown;
  quote: DigitalCalcQuote;
  materialDetails: { name: string; sqPrice: number }[];
  materialSquarePriceTotal: number;
  isDoubleBag: boolean;
  isEightSide: boolean;
  eightSideCalc?: {
    bagBody: { L_exp: number; W_exp: number; N_circ: number; N_row: number; L_rev: number; R_order: number; R_loss: number; M_total: number };
    bagSide: { L_exp: number; W_exp: number; N_circ: number; N_row: number; L_rev: number; R_order: number; R_loss: number; M_total: number };
    totalMeter: number;
    totalOrderRev: number;
    totalLossRev: number;
    materialWidth: number;
    printArea: number;
    bagBodyMaterialCost: number;
    bagSideMaterialCost: number;
    bagBodyPrintCost: number;
    bagSidePrintCost: number;
  };
}

const DOUBLE_BAG_IDS = ["threeSideDouble", "standupDouble", "eightSideDouble"];
const EIGHT_SIDE_IDS = ["eightSideNoZip", "eightSideWithZip", "eightSideDouble", "eightSideSplitBottom"];

function getBagExpansion(
  bagTypeId: string,
  d: DigitalCalcInput["dimensions"]
): { L_exp: number; W_exp: number } {
  const w = d.width;
  const h = d.height;
  const bi = d.bottomInsert;
  const se = d.sideExpansion;
  const bs = d.backSeal;
  const sg = d.sideGusset;

  switch (bagTypeId) {
    case "threeSide":
      return { L_exp: h * 2 + 30, W_exp: w + 3 };
    case "threeSideDouble":
      return { L_exp: h + 30, W_exp: w + 3 };
    case "standupNoZip":
    case "standupWithZip":
    case "standupSplitBottom":
      return { L_exp: (h + bi) * 2 + 40, W_exp: w + 3 };
    case "standupDouble":
      return { L_exp: (h + bi) + 40, W_exp: w + 3 };
    case "centerSeal":
    case "sideSeal":
      return { L_exp: (w + bs + sg) * 2 + 20, W_exp: h + 3 };
    case "gusset":
      return { L_exp: (w + bs + se) * 2 + 40, W_exp: h + 3 };
    case "eightSideNoZip":
    case "eightSideWithZip":
    case "eightSideDouble":
    case "eightSideSplitBottom":
      return { L_exp: 0, W_exp: 0 };
    default:
      return { L_exp: h * 2 + 30, W_exp: w + 3 };
  }
}

interface BagMakingRule {
  formulaType: "standard" | "gusset" | "eightSide" | "none";
  coefficient: number;
  minPrice: number;
}

function getBagMakingRule(bagTypeId: string, config: DigitalGeneratorConfig): BagMakingRule {
  const bt = config.customBagTypes.find(b => b.id === bagTypeId);
  const coeff = bt?.makingCoefficient ?? 0.25;
  const minP = bt?.makingMinPrice ?? 300;

  if (EIGHT_SIDE_IDS.includes(bagTypeId)) {
    return { formulaType: "eightSide", coefficient: coeff, minPrice: minP };
  }
  if (bagTypeId === "gusset") {
    return { formulaType: "gusset", coefficient: coeff, minPrice: minP };
  }
  return { formulaType: "standard", coefficient: coeff, minPrice: minP };
}

function calcBagMakingCost(
  rule: BagMakingRule,
  params: { L_rev: number; R_order: number; R_loss: number; N_row: number; M_order: number }
): number {
  switch (rule.formulaType) {
    case "eightSide":
      return rule.coefficient * params.L_rev * (params.R_order + params.R_loss) * params.N_row;
    case "gusset":
      return rule.coefficient * params.L_rev * (params.R_order + params.R_loss) * params.N_row;
    case "standard":
      return rule.coefficient * params.L_rev * (params.R_order + params.R_loss) * params.N_row;
    case "none":
      return 0;
    default:
      return 0;
  }
}

function getMaterialWidth(orderRev: number, printPatternWidth: number): number {
  if (orderRev < 1500) return 760;
  if (printPatternWidth <= 540) return 555;
  if (printPatternWidth <= 620) return 630;
  if (printPatternWidth <= 670) return 680;
  return 760;
}

function getEightSideMaterialWidth(orderRev: number, printPatternWidth: number): number {
  if (orderRev < 2000) return 760;
  if (printPatternWidth <= 545) return 555;
  if (printPatternWidth <= 625) return 630;
  if (printPatternWidth <= 670) return 680;
  return 760;
}

function getPrintUnitPrice(orderRev: number, tiers: DigitalPrintingTier[]): number {
  if (tiers.length === 0) return 4;
  for (const tier of tiers) {
    const maxRev = tier.maxRevolutions ?? Infinity;
    const price = tier.pricePerRevolution ?? tier.pricePerMeter ?? 4;
    if (orderRev <= maxRev) {
      return price || 4;
    }
  }
  const lastTier = tiers[tiers.length - 1];
  return lastTier.pricePerRevolution ?? lastTier.pricePerMeter ?? 4;
}

export function calculateDigital(
  input: DigitalCalcInput,
  config: DigitalGeneratorConfig
): DigitalCalcResult {
  const {
    bagTypeId, dimensions: d, quantity: qty, skuCount: sku,
    taxRate: vatRate, exchangeRate: exr,
    printModeId, selectedSpecialProcessIds,
    zipperId, valveId, spoutId, selectedAccessoryIds,
    moldCost: moldFee, plateCost: plateFee,
    materialLayers, isSidePrint = false,
  } = input;

  const { maxPrintWidth, maxPrintCircumference, skuWaste, adjustmentWaste, idleMaterialMin } = config.systemConstants;

  if (qty <= 0) {
    const zero: DigitalCalcResult = {
      processData: {
        expandSize: { L_exp: 0, W_exp: 0 },
        layout: { N_row: 0, N_circ: 0, N_rev: 0 },
        rotation: { R_order: 0, R_loss: 0 },
        meterage: { L_rev: 0, M_order: 0, M_loss: 0, M_idle: 0, M_total: 0 },
        feedArea: 0, materialWidth: 760,
      },
      costBreakdown: { material: 0, lamination: 0, print: 0, bagMaking: 0, accessories: 0, specialProcess: 0, custom: 0, fileFee: 0, total: 0, totalWithTax: 0 },
      quote: { exFactory: { unit: 0, total: 0, unitUSD: 0, totalUSD: 0 }, withTax: { unit: 0, total: 0, unitUSD: 0, totalUSD: 0 } },
      materialDetails: [], materialSquarePriceTotal: 0, isDoubleBag: false, isEightSide: false,
    };
    return zero;
  }

  const validLayers = materialLayers.filter(l => l.materialId !== "" && l.name !== "无");
  const totalSqPrice = validLayers.reduce((s, l) => s + (l.squarePrice || 0), 0);
  const lamLayers = Math.max(0, validLayers.length - 1);
  const isDoubleBag = DOUBLE_BAG_IDS.includes(bagTypeId);
  const isEightSide = EIGHT_SIDE_IDS.includes(bagTypeId);

  const selectedMode = config.printModes.find(m => m.id === printModeId);
  const modeCoefficient = selectedMode?.coefficient ?? 0;
  const isDoublePrint = selectedSpecialProcessIds.includes("doubleSide");

  const toUSD = (v: number) => v / (exr || 1);

  const PER_SKU_LOSS = skuWaste || 30;
  const DEBUG_LOSS_REV = adjustmentWaste || 80;

  if (isEightSide) {
    return calcEightSide(input, config, validLayers, totalSqPrice, lamLayers, modeCoefficient, isDoublePrint, isDoubleBag, toUSD);
  }

  const { L_exp, W_exp } = getBagExpansion(bagTypeId, d);

  const N_row = Math.max(1, Math.floor(maxPrintWidth / L_exp));
  const N_circ = Math.max(1, Math.floor(maxPrintCircumference / W_exp));
  const N_rev = N_row * N_circ;

  const R_order = qty / N_rev;
  const R_loss = (sku * PER_SKU_LOSS) + DEBUG_LOSS_REV;

  const L_rev = (N_circ * W_exp) / 1000;
  const M_order = R_order * L_rev;
  const M_loss = R_loss * L_rev;
  const M_idle = Math.max(idleMaterialMin, (M_order + M_loss) / 1500 * 50);
  const M_total = M_order + M_loss + M_idle;

  const materialWidth = getMaterialWidth(R_order, L_exp);
  const feedAreaSqm = M_total * (materialWidth / 1000);

  const C_mat = feedAreaSqm * totalSqPrice;

  const singleLamCost = Math.max(config.laminationUnitPrice ?? 200, (config.laminationPerMeter ?? 0.25) * M_total);
  const C_lam = singleLamCost * lamLayers;

  const printUnitPrice = getPrintUnitPrice(R_order, config.printingTiers);
  let C_print = 0;
  if (modeCoefficient === 0) {
    C_print = R_loss * 4;
  } else {
    let basePrint = printUnitPrice * R_order + R_loss * 4;
    basePrint *= modeCoefficient;
    if (isDoublePrint) basePrint *= 2;
    C_print = basePrint;
  }
  const fileFee = sku > 5 ? (sku - 5) * 50 : 0;
  C_print += fileFee;

  const bagMakingRule = getBagMakingRule(bagTypeId, config);
  const bagMakingBase = calcBagMakingCost(bagMakingRule, { L_rev, R_order, R_loss, N_row, M_order });
  const C_bag = Math.max(bagMakingBase, bagMakingRule.minPrice);

  let C_accessories = 0;
  if (zipperId !== "none") {
    const zipper = config.zipperTypes.find(z => z.id === zipperId);
    if (zipper) {
      C_accessories += N_row * (M_order + M_loss) * zipper.pricePerMeter;
    }
  }
  if (valveId !== "none") {
    const valve = config.valveTypes.find(v => v.id === valveId);
    if (valve) {
      C_accessories += qty * valve.pricePerUnit;
    }
  }
  if (spoutId) {
    const spout = config.accessories.find(a => a.id === spoutId);
    if (spout) {
      C_accessories += spout.price * qty;
    }
  }
  selectedAccessoryIds.forEach(id => {
    const acc = config.accessories.find(a => a.id === id);
    if (!acc) return;
    if (acc.price > 0) {
      C_accessories += acc.price * qty;
    } else if (acc.name.includes("束口条")) {
      const w = d.width;
      let tinPrice = 0;
      if (w <= 140) tinPrice = 0.5;
      else if (w <= 200) tinPrice = 0.6;
      else if (w <= 250) tinPrice = 0.7;
      else tinPrice = 0.8;
      C_accessories += tinPrice * qty;
    } else if (acc.name.includes("激光易撕线")) {
      C_accessories += 0.35 * M_total;
    }
  });

  let C_special = 0;
  selectedSpecialProcessIds.forEach(id => {
    const process = config.specialProcesses.find(p => p.id === id);
    if (!process) return;

    let cost = 0;
    if (process.calcBasis === "perQuantity") {
      cost = process.unitPrice * qty;
    } else if (process.calcBasis === "perMeter") {
      cost = process.unitPrice * M_total;
    } else if (process.calcBasis === "printMultiplier") {
      cost = (C_print - fileFee) * process.unitPrice;
    }

    if (process.minPrice > 0 && cost < process.minPrice) {
      cost = process.minPrice;
    }
    C_special += cost;
  });

  if (selectedSpecialProcessIds.includes("shapedBag")) {
    C_special += 300;
  }

  const C_custom = moldFee + plateFee;

  const Total = C_mat + C_lam + C_print + C_bag + C_accessories + C_special + C_custom;
  const finalTotal = isDoubleBag ? Total * 2 : Total;
  const finalUnit = finalTotal / qty;
  const taxMultiplier = 1 + vatRate / 100;
  const finalUnitVAT = finalUnit * taxMultiplier;
  const finalTotalVAT = finalTotal * taxMultiplier;

  return {
    processData: {
      expandSize: { L_exp, W_exp },
      layout: { N_row, N_circ, N_rev },
      rotation: { R_order, R_loss },
      meterage: { L_rev, M_order, M_loss, M_idle, M_total },
      feedArea: feedAreaSqm,
      materialWidth,
    },
    costBreakdown: {
      material: C_mat,
      lamination: C_lam,
      print: C_print,
      bagMaking: C_bag,
      accessories: C_accessories,
      specialProcess: C_special,
      custom: C_custom,
      fileFee,
      total: finalTotal,
      totalWithTax: finalTotalVAT,
    },
    quote: {
      exFactory: { unit: finalUnit, total: finalTotal, unitUSD: toUSD(finalUnit), totalUSD: toUSD(finalTotal) },
      withTax: { unit: finalUnitVAT, total: finalTotalVAT, unitUSD: toUSD(finalUnitVAT), totalUSD: toUSD(finalTotalVAT) },
    },
    materialDetails: validLayers.map(l => ({ name: l.name, sqPrice: l.squarePrice })),
    materialSquarePriceTotal: totalSqPrice,
    isDoubleBag,
    isEightSide: false,
  };
}

function calcEightSide(
  input: DigitalCalcInput,
  config: DigitalGeneratorConfig,
  validLayers: DigitalCalcInput["materialLayers"],
  totalSqPrice: number,
  lamLayers: number,
  modeCoefficient: number,
  isDoublePrint: boolean,
  isDoubleBag: boolean,
  toUSD: (v: number) => number,
): DigitalCalcResult {
  const { dimensions: d, quantity: qty, skuCount: sku, taxRate: vatRate,
    moldCost: moldFee, plateCost: plateFee,
    zipperId, valveId, spoutId, selectedAccessoryIds, selectedSpecialProcessIds,
    isSidePrint = false,
  } = input;
  const { maxPrintWidth, maxPrintCircumference, skuWaste, adjustmentWaste, idleMaterialMin } = config.systemConstants;

  const safeW = d.width;
  const safeH = d.height;
  const safeG = d.bottomInsert;
  const safeSideQin = d.sideGusset || safeG;

  const bagBody_L_exp = (safeH + safeG) * 2 + 60;
  const bagBody_W_exp = safeW + 5;
  const bagBody_N_circ = Math.max(1, Math.floor(maxPrintCircumference / bagBody_W_exp));
  const bagBody_N_row = Math.max(1, Math.floor(maxPrintWidth / bagBody_L_exp));
  const bagBody_L_rev = bagBody_N_circ * bagBody_W_exp;
  const bagBody_R_order = qty / (bagBody_N_circ * bagBody_N_row);
  const eightSideSkuLoss = skuWaste || 60;
  const eightSideAdjustLoss = adjustmentWaste || 250;
  const bagBody_R_loss = (sku * eightSideSkuLoss) + eightSideAdjustLoss;
  const bagBody_meter_base = (bagBody_R_order + bagBody_R_loss) * bagBody_L_rev / 1000;
  const bagBody_idle = Math.max(idleMaterialMin, bagBody_meter_base / 1500 * 50);
  const bagBody_M_total = bagBody_meter_base + bagBody_idle;

  const bagSide_L_exp = safeSideQin * 2 + 15;
  const bagSide_W_exp = safeH + 5;
  const bagSide_N_circ = Math.max(1, Math.floor(maxPrintCircumference / bagSide_W_exp));
  const bagSide_N_row = Math.max(1, Math.floor(maxPrintWidth / bagSide_L_exp));
  const bagSide_L_rev = bagSide_N_circ * bagSide_W_exp;
  const bagSide_R_order = qty / (bagSide_N_circ * bagSide_N_row);
  const bagBody_perRev = bagBody_N_circ * bagBody_N_row;
  const bagSide_perRev = bagSide_N_circ * bagSide_N_row || 1;
  const bagSide_loss_rate = Math.floor(Number(isSidePrint) * (bagBody_perRev / bagSide_perRev));
  const bagSide_R_loss = bagSide_loss_rate * bagBody_R_loss;
  const bagSide_meter_base = (bagSide_R_order + bagSide_R_loss) * bagSide_L_rev / 1000;
  const bagSide_idle = Math.max(idleMaterialMin, bagSide_meter_base / 1500 * 50);
  const bagSide_M_total = bagSide_meter_base + bagSide_idle;

  const totalMeter = bagSide_M_total + (bagBody_M_total * 1.05);
  const totalOrderRev = bagSide_R_order + bagBody_R_order;
  const totalLossRev = bagSide_R_loss + bagBody_R_loss;
  const totalRev = totalOrderRev + totalLossRev;

  let materialWidth = 760;
  const printPatternWidth = bagBody_L_exp * bagBody_N_row;
  materialWidth = getEightSideMaterialWidth(totalOrderRev, printPatternWidth);

  const printArea = totalMeter * materialWidth * 1.02 / 1000;

  const bagBodyMaterialCost = (bagBody_M_total * 1.05) * materialWidth * totalSqPrice / 1000;
  const bagSideMaterialCost = bagSide_M_total * materialWidth * totalSqPrice / 1000;
  const C_mat = bagBodyMaterialCost + bagSideMaterialCost;

  const fileFee = sku > 5 ? (sku - 5) * 50 : 0;

  const printUnitPrice = getPrintUnitPrice(totalOrderRev, config.printingTiers);
  let C_print = 0;
  let bagBodyPrintCost = 0;
  let bagSidePrintCost = 0;

  if (modeCoefficient === 0) {
    C_print = totalLossRev * 4;
  } else {
    bagBodyPrintCost = printUnitPrice * bagBody_R_order + bagBody_R_loss * 4;
    bagBodyPrintCost *= modeCoefficient;
    if (isDoublePrint) bagBodyPrintCost *= 2;

    if (isSidePrint) {
      bagSidePrintCost = printUnitPrice * bagSide_R_order + bagSide_R_loss * 4;
      bagSidePrintCost *= modeCoefficient;
      if (isDoublePrint) bagSidePrintCost *= 2;
    }

    C_print = bagBodyPrintCost + bagSidePrintCost;
  }
  C_print += fileFee;

  const singleLamCost8 = Math.max(config.laminationUnitPrice ?? 200, (config.laminationPerMeter ?? 0.25) * totalMeter);
  const C_lam = singleLamCost8 * lamLayers;

  const bagMakingRule = getBagMakingRule(input.bagTypeId, config);
  const bagMakingBaseCost = bagMakingRule.coefficient * bagBody_L_rev / 1000 * (bagBody_R_order + bagBody_R_loss) * bagBody_N_row;
  const C_bag = Math.max(bagMakingBaseCost, bagMakingRule.minPrice);

  let C_accessories = 0;
  if (zipperId !== "none") {
    const zipper = config.zipperTypes.find(z => z.id === zipperId);
    if (zipper) {
      C_accessories += bagBody_N_row * totalMeter * zipper.pricePerMeter;
    }
  }
  if (valveId !== "none") {
    const valve = config.valveTypes.find(v => v.id === valveId);
    if (valve) {
      C_accessories += qty * valve.pricePerUnit;
    }
  }
  if (spoutId) {
    const spout = config.accessories.find(a => a.id === spoutId);
    if (spout) {
      C_accessories += spout.price * qty;
    }
  }
  selectedAccessoryIds.forEach(id => {
    const acc = config.accessories.find(a => a.id === id);
    if (!acc) return;
    if (acc.price > 0) {
      C_accessories += acc.price * qty;
    } else if (acc.name.includes("束口条")) {
      const w = safeW;
      let tinPrice = 0;
      if (w <= 140) tinPrice = 0.5;
      else if (w <= 200) tinPrice = 0.6;
      else if (w <= 250) tinPrice = 0.7;
      else tinPrice = 0.8;
      C_accessories += tinPrice * qty;
    } else if (acc.name.includes("激光易撕线")) {
      C_accessories += 0.35 * totalMeter;
    }
  });

  let C_special = 0;
  selectedSpecialProcessIds.forEach(id => {
    const process = config.specialProcesses.find(p => p.id === id);
    if (!process) return;
    let cost = 0;
    if (process.calcBasis === "perQuantity") {
      cost = process.unitPrice * qty;
    } else if (process.calcBasis === "perMeter") {
      cost = process.unitPrice * totalMeter;
    } else if (process.calcBasis === "printMultiplier") {
      cost = (C_print - fileFee) * process.unitPrice;
    }
    if (process.minPrice > 0 && cost < process.minPrice) {
      cost = process.minPrice;
    }
    C_special += cost;
  });
  if (selectedSpecialProcessIds.includes("shapedBag")) {
    C_special += 300;
  }

  const C_custom = moldFee + plateFee;

  const Total = C_mat + C_lam + C_print + C_bag + C_accessories + C_special + C_custom;
  const finalTotal = isDoubleBag ? Total * 2 : Total;
  const finalUnit = finalTotal / qty;
  const taxMultiplier = 1 + vatRate / 100;
  const finalUnitVAT = finalUnit * taxMultiplier;
  const finalTotalVAT = finalTotal * taxMultiplier;

  return {
    processData: {
      expandSize: { L_exp: bagBody_L_exp, W_exp: bagBody_W_exp },
      layout: { N_row: bagBody_N_row, N_circ: bagBody_N_circ, N_rev: bagBody_N_row * bagBody_N_circ },
      rotation: { R_order: totalOrderRev, R_loss: totalLossRev },
      meterage: {
        L_rev: bagBody_L_rev / 1000,
        M_order: bagBody_meter_base,
        M_loss: bagSide_meter_base,
        M_idle: bagBody_idle + bagSide_idle,
        M_total: totalMeter,
      },
      feedArea: printArea,
      materialWidth,
    },
    costBreakdown: {
      material: C_mat,
      lamination: C_lam,
      print: C_print,
      bagMaking: C_bag,
      accessories: C_accessories,
      specialProcess: C_special,
      custom: C_custom,
      fileFee,
      total: finalTotal,
      totalWithTax: finalTotalVAT,
    },
    quote: {
      exFactory: { unit: finalUnit, total: finalTotal, unitUSD: toUSD(finalUnit), totalUSD: toUSD(finalTotal) },
      withTax: { unit: finalUnitVAT, total: finalTotalVAT, unitUSD: toUSD(finalUnitVAT), totalUSD: toUSD(finalTotalVAT) },
    },
    materialDetails: validLayers.map(l => ({ name: l.name, sqPrice: l.squarePrice })),
    materialSquarePriceTotal: totalSqPrice,
    isDoubleBag,
    isEightSide: true,
    eightSideCalc: {
      bagBody: { L_exp: bagBody_L_exp, W_exp: bagBody_W_exp, N_circ: bagBody_N_circ, N_row: bagBody_N_row, L_rev: bagBody_L_rev, R_order: bagBody_R_order, R_loss: bagBody_R_loss, M_total: bagBody_M_total },
      bagSide: { L_exp: bagSide_L_exp, W_exp: bagSide_W_exp, N_circ: bagSide_N_circ, N_row: bagSide_N_row, L_rev: bagSide_L_rev, R_order: bagSide_R_order, R_loss: bagSide_R_loss, M_total: bagSide_M_total },
      totalMeter,
      totalOrderRev,
      totalLossRev,
      materialWidth,
      printArea,
      bagBodyMaterialCost,
      bagSideMaterialCost,
      bagBodyPrintCost,
      bagSidePrintCost,
    },
  };
}
