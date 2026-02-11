import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getBoxPriceByQty, getMoldFeeInfo, evaluateGiftBoxAreaFormula, isValidGiftBoxFormula } from "@/lib/giftbox-config";
import { useGiftBox } from "@/lib/giftbox-store";

interface GiftBoxQuotePageProps {
  surveyPath?: string;
  homePath?: string;
  hideRestart?: boolean;
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
  const { config } = useGiftBox();

  const enabledBoxTypes = config.boxTypes.filter(b => b.enabled);
  const enabledCrafts = config.crafts.filter(c => c.enabled);

  const [selectedBoxTypeId, setSelectedBoxTypeId] = useState(enabledBoxTypes[0]?.id || "");
  const [selectedPaperId, setSelectedPaperId] = useState(config.paperTypes[0]?.id || "");
  const [selectedLinerId, setSelectedLinerId] = useState(config.linerTypes[0]?.id || "");
  const [selectedCraftIds, setSelectedCraftIds] = useState<string[]>([]);
  const [customerName] = useState(() => localStorage.getItem("customerName") || "");
  const quoteTitle = customerName ? `${customerName}自动报价器` : "礼盒自动报价器";

  useEffect(() => {
    if (!enabledBoxTypes.find(b => b.id === selectedBoxTypeId) && enabledBoxTypes.length > 0) {
      setSelectedBoxTypeId(enabledBoxTypes[0].id);
    }
  }, [enabledBoxTypes, selectedBoxTypeId]);

  useEffect(() => {
    if (!config.paperTypes.find(p => p.id === selectedPaperId) && config.paperTypes.length > 0) {
      setSelectedPaperId(config.paperTypes[0].id);
    }
  }, [config.paperTypes, selectedPaperId]);

  useEffect(() => {
    if (!config.linerTypes.find(l => l.id === selectedLinerId) && config.linerTypes.length > 0) {
      setSelectedLinerId(config.linerTypes[0].id);
    }
  }, [config.linerTypes, selectedLinerId]);

  const [dimensions, setDimensions] = useState({ length: 20, width: 10, height: 5 });
  const [linerParams, setLinerParams] = useState({ linerHeightRatio: 0.5, holeCount: 0 });
  const [craftAreas, setCraftAreas] = useState<Record<string, number>>(() => {
    const areas: Record<string, number> = {};
    config.crafts.filter(c => c.calcType === "perArea").forEach(c => { areas[c.id] = 20; });
    return areas;
  });
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

  const toggleCraft = (craftId: string) => {
    setSelectedCraftIds(prev =>
      prev.includes(craftId) ? prev.filter(id => id !== craftId) : [...prev, craftId]
    );
  };

  const selectedBoxType = config.boxTypes.find(b => b.id === selectedBoxTypeId);
  const selectedPaper = config.paperTypes.find(p => p.id === selectedPaperId);
  const selectedLiner = config.linerTypes.find(l => l.id === selectedLinerId);

  const calc = useMemo(() => {
    if (!selectedBoxType || !selectedPaper || !selectedLiner) {
      return null;
    }

    const { linerHeightRatio, holeCount } = linerParams;
    const L_cm = dimensions.length || 0;
    const W_cm = dimensions.width || 0;
    const H_cm = dimensions.height || 0;
    const validQty = orderInfo.qty || 1;
    const validCartonCount = orderInfo.cartonCount || 0;
    const validExchangeRate = orderInfo.exchangeRate || 7.2;
    const validTaxRate = orderInfo.taxRate || 13;
    const validHoleCount = holeCount || 0;

    const ladderInfo = getBoxPriceByQty(selectedBoxType.ladder, validQty);
    const finalBoxPrice = validQty >= 10000 ? orderInfo.customBoxPrice : ladderInfo.price;
    const moldFeeInfo = getMoldFeeInfo(config.moldFeeRules, validQty);
    const finalMoldTotal = Math.max(moldFeeInfo.total - orderInfo.moldDiscount, 0);

    const { areaCm2, error: formulaError } = evaluateGiftBoxAreaFormula(
      selectedBoxType.areaFormula,
      { length: L_cm, width: W_cm, height: H_cm }
    );

    const boardAreaPerBox = areaCm2 / 10000;
    const totalBoardArea = boardAreaPerBox;
    const paperAreaPerBox = boardAreaPerBox * config.paperAreaRatio;
    const totalPaperArea = paperAreaPerBox;

    const L = L_cm / 100;
    const W = W_cm / 100;
    const H = H_cm / 100;

    const boardCostPerBox = totalBoardArea * config.boardPricePerSqm;
    const totalBoardCost = boardCostPerBox * validQty;

    const paperPrice = selectedPaper.pricePerSqm;
    const paperCostPerBox = totalPaperArea * paperPrice;
    const totalPaperCost = paperCostPerBox * validQty;

    const holeCostPerBox = validHoleCount * config.holeCostPerUnit;
    const totalHoleCost = holeCostPerBox * validQty;
    let linerCostPerBox = 0;
    let linerMinCost = selectedLiner.minCost;
    let linerVolume = 0;
    const linerSteps: string[] = [];

    if (selectedLiner.calcMethod === "volume") {
      linerVolume = L * W * (H * linerHeightRatio);
      linerCostPerBox = linerVolume * selectedLiner.pricePerCubicM + selectedLiner.baseProcessFee;
      linerSteps.push(
        `内衬高度 = ${H_cm} × ${linerHeightRatio} = ${fmt(H_cm * linerHeightRatio)} cm`,
        `体积 = ${L_cm} × ${W_cm} × ${fmt(H_cm * linerHeightRatio)} = ${fmt(linerVolume * 1000000)} cm³ = ${fmt(linerVolume, 6)} m³`,
        `基础成本 = ${fmt(linerVolume, 6)} × ${selectedLiner.pricePerCubicM}${selectedLiner.baseProcessFee ? ` + ${selectedLiner.baseProcessFee}` : ""} = ${fmt(linerCostPerBox)} 元/个`,
        `孔位费 = ${validHoleCount} × ${config.holeCostPerUnit} = ${fmt(holeCostPerBox)} 元/个`
      );
    } else {
      linerCostPerBox = boardCostPerBox / 2;
      linerSteps.push(
        `基础成本 = 灰板成本 ÷ 2 = ${fmt(boardCostPerBox)} ÷ 2 = ${fmt(linerCostPerBox)} 元/个`,
        `孔位费 = ${validHoleCount} × ${config.holeCostPerUnit} = ${fmt(holeCostPerBox)} 元/个`
      );
    }

    const baseLinerCost = Math.max(linerCostPerBox * validQty, linerMinCost);
    const totalLinerCost = baseLinerCost + totalHoleCost;

    const totalBoxCost = Math.max(finalBoxPrice * validQty, ladderInfo.minPrice || 0);

    let totalCraftCost = 0;
    const craftDetails: Array<{ name: string; cost: number; desc: string }> = [];
    selectedCraftIds.forEach(craftId => {
      const craft = config.crafts.find(c => c.id === craftId);
      if (!craft) return;
      let cost = 0;
      let desc = "";
      if (craft.calcType === "perUnit") {
        const unitCost = craft.price * validQty;
        cost = Math.max(unitCost, craft.startPrice);
        desc = `${craft.price}元/个 × ${validQty}个 = ${fmt(unitCost)}元${craft.startPrice ? `（≥${craft.startPrice}元）` : ""} → ${fmt(cost)}元`;
      } else {
        const area = craftAreas[craftId] || 0;
        cost = area * craft.price * validQty;
        desc = `${area}cm² × ${craft.price}元/cm² × ${validQty}个 = ${fmt(cost)}元`;
      }
      totalCraftCost += cost;
      craftDetails.push({ name: craft.name, cost, desc });
    });

    const cartonCostPerBox = validCartonCount > 0 ? (validCartonCount * config.cartonPricePerBox) / validQty : 0.5;
    const totalCartonCost = cartonCostPerBox * validQty;

    const totalCostBeforeTax = totalBoardCost + totalPaperCost + totalLinerCost + totalBoxCost + totalCraftCost + totalCartonCost + finalMoldTotal;
    const taxAmount = totalCostBeforeTax * (validTaxRate / 100);
    const totalCost = totalCostBeforeTax + taxAmount;
    const unitCost = totalCost / validQty;
    const unitCostUsd = unitCost / validExchangeRate;
    const totalCostUsd = totalCost / validExchangeRate;

    return {
      ladderInfo, finalBoxPrice, moldFeeInfo, finalMoldTotal,
      areaCm2, formulaError, totalBoardArea, totalPaperArea,
      boardCostPerBox, totalBoardCost, paperPrice, paperCostPerBox, totalPaperCost,
      linerCostPerBox, holeCostPerBox, totalHoleCost, baseLinerCost, totalLinerCost, linerMinCost, linerSteps,
      totalBoxCost, totalCraftCost, craftDetails,
      cartonCostPerBox, totalCartonCost,
      totalCostBeforeTax, taxAmount, totalCost, unitCost,
      unitCostUsd, totalCostUsd,
      validQty, validExchangeRate, validTaxRate, validCartonCount,
    };
  }, [config, selectedBoxType, selectedPaper, selectedLiner, selectedCraftIds, dimensions, orderInfo, linerParams, craftAreas]);

  const handleNumInput = (value: string) => value === "" ? 0 : Number(value);

  if (!calc || !selectedBoxType || !selectedPaper || !selectedLiner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">请先配置报价器参数</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
                {quoteTitle}
              </h1>
              <Badge variant="secondary">礼盒</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(surveyPath)} className="gap-2" data-testid="button-edit-params">
                <Edit className="w-4 h-4" />
                编辑参数
              </Button>
              {!hideRestart && (
                <Button variant="outline" size="sm" onClick={() => navigate(homePath)} className="gap-2" data-testid="button-restart">
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold section-title">盒型与尺寸</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">盒型</Label>
                <Select value={selectedBoxTypeId} onValueChange={setSelectedBoxTypeId}>
                  <SelectTrigger data-testid="select-box-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledBoxTypes.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <CardTitle className="text-base font-semibold section-title">订单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-primary/5 border border-primary/20">
              <div>
                <div className="text-xs text-muted-foreground mb-1">当前阶梯价格</div>
                <div>
                  <div className="text-xs text-muted-foreground">当前单价</div>
                  <div className="text-xl font-bold text-primary">¥{calc.finalBoxPrice}</div>
                  <div className="text-xs text-muted-foreground">（数量：{calc.validQty}个）</div>
                </div>
              </div>
              {calc.ladderInfo.nextLadder && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">&nbsp;</div>
                  <div>
                    <div className="text-xs text-muted-foreground">下一档单价（≥{calc.ladderInfo.nextLadder.qty}个）</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">¥{calc.ladderInfo.nextLadder.price}</div>
                  </div>
                </div>
              )}
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
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">模具费额外优惠（元）</Label>
                <Input
                  type="number"
                  value={orderInfo.moldDiscount || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, moldDiscount: handleNumInput(e.target.value) })}
                  data-testid="input-mold-discount"
                />
              </div>
              {orderInfo.qty >= 10000 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    自定义单价
                    <span className="text-primary ml-1">（上万可议价）</span>
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
                <Label className="text-xs text-muted-foreground mb-1 block">美元汇率（默认7.2）</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={orderInfo.exchangeRate || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, exchangeRate: handleNumInput(e.target.value) })}
                  data-testid="input-exchange-rate"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">税率（%，默认13）</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={orderInfo.taxRate || ""}
                  onChange={(e) => setOrderInfo({ ...orderInfo, taxRate: handleNumInput(e.target.value) })}
                  data-testid="input-tax-rate"
                />
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-sm font-semibold text-primary mb-1">刀版+模具费用</div>
              <div className="text-sm">当前单价：¥{calc.moldFeeInfo.price}/个</div>
              <div className="text-xs text-muted-foreground">{calc.moldFeeInfo.desc}</div>
              <div className="text-sm font-medium mt-1">
                合计：¥{fmt(calc.moldFeeInfo.total)} - 优惠¥{orderInfo.moldDiscount} = ¥{fmt(calc.finalMoldTotal)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold section-title">材料配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">面纸类型</Label>
                <Select value={selectedPaperId} onValueChange={setSelectedPaperId}>
                  <SelectTrigger data-testid="select-paper-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.paperTypes.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">内衬类型</Label>
                <Select value={selectedLinerId} onValueChange={setSelectedLinerId}>
                  <SelectTrigger data-testid="select-liner-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.linerTypes.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">内衬高度比例（默认0.5）</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  max={1}
                  value={linerParams.linerHeightRatio || ""}
                  onChange={(e) => setLinerParams({ ...linerParams, linerHeightRatio: handleNumInput(e.target.value) })}
                  data-testid="input-liner-height-ratio"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">内衬孔位数量（{config.holeCostPerUnit}元/个）</Label>
                <Input
                  type="number"
                  min={0}
                  value={linerParams.holeCount || ""}
                  onChange={(e) => setLinerParams({ ...linerParams, holeCount: handleNumInput(e.target.value) })}
                  data-testid="input-hole-count"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {enabledCrafts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold section-title">特殊工艺</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {enabledCrafts.map(craft => {
                  const isSelected = selectedCraftIds.includes(craft.id);
                  return (
                    <div
                      key={craft.id}
                      className="border rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{craft.name}</div>
                          <div className="text-xs text-muted-foreground">{craft.desc}</div>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCraft(craft.id)}
                          data-testid={`checkbox-craft-${craft.id}`}
                        />
                      </div>
                      {isSelected && craft.calcType === "perArea" && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            {craft.areaLabel || "面积（cm²）"}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={craftAreas[craft.id] || ""}
                            onChange={(e) => setCraftAreas(prev => ({ ...prev, [craft.id]: handleNumInput(e.target.value) }))}
                            data-testid={`input-craft-area-${craft.id}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-0" data-testid="calculation-breakdown">
          <div className="summary-panel mb-8">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap tracking-tight">
              <CheckCircle2 className="w-5 h-5 text-primary" /> 报价汇总 & 完整成本计算明细
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-5 border rounded-[10px]" data-testid="card-pretax">
                <div className="text-sm text-muted-foreground mb-2 font-semibold uppercase tracking-wide">税前单价</div>
                <div className="price-main">¥{fmt(calc.totalCostBeforeTax / calc.validQty, 4)} <span className="text-lg">/个</span></div>
                <div className="price-unit mt-2">≈ ${fmt(calc.totalCostBeforeTax / calc.validExchangeRate / calc.validQty, 4)}/pc</div>
                <div className="breakdown-divider"></div>
                <div className="price-unit font-medium">总价：¥{fmt(calc.totalCostBeforeTax)} ≈ ${fmt(calc.totalCostBeforeTax / calc.validExchangeRate)}</div>
              </div>
              <div className="p-5 border-2 border-primary rounded-[10px] bg-primary/5" data-testid="card-final-price">
                <div className="text-sm text-primary mb-2 font-semibold uppercase tracking-wide">含税含模具（最终价 含{calc.validTaxRate}%税）</div>
                <div className="price-main" data-testid="text-unit-cost">¥{fmt(calc.unitCost, 4)} <span className="text-lg">/个</span></div>
                <div className="price-unit mt-2 text-primary font-medium">≈ ${fmt(calc.unitCostUsd, 4)}/pc</div>
                <div className="breakdown-divider"></div>
                <div className="price-unit text-primary font-medium" data-testid="text-total-cost">总价：¥{fmt(calc.totalCost)} ≈ ${fmt(calc.totalCostUsd)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm mt-5" data-testid="cost-breakdown-grid">
              <div className="p-3 rounded-md border" data-testid="cost-board">
                <div className="text-muted-foreground text-xs">灰板</div>
                <div className="font-semibold">{fmt(calc.boardCostPerBox, 4)}</div>
              </div>
              <div className="p-3 rounded-md border" data-testid="cost-paper">
                <div className="text-muted-foreground text-xs">面纸</div>
                <div className="font-semibold">{fmt(calc.paperCostPerBox, 4)}</div>
              </div>
              <div className="p-3 rounded-md border" data-testid="cost-liner">
                <div className="text-muted-foreground text-xs">内衬</div>
                <div className="font-semibold">{fmt(calc.totalLinerCost / calc.validQty, 4)}</div>
              </div>
              <div className="p-3 rounded-md border" data-testid="cost-workmanship">
                <div className="text-muted-foreground text-xs">做工</div>
                <div className="font-semibold">{fmt(calc.totalBoxCost / calc.validQty, 4)}</div>
              </div>
              {calc.totalCraftCost > 0 && (
                <div className="p-3 rounded-md border" data-testid="cost-craft">
                  <div className="text-muted-foreground text-xs">工艺</div>
                  <div className="font-semibold">{fmt(calc.totalCraftCost / calc.validQty, 4)}</div>
                </div>
              )}
              <div className="p-3 rounded-md border" data-testid="cost-carton">
                <div className="text-muted-foreground text-xs">纸箱</div>
                <div className="font-semibold">{fmt(calc.cartonCostPerBox, 4)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 p-3 rounded-md border" data-testid="card-mold-fee">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">模具费（单独）</div>
                <div className="text-xs text-muted-foreground mt-1">{calc.moldFeeInfo.desc}</div>
              </div>
              <div className="font-bold text-base">¥{fmt(calc.finalMoldTotal)}</div>
            </div>

            <div className="mt-5 text-sm font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
              <Sparkles className="w-4 h-4 text-primary" /> 核心规则：各项成本累加 = 税前总成本 → × (1+税率) = 含税成本 → + 模具费 = 最终价
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">1</Badge> 展开面积计算
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                {isValidGiftBoxFormula(selectedBoxType.areaFormula) ? (
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>公式：{selectedBoxType.areaFormula}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-destructive flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                    <span>公式格式无效，请返回配置页修改</span>
                  </div>
                )}
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>展开面积 = {fmt(calc.areaCm2)} cm² = {fmt(calc.totalBoardArea, 4)} m²</span>
                </div>
                {calc.formulaError && (
                  <div className="flex items-start gap-2 text-destructive font-medium flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                    <span>公式计算出错，请检查公式格式</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>灰板面积 = {fmt(calc.totalBoardArea, 4)} m² | 面纸面积 = {fmt(calc.totalBoardArea, 4)} × {config.paperAreaRatio} = {fmt(calc.totalPaperArea, 4)} m²</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">2</Badge> 灰板成本
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>单盒灰板成本 = {fmt(calc.totalBoardArea, 4)} m² × {config.boardPricePerSqm} 元/m² = {fmt(calc.boardCostPerBox)} 元/个</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>总灰板成本 = {fmt(calc.boardCostPerBox)} × {calc.validQty} = {fmt(calc.totalBoardCost)} 元</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">3</Badge> 面纸成本
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>面纸单价 = {calc.paperPrice} 元/m²（{selectedPaper.name}）</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>单盒面纸成本 = {fmt(calc.totalPaperArea, 4)} m² × {calc.paperPrice} = {fmt(calc.paperCostPerBox)} 元/个</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>总面纸成本 = {fmt(calc.paperCostPerBox)} × {calc.validQty} = {fmt(calc.totalPaperCost)} 元</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">4</Badge> 内衬成本（含孔位）
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>内衬类型：{selectedLiner.name}</span>
                </div>
                {calc.linerSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>基础总成本 = max({fmt(calc.linerCostPerBox)} × {calc.validQty}, {calc.linerMinCost}) = {fmt(calc.baseLinerCost)} 元</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>总内衬成本 = {fmt(calc.baseLinerCost)} + {fmt(calc.totalHoleCost)} = {fmt(calc.totalLinerCost)} 元</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">5</Badge> 做工费
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>阶梯单价 = ¥{calc.finalBoxPrice}/个</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>做工总成本 = max({calc.finalBoxPrice} × {calc.validQty}, {calc.ladderInfo.minPrice || 0}) = {fmt(calc.totalBoxCost)} 元</span>
                </div>
              </div>
            </div>

            {calc.craftDetails.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">6</Badge> 特殊工艺
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  {calc.craftDetails.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 flex-wrap">
                      <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                      <span>{d.name}：{d.desc}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>特殊工艺总成本 = {fmt(calc.totalCraftCost)} 元</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">{calc.craftDetails.length > 0 ? "7" : "6"}</Badge> 运输纸箱
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>纸箱数 = {calc.validCartonCount} 个 × {config.cartonPricePerBox} 元/个</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>分摊到每个盒子 = {fmt(calc.cartonCostPerBox)} 元/个 | 总计 = {fmt(calc.totalCartonCost)} 元</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">{calc.craftDetails.length > 0 ? "8" : "7"}</Badge> 刀版+模具
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>{calc.moldFeeInfo.desc}</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>模具费合计 = ¥{fmt(calc.moldFeeInfo.total)} - 优惠¥{orderInfo.moldDiscount} = ¥{fmt(calc.finalMoldTotal)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-xs">{calc.craftDetails.length > 0 ? "9" : "8"}</Badge> 税费计算
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>不含税总价：¥{fmt(calc.totalCostBeforeTax)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>税率：{calc.validTaxRate}%</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>税额 = 不含税总价 × 税率 = ¥{fmt(calc.totalCostBeforeTax)} × {calc.validTaxRate}% = ¥{fmt(calc.totalCostBeforeTax * calc.validTaxRate / 100)}</span>
                </div>
                <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>含税总价 = 不含税总价 + 税额 = ¥{fmt(calc.totalCostBeforeTax)} + ¥{fmt(calc.totalCostBeforeTax * calc.validTaxRate / 100)} = ¥{fmt(calc.totalCost)}</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-destructive pt-4 mt-6">
              <h3 className="text-base font-bold text-destructive mb-3 flex items-center gap-2 flex-wrap">
                <Sparkles className="w-4 h-4 shrink-0" /> 总成本汇总
              </h3>
              <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>灰板成本：¥{fmt(calc.totalBoardCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>面纸成本：¥{fmt(calc.totalPaperCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>内衬成本（含孔位）：¥{fmt(calc.totalLinerCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>盒型做工成本：¥{fmt(calc.totalBoxCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>特殊工艺成本：¥{fmt(calc.totalCraftCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>运输纸箱成本：¥{fmt(calc.totalCartonCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>刀版+模具成本：¥{fmt(calc.finalMoldTotal)}</span>
                </div>
                <div className="flex items-start gap-2 font-medium flex-wrap mt-2">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>不含税总成本：¥{fmt(calc.totalCostBeforeTax)}</span>
                </div>
                <div className="flex items-start gap-2 font-medium flex-wrap">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>税额：¥{fmt(calc.totalCostBeforeTax * calc.validTaxRate / 100)}（税率{calc.validTaxRate}%）</span>
                </div>
                <div className="breakdown-divider"></div>
                <div className="flex items-start gap-2 text-destructive font-bold flex-wrap">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>含税总成本 = ¥{fmt(calc.totalCost)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="font-medium">单个成本（含税） = 含税总成本 ÷ 数量 = ¥{fmt(calc.totalCost)} ÷ {calc.validQty} = ¥{fmt(calc.unitCost, 4)}</span>
                </div>
                <div className="flex items-start gap-2 flex-wrap mt-1">
                  <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                  <span>美金换算（汇率 {calc.validExchangeRate}）：¥{fmt(calc.unitCost, 4)} ÷ {calc.validExchangeRate} = ${fmt(calc.unitCostUsd, 4)}/pc | 总计 ≈ ${fmt(calc.totalCostUsd)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      {!hideRestart && (
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          礼盒报价器 · 实时计算
        </footer>
      )}
    </div>
  );
}

function CostRow({
  label,
  summary,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  summary: string;
  expanded?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover-elevate"
        data-testid={`toggle-${label}`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground truncate">{summary}</div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {expanded && <div className="px-3 pb-3 border-t pt-2">{children}</div>}
    </div>
  );
}
