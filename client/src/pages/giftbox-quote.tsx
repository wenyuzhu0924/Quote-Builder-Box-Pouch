import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  type GiftBoxSurveyConfig, DEFAULT_GIFTBOX_CONFIG,
  type BoxType,
  PAPER_PRICE, BOARD_PRICE_PER_SQM, PAPER_AREA_RATIO,
  CARTON_PRICE_PER_BOX, HOLE_COST_PER_UNIT, CRAFT_START_PRICE,
  CRAFT_TYPES, LINER_CONFIG, BOX_PRICE_LADDER,
  getBoxPriceByQty, getMoldFeeInfo,
} from "@/lib/giftbox-config";
import { useGiftBox } from "@/lib/giftbox-store";

interface GiftBoxQuotePageProps {
  surveyPath?: string;
  homePath?: string;
  hideRestart?: boolean;
}

function toNum(v: string | number): number {
  if (v === "" || v === undefined || v === null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export default function GiftBoxQuotePage({
  surveyPath = "/giftbox/survey",
  homePath = "/",
  hideRestart = false,
}: GiftBoxQuotePageProps) {
  const [, navigate] = useLocation();
  const { config: surveyConfig } = useGiftBox();

  const [dimensions, setDimensions] = useState({ length: 20, width: 10, height: 5 });
  const [linerParams, setLinerParams] = useState({ linerHeightRatio: 0.5, holeCount: 0 });
  const [craftAreas, setCraftAreas] = useState<Record<string, number>>({ copperLaser: 20 });
  const [orderInfo, setOrderInfo] = useState({
    qty: 1000,
    customBoxPrice: 3,
    moldDiscount: 0,
    cartonCount: 10,
    exchangeRate: 7.2,
    taxRate: 13,
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calc = useMemo(() => {
    const { boxType, paperType, linerType, selectedCrafts } = surveyConfig;
    const { linerHeightRatio, holeCount } = linerParams;
    const L_cm = dimensions.length || 0;
    const W_cm = dimensions.width || 0;
    const H_cm = dimensions.height || 0;
    const validQty = orderInfo.qty || 1;
    const validCartonCount = orderInfo.cartonCount || 0;
    const validExchangeRate = orderInfo.exchangeRate || 7.2;
    const validTaxRate = orderInfo.taxRate || 13;
    const validHoleCount = holeCount || 0;

    const ladderInfo = getBoxPriceByQty(boxType, validQty);
    const finalBoxPrice = validQty >= 10000 ? orderInfo.customBoxPrice : ladderInfo.price;
    const moldFeeInfo = getMoldFeeInfo(validQty);
    const finalMoldTotal = Math.max(moldFeeInfo.total - orderInfo.moldDiscount, 0);

    let boardAreaPerBox = 0;
    let insertBoardArea = 0;
    let areaFormula = "";
    const areaSteps: string[] = [];

    const L = L_cm / 100;
    const W = W_cm / 100;
    const H = H_cm / 100;

    switch (boxType) {
      case "天地盖": {
        const s1 = L_cm + H_cm * 2;
        const s2 = W_cm + H_cm * 2;
        const s3 = s1 * s2;
        const s4 = s3 * 2;
        boardAreaPerBox = s4 / 10000;
        areaFormula = "(长 + 高×2) × (宽 + 高×2) × 2";
        areaSteps.push(
          `展开长度 = ${L_cm} + ${H_cm}×2 = ${s1} cm`,
          `展开宽度 = ${W_cm} + ${H_cm}×2 = ${s2} cm`,
          `单盖面积 = ${s1} × ${s2} = ${s3} cm²`,
          `总面积（上盖+下底）= ${s3} × 2 = ${s4} cm²`,
          `转换 = ${s4} ÷ 10000 = ${fmt(boardAreaPerBox, 4)} m²`
        );
        break;
      }
      case "天地盖带内插": {
        const ms1 = L_cm + (H_cm / 2) * 2;
        const ms2 = W_cm + (H_cm / 2) * 2;
        const ms3 = ms1 * ms2;
        const ms4 = ms3 * 2;
        const is1 = L_cm * 2 + W_cm * 2;
        const is2 = is1 * H_cm;
        const total = ms4 + is2;
        boardAreaPerBox = total / 10000;
        insertBoardArea = is2 / 10000;
        areaFormula = "主体面积 + 内插面积";
        areaSteps.push(
          `【主体】展开长 = ${L_cm} + (${H_cm}÷2)×2 = ${ms1} cm`,
          `【主体】展开宽 = ${W_cm} + (${H_cm}÷2)×2 = ${ms2} cm`,
          `【主体】单盖面积 = ${ms1} × ${ms2} = ${ms3} cm²`,
          `【主体】总面积 = ${ms3} × 2 = ${ms4} cm²`,
          `【内插】周长 = ${L_cm}×2 + ${W_cm}×2 = ${is1} cm`,
          `【内插】面积 = ${is1} × ${H_cm} = ${is2} cm²`,
          `总面积 = ${ms4} + ${is2} = ${total} cm²`,
          `转换 = ${total} ÷ 10000 = ${fmt(boardAreaPerBox, 4)} m²`
        );
        break;
      }
      case "书型盒（含磁吸）": {
        const s1 = W_cm + H_cm;
        const s2 = s1 * 2;
        const s3 = s2 * L_cm;
        boardAreaPerBox = s3 / 10000;
        areaFormula = "(宽 + 高) × 2 × 长";
        areaSteps.push(
          `展开高度 = ${W_cm} + ${H_cm} = ${s1} cm`,
          `双面展开 = ${s1} × 2 = ${s2} cm`,
          `总面积 = ${s2} × ${L_cm} = ${s3} cm²`,
          `转换 = ${s3} ÷ 10000 = ${fmt(boardAreaPerBox, 4)} m²`
        );
        break;
      }
      case "抽屉盒（含丝带）": {
        const s1 = L_cm + H_cm * 2;
        const s2 = W_cm * 2 + H_cm * 3;
        const s3 = s1 * s2;
        boardAreaPerBox = s3 / 10000;
        areaFormula = "(长 + 高×2) × (宽×2 + 高×3)";
        areaSteps.push(
          `展开长度 = ${L_cm} + ${H_cm}×2 = ${s1} cm`,
          `展开宽度 = ${W_cm}×2 + ${H_cm}×3 = ${s2} cm`,
          `总面积 = ${s1} × ${s2} = ${s3} cm²`,
          `转换 = ${s3} ÷ 10000 = ${fmt(boardAreaPerBox, 4)} m²`
        );
        break;
      }
    }

    const totalBoardArea = boardAreaPerBox + insertBoardArea;
    const paperAreaPerBox = boardAreaPerBox * PAPER_AREA_RATIO;
    const insertPaperArea = insertBoardArea * PAPER_AREA_RATIO;
    const totalPaperArea = paperAreaPerBox + insertPaperArea;

    const boardCostPerBox = totalBoardArea * BOARD_PRICE_PER_SQM;
    const totalBoardCost = boardCostPerBox * validQty;

    const paperPrice = PAPER_PRICE[paperType];
    const paperCostPerBox = totalPaperArea * paperPrice;
    const totalPaperCost = paperCostPerBox * validQty;

    const holeCostPerBox = validHoleCount * HOLE_COST_PER_UNIT;
    const totalHoleCost = holeCostPerBox * validQty;
    let linerCostPerBox = 0;
    let linerMinCost = 0;
    let linerVolume = 0;
    const linerSteps: string[] = [];

    if (linerType === "珍珠棉内衬") {
      linerVolume = L * W * (H * linerHeightRatio);
      linerCostPerBox = linerVolume * LINER_CONFIG["珍珠棉内衬"].pricePerCubicM;
      linerMinCost = LINER_CONFIG["珍珠棉内衬"].minCost;
      linerSteps.push(
        `内衬高度 = ${H_cm} × ${linerHeightRatio} = ${fmt(H_cm * linerHeightRatio)} cm`,
        `体积 = ${L_cm} × ${W_cm} × ${fmt(H_cm * linerHeightRatio)} = ${fmt(linerVolume * 1000000)} cm³ = ${fmt(linerVolume, 6)} m³`,
        `基础成本 = ${fmt(linerVolume, 6)} × 850 = ${fmt(linerCostPerBox)} 元/个`,
        `孔位费 = ${validHoleCount} × 0.2 = ${fmt(holeCostPerBox)} 元/个`
      );
    } else if (linerType === "EVA内衬") {
      linerVolume = L * W * (H * linerHeightRatio);
      linerCostPerBox = linerVolume * LINER_CONFIG["EVA内衬"].pricePerCubicM + (LINER_CONFIG["EVA内衬"].baseProcessFee || 0);
      linerMinCost = LINER_CONFIG["EVA内衬"].minCost;
      linerSteps.push(
        `内衬高度 = ${H_cm} × ${linerHeightRatio} = ${fmt(H_cm * linerHeightRatio)} cm`,
        `体积 = ${L_cm} × ${W_cm} × ${fmt(H_cm * linerHeightRatio)} = ${fmt(linerVolume * 1000000)} cm³ = ${fmt(linerVolume, 6)} m³`,
        `基础成本 = ${fmt(linerVolume, 6)} × 2100 + 0.2 = ${fmt(linerCostPerBox)} 元/个`,
        `孔位费 = ${validHoleCount} × 0.2 = ${fmt(holeCostPerBox)} 元/个`
      );
    } else {
      linerCostPerBox = boardCostPerBox / 2;
      linerMinCost = LINER_CONFIG["卡纸内衬"].minCost;
      linerSteps.push(
        `基础成本 = 灰板成本 ÷ 2 = ${fmt(boardCostPerBox)} ÷ 2 = ${fmt(linerCostPerBox)} 元/个`,
        `孔位费 = ${validHoleCount} × 0.2 = ${fmt(holeCostPerBox)} 元/个`
      );
    }

    const baseLinerCost = Math.max(linerCostPerBox * validQty, linerMinCost);
    const totalLinerCost = baseLinerCost + totalHoleCost;

    const totalBoxCost = Math.max(finalBoxPrice * validQty, ladderInfo.minPrice || 0);

    let totalCraftCost = 0;
    const craftDetails: Array<{ name: string; cost: number; desc: string }> = [];
    selectedCrafts.forEach(craftId => {
      const craft = CRAFT_TYPES.find(c => c.id === craftId)!;
      let cost = 0;
      let desc = "";
      if (craft.calcType === "perUnit") {
        const unitCost = craft.price * validQty;
        cost = Math.max(unitCost, CRAFT_START_PRICE);
        desc = `${craft.price}元/个 × ${validQty}个 = ${fmt(unitCost)}元（≥${CRAFT_START_PRICE}元）→ ${fmt(cost)}元`;
      } else {
        const area = craftAreas[craftId] || 0;
        cost = area * craft.price * validQty;
        desc = `${area}cm² × ${craft.price}元/cm² × ${validQty}个 = ${fmt(cost)}元`;
      }
      totalCraftCost += cost;
      craftDetails.push({ name: craft.name, cost, desc });
    });

    const cartonCostPerBox = validCartonCount > 0 ? (validCartonCount * CARTON_PRICE_PER_BOX) / validQty : 0.5;
    const totalCartonCost = cartonCostPerBox * validQty;

    const totalCostBeforeTax = totalBoardCost + totalPaperCost + totalLinerCost + totalBoxCost + totalCraftCost + totalCartonCost + finalMoldTotal;
    const taxAmount = totalCostBeforeTax * (validTaxRate / 100);
    const totalCost = totalCostBeforeTax + taxAmount;
    const unitCost = totalCost / validQty;
    const unitCostUsd = unitCost / validExchangeRate;
    const totalCostUsd = totalCost / validExchangeRate;

    return {
      ladderInfo, finalBoxPrice, moldFeeInfo, finalMoldTotal,
      areaFormula, areaSteps, totalBoardArea, totalPaperArea,
      boardCostPerBox, totalBoardCost, paperPrice, paperCostPerBox, totalPaperCost,
      linerCostPerBox, holeCostPerBox, totalHoleCost, baseLinerCost, totalLinerCost, linerMinCost, linerSteps,
      totalBoxCost, totalCraftCost, craftDetails,
      cartonCostPerBox, totalCartonCost,
      totalCostBeforeTax, taxAmount, totalCost, unitCost,
      unitCostUsd, totalCostUsd,
      validQty, validExchangeRate, validTaxRate, validCartonCount,
    };
  }, [surveyConfig, dimensions, orderInfo, linerParams, craftAreas]);

  const handleNumInput = (value: string) => value === "" ? 0 : Number(value);

  const allLadders = BOX_PRICE_LADDER[surveyConfig.boxType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex flex-col">
      <header className="border-b border-orange-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(surveyPath)}
              data-testid="button-edit-params"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
                礼盒自动报价器
              </h1>
              <p className="text-sm text-muted-foreground">
                {surveyConfig.boxType} · {surveyConfig.paperType} · {surveyConfig.linerType}
              </p>
            </div>
          </div>
          {!hideRestart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(homePath)}
              className="gap-1.5"
              data-testid="button-restart"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新开始
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="col-span-1">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">单个成本（含税）</div>
              <div className="text-lg font-bold text-foreground" data-testid="text-unit-cost">¥{fmt(calc.unitCost)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">≈ ${fmt(calc.unitCostUsd, 4)}</div>
            </CardContent>
          </Card>
          <Card className="col-span-1 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">总金额（含税）</div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400" data-testid="text-total-cost">¥{fmt(calc.totalCost)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">≈ ${fmt(calc.totalCostUsd)}</div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">税前总价</div>
              <div className="text-lg font-bold text-foreground">¥{fmt(calc.totalCostBeforeTax)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">税率 {calc.validTaxRate}%</div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">税额</div>
              <div className="text-lg font-bold text-foreground">¥{fmt(calc.taxAmount)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">汇率 1:{calc.validExchangeRate}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">盒型与尺寸</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">长（cm）</Label>
                <Input
                  type="number"
                  value={dimensions.length || ""}
                  onChange={(e) => setDimensions({ ...dimensions, length: handleNumInput(e.target.value) })}
                  data-testid="input-length"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">宽（cm）</Label>
                <Input
                  type="number"
                  value={dimensions.width || ""}
                  onChange={(e) => setDimensions({ ...dimensions, width: handleNumInput(e.target.value) })}
                  data-testid="input-width"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">高（cm）</Label>
                <Input
                  type="number"
                  value={dimensions.height || ""}
                  onChange={(e) => setDimensions({ ...dimensions, height: handleNumInput(e.target.value) })}
                  data-testid="input-height"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">内衬参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">内衬高度比例</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  max={1}
                  value={linerParams.linerHeightRatio || ""}
                  onChange={(e) => setLinerParams({ ...linerParams, linerHeightRatio: handleNumInput(e.target.value) })}
                  data-testid="input-liner-height-ratio"
                />
                <p className="text-xs text-muted-foreground mt-1">默认0.5，表示内衬高度为盒高的50%</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">内衬孔位数量</Label>
                <Input
                  type="number"
                  min={0}
                  value={linerParams.holeCount || ""}
                  onChange={(e) => setLinerParams({ ...linerParams, holeCount: handleNumInput(e.target.value) })}
                  data-testid="input-hole-count"
                />
                <p className="text-xs text-muted-foreground mt-1">0.2元/个孔位</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {surveyConfig.selectedCrafts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">工艺参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {surveyConfig.selectedCrafts.map(craftId => {
                const craft = CRAFT_TYPES.find(c => c.id === craftId);
                if (!craft || craft.calcType !== "perArea") return null;
                return (
                  <div key={craftId}>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {craft.name} - {"areaLabel" in craft ? craft.areaLabel : "面积（cm²）"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={craftAreas[craftId] || ""}
                      onChange={(e) => setCraftAreas(prev => ({ ...prev, [craftId]: handleNumInput(e.target.value) }))}
                      className="max-w-[200px]"
                      data-testid={`input-craft-area-${craftId}`}
                    />
                  </div>
                );
              })}
              {surveyConfig.selectedCrafts.every(id => {
                const c = CRAFT_TYPES.find(ct => ct.id === id);
                return c?.calcType !== "perArea";
              }) && (
                <p className="text-sm text-muted-foreground">已选工艺均为按个计价，无需额外参数</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">订单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
              <div>
                <div className="text-xs text-muted-foreground mb-1">当前阶梯单价</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">¥{calc.ladderInfo.price}/个</div>
                <div className="text-xs text-muted-foreground">数量：{calc.validQty}个</div>
              </div>
              {calc.ladderInfo.nextLadder && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">下一档单价（≥{calc.ladderInfo.nextLadder.qty}个）</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">¥{calc.ladderInfo.nextLadder.price}/个</div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs font-medium mb-2">阶梯价格表 - {surveyConfig.boxType}</div>
              <div className="flex flex-wrap gap-2">
                {allLadders.map((l, i) => (
                  <Badge
                    key={i}
                    variant={calc.ladderInfo.currentLadder === i ? "default" : "outline"}
                    className={calc.ladderInfo.currentLadder === i ? "bg-orange-500 border-orange-600" : ""}
                  >
                    {l.maxQty === Infinity ? `≥${l.minQty}` : `${l.minQty}-${l.maxQty}`}: ¥{l.price}
                    {l.minPrice ? ` (起步${l.minPrice})` : ""}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs font-medium mb-1">刀版+模具费用</div>
              <div className="text-sm text-muted-foreground">{calc.moldFeeInfo.desc}</div>
              <div className="text-sm font-medium mt-1">
                合计：¥{fmt(calc.moldFeeInfo.total)} - 优惠¥{orderInfo.moldDiscount} = ¥{fmt(calc.finalMoldTotal)}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">数量（个）</Label>
                <Input
                  type="number"
                  value={orderInfo.qty || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, qty: handleNumInput(e.target.value) })}
                  data-testid="input-qty"
                />
              </div>
              {orderInfo.qty >= 10000 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    自定义单价
                    <span className="text-orange-500 ml-1">（上万可议价）</span>
                  </Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={orderInfo.customBoxPrice || ""}
                    onChange={(e) => setOrderInfo({ ...orderInfo, customBoxPrice: handleNumInput(e.target.value) })}
                    data-testid="input-custom-price"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">模具费优惠（元）</Label>
                <Input
                  type="number"
                  value={orderInfo.moldDiscount || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, moldDiscount: handleNumInput(e.target.value) })}
                  data-testid="input-mold-discount"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">运输纸箱个数</Label>
                <Input
                  type="number"
                  min={0}
                  value={orderInfo.cartonCount || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, cartonCount: handleNumInput(e.target.value) })}
                  data-testid="input-carton-count"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">美元汇率</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={orderInfo.exchangeRate || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, exchangeRate: handleNumInput(e.target.value) })}
                  data-testid="input-exchange-rate"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">税率（%）</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={orderInfo.taxRate || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, taxRate: handleNumInput(e.target.value) })}
                  data-testid="input-tax-rate"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">费用明细</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CostRow
              label="一、展开面积计算"
              summary={`灰板 ${fmt(calc.totalBoardArea, 4)} m² · 面纸 ${fmt(calc.totalPaperArea, 4)} m²`}
              expanded={expandedSections["area"]}
              onToggle={() => toggleSection("area")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="font-medium text-foreground">公式：{calc.areaFormula}</div>
                {calc.areaSteps.map((s, i) => <div key={i}>{s}</div>)}
                <div className="font-medium text-foreground mt-2">
                  面纸面积 = 灰板面积 × 1.3 = {fmt(calc.totalBoardArea, 4)} × 1.3 = {fmt(calc.totalPaperArea, 4)} m²
                </div>
              </div>
            </CostRow>

            <CostRow
              label="二、灰板成本"
              summary={`${fmt(calc.boardCostPerBox)} 元/个 × ${calc.validQty} = ¥${fmt(calc.totalBoardCost)}`}
              expanded={expandedSections["board"]}
              onToggle={() => toggleSection("board")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>单盒灰板成本 = {fmt(calc.totalBoardArea, 4)} m² × {BOARD_PRICE_PER_SQM} 元/m² = {fmt(calc.boardCostPerBox)} 元/个</div>
                <div>总灰板成本 = {fmt(calc.boardCostPerBox)} × {calc.validQty} = {fmt(calc.totalBoardCost)} 元</div>
              </div>
            </CostRow>

            <CostRow
              label="三、面纸成本"
              summary={`${fmt(calc.paperCostPerBox)} 元/个 × ${calc.validQty} = ¥${fmt(calc.totalPaperCost)}`}
              expanded={expandedSections["paper"]}
              onToggle={() => toggleSection("paper")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>面纸单价 = {calc.paperPrice} 元/m²（{surveyConfig.paperType}）</div>
                <div>单盒面纸成本 = {fmt(calc.totalPaperArea, 4)} m² × {calc.paperPrice} = {fmt(calc.paperCostPerBox)} 元/个</div>
                <div>总面纸成本 = {fmt(calc.paperCostPerBox)} × {calc.validQty} = {fmt(calc.totalPaperCost)} 元</div>
              </div>
            </CostRow>

            <CostRow
              label="四、内衬成本（含孔位）"
              summary={`¥${fmt(calc.totalLinerCost)}（≥${calc.linerMinCost}元）`}
              expanded={expandedSections["liner"]}
              onToggle={() => toggleSection("liner")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="font-medium text-foreground">{surveyConfig.linerType}</div>
                {calc.linerSteps.map((s, i) => <div key={i}>{s}</div>)}
                <div className="mt-1">基础总成本 = max({fmt(calc.linerCostPerBox)} × {calc.validQty}, {calc.linerMinCost}) = {fmt(calc.baseLinerCost)} 元</div>
                <div>孔位总成本 = {fmt(calc.totalHoleCost)} 元</div>
                <div className="font-medium text-foreground">最终内衬成本 = {fmt(calc.baseLinerCost)} + {fmt(calc.totalHoleCost)} = {fmt(calc.totalLinerCost)} 元</div>
              </div>
            </CostRow>

            <CostRow
              label="五、盒型做工成本"
              summary={`${fmt(calc.finalBoxPrice)} 元/个 → ¥${fmt(calc.totalBoxCost)}`}
              expanded={expandedSections["box"]}
              onToggle={() => toggleSection("box")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>单盒做工 = {fmt(calc.finalBoxPrice)} 元/个</div>
                <div>基础总做工 = {fmt(calc.finalBoxPrice)} × {calc.validQty} = {fmt(calc.finalBoxPrice * calc.validQty)} 元</div>
                <div>最终 = max({fmt(calc.finalBoxPrice * calc.validQty)}, {calc.ladderInfo.minPrice || 0}) = {fmt(calc.totalBoxCost)} 元</div>
              </div>
            </CostRow>

            <CostRow
              label="六、特殊工艺"
              summary={calc.craftDetails.length > 0 ? `¥${fmt(calc.totalCraftCost)}` : "未选择"}
              expanded={expandedSections["craft"]}
              onToggle={() => toggleSection("craft")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                {calc.craftDetails.length === 0 ? (
                  <div>未选择任何特殊工艺</div>
                ) : (
                  <>
                    {calc.craftDetails.map((d, i) => (
                      <div key={i}>{i + 1}. {d.name}：{d.desc}</div>
                    ))}
                    <div className="font-medium text-foreground mt-1">工艺总计 = {fmt(calc.totalCraftCost)} 元</div>
                  </>
                )}
              </div>
            </CostRow>

            <CostRow
              label="七、运输纸箱"
              summary={`${fmt(calc.cartonCostPerBox)} 元/个 → ¥${fmt(calc.totalCartonCost)}`}
              expanded={expandedSections["carton"]}
              onToggle={() => toggleSection("carton")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>纸箱总成本 = {calc.validCartonCount} × {CARTON_PRICE_PER_BOX} = {calc.validCartonCount * CARTON_PRICE_PER_BOX} 元</div>
                <div>单盒纸箱成本 = {calc.validCartonCount * CARTON_PRICE_PER_BOX} ÷ {calc.validQty} = {fmt(calc.cartonCostPerBox)} 元/个</div>
              </div>
            </CostRow>

            <CostRow
              label="八、刀版+模具"
              summary={`¥${fmt(calc.finalMoldTotal)}`}
              expanded={expandedSections["mold"]}
              onToggle={() => toggleSection("mold")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>单价 = {fmt(calc.moldFeeInfo.price)} 元/个（{calc.moldFeeInfo.desc}）</div>
                <div>基础总模具 = {fmt(calc.moldFeeInfo.price)} × {calc.validQty} = {fmt(calc.moldFeeInfo.total)} 元</div>
                <div>优惠后 = {fmt(calc.moldFeeInfo.total)} - {orderInfo.moldDiscount} = {fmt(calc.finalMoldTotal)} 元</div>
              </div>
            </CostRow>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">汇总</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">灰板</span>
                <span>¥{fmt(calc.totalBoardCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">面纸</span>
                <span>¥{fmt(calc.totalPaperCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">内衬（含孔位）</span>
                <span>¥{fmt(calc.totalLinerCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">盒型做工</span>
                <span>¥{fmt(calc.totalBoxCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">特殊工艺</span>
                <span>¥{fmt(calc.totalCraftCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">运输纸箱</span>
                <span>¥{fmt(calc.totalCartonCost)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">刀版+模具</span>
                <span>¥{fmt(calc.finalMoldTotal)}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between gap-2 font-medium">
                <span>税前总计</span>
                <span>¥{fmt(calc.totalCostBeforeTax)}</span>
              </div>
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>税额（{calc.validTaxRate}%）</span>
                <span>¥{fmt(calc.taxAmount)}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between gap-2 font-bold text-base">
                <span>含税总计</span>
                <span className="text-orange-600 dark:text-orange-400">¥{fmt(calc.totalCost)}</span>
              </div>
              <div className="flex justify-between gap-2 text-muted-foreground text-xs">
                <span>单个成本</span>
                <span>¥{fmt(calc.unitCost)} ≈ ${fmt(calc.unitCostUsd, 4)}</span>
              </div>
              <div className="flex justify-between gap-2 text-muted-foreground text-xs">
                <span>美元总计（汇率1:{calc.validExchangeRate}）</span>
                <span>${fmt(calc.totalCostUsd)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function CostRow({
  label,
  summary,
  expanded,
  onToggle,
  children
}: {
  label: string;
  summary: string;
  expanded?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-md overflow-visible">
      <button
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover-elevate"
        onClick={onToggle}
        data-testid={`toggle-${label}`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground truncate">{summary}</div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t pt-2">
          {children}
        </div>
      )}
    </div>
  );
}
