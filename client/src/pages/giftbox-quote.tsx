import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getBoxPriceByQty, getMoldFeeInfo, evaluateGiftBoxAreaFormula } from "@/lib/giftbox-config";
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
                {selectedBoxType.name} · {selectedPaper.name} · {selectedLiner.name}
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base section-title">费用明细</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CostRow
              label="一、展开面积计算"
              summary={`灰板 ${fmt(calc.totalBoardArea, 4)} m² · 面纸 ${fmt(calc.totalPaperArea, 4)} m²`}
              expanded={expandedSections["area"]}
              onToggle={() => toggleSection("area")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="font-medium text-foreground">公式：{selectedBoxType.areaFormula}</div>
                <div>展开面积 = {fmt(calc.areaCm2)} cm² = {fmt(calc.totalBoardArea, 4)} m²</div>
                {calc.formulaError && (
                  <div className="text-destructive font-medium">公式计算出错，请检查公式格式</div>
                )}
                <div className="font-medium text-foreground mt-2">
                  面纸面积 = 灰板面积 × {config.paperAreaRatio} = {fmt(calc.totalBoardArea, 4)} × {config.paperAreaRatio} = {fmt(calc.totalPaperArea, 4)} m²
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
                <div>单盒灰板成本 = {fmt(calc.totalBoardArea, 4)} m² × {config.boardPricePerSqm} 元/m² = {fmt(calc.boardCostPerBox)} 元/个</div>
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
                <div>面纸单价 = {calc.paperPrice} 元/m²（{selectedPaper.name}）</div>
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
                <div className="font-medium text-foreground">内衬类型：{selectedLiner.name}</div>
                {calc.linerSteps.map((s, i) => <div key={i}>{s}</div>)}
                <div className="font-medium text-foreground mt-1">
                  基础总成本 = max({fmt(calc.linerCostPerBox)} × {calc.validQty}, {calc.linerMinCost}) = {fmt(calc.baseLinerCost)} 元
                </div>
                <div>总内衬成本 = {fmt(calc.baseLinerCost)} + {fmt(calc.totalHoleCost)} = {fmt(calc.totalLinerCost)} 元</div>
              </div>
            </CostRow>

            <CostRow
              label="五、做工费"
              summary={`¥${calc.finalBoxPrice}/个 × ${calc.validQty} = ¥${fmt(calc.totalBoxCost)}`}
              expanded={expandedSections["box"]}
              onToggle={() => toggleSection("box")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>阶梯单价 = ¥{calc.finalBoxPrice}/个</div>
                <div>做工总成本 = max({calc.finalBoxPrice} × {calc.validQty}, {calc.ladderInfo.minPrice || 0}) = {fmt(calc.totalBoxCost)} 元</div>
              </div>
            </CostRow>

            {calc.craftDetails.length > 0 && (
              <CostRow
                label="六、特殊工艺"
                summary={`¥${fmt(calc.totalCraftCost)}`}
                expanded={expandedSections["craft"]}
                onToggle={() => toggleSection("craft")}
              >
                <div className="text-xs space-y-1 text-muted-foreground">
                  {calc.craftDetails.map((d, i) => (
                    <div key={i}>
                      <span className="font-medium text-foreground">{d.name}：</span>{d.desc}
                    </div>
                  ))}
                </div>
              </CostRow>
            )}

            <CostRow
              label={calc.craftDetails.length > 0 ? "七、运输纸箱" : "六、运输纸箱"}
              summary={`${fmt(calc.cartonCostPerBox)} 元/个 × ${calc.validQty} = ¥${fmt(calc.totalCartonCost)}`}
              expanded={expandedSections["carton"]}
              onToggle={() => toggleSection("carton")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>纸箱数 = {calc.validCartonCount} 个 × {config.cartonPricePerBox} 元/个</div>
                <div>分摊到每个盒子 = {fmt(calc.cartonCostPerBox)} 元/个</div>
              </div>
            </CostRow>

            <CostRow
              label={calc.craftDetails.length > 0 ? "八、刀版+模具" : "七、刀版+模具"}
              summary={`¥${fmt(calc.finalMoldTotal)}`}
              expanded={expandedSections["mold"]}
              onToggle={() => toggleSection("mold")}
            >
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>{calc.moldFeeInfo.desc}</div>
                <div>模具费合计 = ¥{fmt(calc.moldFeeInfo.total)} - 优惠¥{orderInfo.moldDiscount} = ¥{fmt(calc.finalMoldTotal)}</div>
              </div>
            </CostRow>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="p-3 rounded-md border" data-testid="card-pretax">
                <div className="text-xs font-semibold text-muted-foreground">
                  税前单价
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-bold">¥{fmt(calc.totalCostBeforeTax / calc.validQty, 4)}/个</span>
                </div>
                <div className="text-sm">
                  总价：<span className="font-bold">¥{fmt(calc.totalCostBeforeTax)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ≈ ${fmt(calc.totalCostBeforeTax / calc.validExchangeRate)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-md border" data-testid="card-withtax">
                <div className="text-xs font-semibold text-muted-foreground">
                  含税价（{calc.validTaxRate}%）
                </div>
                <div className="mt-1 text-sm">
                  <span className="font-bold">¥{fmt(calc.unitCost, 4)}/个</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ≈ ${fmt(calc.unitCostUsd, 4)}/个
                  </span>
                </div>
                <div className="text-sm">
                  总价：<span className="font-bold">¥{fmt(calc.totalCost)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ≈ ${fmt(calc.totalCostUsd)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-md border border-destructive bg-destructive/5" data-testid="card-final-price">
                <div className="text-xs font-semibold text-destructive">
                  含税含模具（最终价）
                </div>
                <div className="mt-1 text-sm text-destructive">
                  单价：<span className="font-bold" data-testid="text-unit-cost">¥{fmt(calc.unitCost, 4)}/个</span>
                  <span className="ml-1 text-xs opacity-80">
                    ≈ ${fmt(calc.unitCostUsd, 4)}/个
                  </span>
                </div>
                <div className="text-sm text-destructive">
                  总价：<span className="font-bold" data-testid="text-total-cost">¥{fmt(calc.totalCost)}</span>
                  <span className="ml-1 text-xs opacity-80">
                    ≈ ${fmt(calc.totalCostUsd)} USD
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-md border">
                <div className="text-xs font-semibold text-muted-foreground">模具费（单独）</div>
                <div className="mt-1 text-sm">
                  <span className="font-bold">¥{fmt(calc.finalMoldTotal)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{calc.moldFeeInfo.desc}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm" data-testid="cost-breakdown-grid">
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground text-xs">灰板</div>
                <div className="font-semibold">{fmt(calc.boardCostPerBox, 4)}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground text-xs">面纸</div>
                <div className="font-semibold">{fmt(calc.paperCostPerBox, 4)}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground text-xs">内衬</div>
                <div className="font-semibold">{fmt(calc.totalLinerCost / calc.validQty, 4)}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground text-xs">做工</div>
                <div className="font-semibold">{fmt(calc.totalBoxCost / calc.validQty, 4)}</div>
              </div>
              {calc.totalCraftCost > 0 && (
                <div className="p-3 rounded-md border">
                  <div className="text-muted-foreground text-xs">工艺</div>
                  <div className="font-semibold">{fmt(calc.totalCraftCost / calc.validQty, 4)}</div>
                </div>
              )}
              <div className="p-3 rounded-md border">
                <div className="text-muted-foreground text-xs">纸箱</div>
                <div className="font-semibold">{fmt(calc.cartonCostPerBox, 4)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
