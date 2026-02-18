import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Edit, RefreshCw, CheckCircle2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluateSoftBoxAreaFormula, isValidSoftBoxFormula } from "@/lib/softbox-config";
import { useSoftBox } from "@/lib/softbox-store";
import { ShareQuoteButton } from "@/components/share-quote-button";

interface SoftBoxQuotePageProps {
  surveyPath?: string;
  homePath?: string;
  hideRestart?: boolean;
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export default function SoftBoxQuotePage({
  surveyPath = "/softbox/survey",
  homePath = "/",
  hideRestart = false,
}: SoftBoxQuotePageProps) {
  const [, navigate] = useLocation();
  const { config } = useSoftBox();

  const enabledBoxTypes = config.boxTypes.filter(b => b.enabled);
  const enabledPrinting = config.printingSides.filter(p => p.enabled);
  const facePapers = config.facePapers || [];
  const laminationOptions = config.laminationOptions || [];
  const laminationMinCharge = config.laminationMinCharge || 0;
  const gluing = config.gluing || { feePerBox: 0, minCharge: 0 };

  const [selectedBoxTypeId, setSelectedBoxTypeId] = useState(enabledBoxTypes[0]?.id || "");
  const [selectedPrintingId, setSelectedPrintingId] = useState(enabledPrinting[0]?.id || "");
  const [selectedFacePaperId, setSelectedFacePaperId] = useState(facePapers[0]?.id || "");
  const [selectedLaminationId, setSelectedLaminationId] = useState(laminationOptions[0]?.id || "");
  const [customerName] = useState(() => localStorage.getItem("customerName") || "");
  const quoteTitle = customerName ? `${customerName} - 报价器生成器 - 软盒` : "报价器生成器 - 软盒";

  useEffect(() => {
    if (!enabledBoxTypes.find(b => b.id === selectedBoxTypeId) && enabledBoxTypes.length > 0) {
      setSelectedBoxTypeId(enabledBoxTypes[0].id);
    }
  }, [enabledBoxTypes, selectedBoxTypeId]);

  useEffect(() => {
    if (!enabledPrinting.find(p => p.id === selectedPrintingId) && enabledPrinting.length > 0) {
      setSelectedPrintingId(enabledPrinting[0].id);
    }
  }, [enabledPrinting, selectedPrintingId]);

  useEffect(() => {
    if (!facePapers.find(fp => fp.id === selectedFacePaperId) && facePapers.length > 0) {
      setSelectedFacePaperId(facePapers[0].id);
    }
  }, [facePapers, selectedFacePaperId]);

  useEffect(() => {
    if (!laminationOptions.find(lo => lo.id === selectedLaminationId) && laminationOptions.length > 0) {
      setSelectedLaminationId(laminationOptions[0].id);
    }
  }, [laminationOptions, selectedLaminationId]);

  const [dimensions, setDimensions] = useState({ length: 20, width: 15, height: 5 });
  const [orderInfo, setOrderInfo] = useState({
    qty: 1000,
    exchangeRate: 7.2,
    taxRate: 13,
    profitRate: 0,
  });

  const handleNumInput = (value: string) => value === "" ? 0 : Number(value);

  const selectedBoxType = config.boxTypes.find(b => b.id === selectedBoxTypeId);
  const selectedPrinting = config.printingSides.find(p => p.id === selectedPrintingId);
  const selectedFacePaper = facePapers.find(fp => fp.id === selectedFacePaperId);
  const selectedLamination = laminationOptions.find(lo => lo.id === selectedLaminationId);

  const calc = useMemo(() => {
    if (!selectedBoxType) return null;

    const L_cm = dimensions.length || 0;
    const W_cm = dimensions.width || 0;
    const H_cm = dimensions.height || 0;
    const validQty = orderInfo.qty || 1;
    const validExchangeRate = orderInfo.exchangeRate || 7.2;
    const validTaxRate = orderInfo.taxRate || 13;
    const validProfitRate = orderInfo.profitRate || 0;

    const { areaCm2, error: formulaError } = evaluateSoftBoxAreaFormula(
      selectedBoxType.areaFormula,
      { length: L_cm, width: W_cm, height: H_cm }
    );

    const areaSqm = areaCm2 / 10000;

    const facePaperPrice = selectedFacePaper?.pricePerSqm || 0;
    const paperCostPerBox = areaSqm * facePaperPrice;
    const totalPaperCost = paperCostPerBox * validQty;

    const printingPrice = selectedPrinting?.pricePerSqm || 0;
    const printingCostPerBox = areaSqm * printingPrice;
    const totalPrintingCost = printingCostPerBox * validQty;

    const lamPricePerSqm = selectedLamination?.pricePerSqm || 0;
    const lamCostRaw = areaSqm * lamPricePerSqm * validQty;
    const totalLaminationCost = lamPricePerSqm > 0 ? Math.max(lamCostRaw, laminationMinCharge) : 0;
    const lamCostPerBox = totalLaminationCost / validQty;
    const lamUsedMin = lamPricePerSqm > 0 && lamCostRaw < laminationMinCharge;

    const gluingMinPerBox = gluing.minCharge > 0 ? gluing.minCharge / validQty : 0;
    const gluingCostPerBox = gluing.feePerBox > 0 || gluing.minCharge > 0 ? Math.max(gluing.feePerBox, gluingMinPerBox) : 0;
    const totalGluingCost = gluingCostPerBox * validQty;
    const gluingUsedMin = (gluing.feePerBox > 0 || gluing.minCharge > 0) && gluingMinPerBox > gluing.feePerBox;

    const baseCost = totalPaperCost + totalPrintingCost + totalLaminationCost + totalGluingCost;
    const profitAmount = baseCost * (validProfitRate / 100);
    const totalBeforeTax = baseCost + profitAmount;
    const taxAmount = totalBeforeTax * (validTaxRate / 100);
    const totalCost = totalBeforeTax + taxAmount;
    const unitCost = totalCost / validQty;
    const unitCostUsd = unitCost / validExchangeRate;
    const totalCostUsd = totalCost / validExchangeRate;

    return {
      areaCm2, areaSqm, formulaError,
      facePaperPrice, paperCostPerBox, totalPaperCost,
      printingPrice, printingCostPerBox, totalPrintingCost,
      lamPricePerSqm, lamCostRaw, totalLaminationCost, lamCostPerBox, lamUsedMin,
      gluingMinPerBox, totalGluingCost, gluingCostPerBox, gluingUsedMin,
      baseCost, profitAmount, totalBeforeTax,
      taxAmount, totalCost, unitCost, unitCostUsd, totalCostUsd,
      validQty, validExchangeRate, validTaxRate, validProfitRate,
    };
  }, [selectedBoxType, selectedPrinting, selectedFacePaper, selectedLamination, dimensions, orderInfo, config, laminationMinCharge, gluing]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-quote-title">
                {quoteTitle}
              </h1>
              <Badge variant="secondary">软盒</Badge>
            </div>
            <div className="flex items-center gap-2">
              <ShareQuoteButton quoteType="softbox" customerName={customerName} configData={config} />
              {surveyPath && (
                <Button variant="outline" size="sm" onClick={() => navigate(surveyPath)} className="gap-2" data-testid="button-edit-params">
                  <Edit className="w-4 h-4" />
                  编辑参数
                </Button>
              )}
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
                  <SelectTrigger data-testid="select-boxtype">
                    <SelectValue placeholder="选择盒型" />
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
                  onChange={(e) => setDimensions(p => ({ ...p, length: handleNumInput(e.target.value) }))}
                  data-testid="input-length"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">宽（cm）</Label>
                <Input
                  type="number"
                  value={dimensions.width || ""}
                  onChange={(e) => setDimensions(p => ({ ...p, width: handleNumInput(e.target.value) }))}
                  data-testid="input-width"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">高（cm）</Label>
                <Input
                  type="number"
                  value={dimensions.height || ""}
                  onChange={(e) => setDimensions(p => ({ ...p, height: handleNumInput(e.target.value) }))}
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
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">数量（个）</Label>
                <Input
                  type="number"
                  value={orderInfo.qty || ""}
                  onChange={(e) => setOrderInfo(p => ({ ...p, qty: handleNumInput(e.target.value) }))}
                  data-testid="input-qty"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">利润率（%）</Label>
                <Input
                  type="number"
                  value={orderInfo.profitRate || ""}
                  onChange={(e) => setOrderInfo(p => ({ ...p, profitRate: handleNumInput(e.target.value) }))}
                  data-testid="input-profit-rate"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">美元汇率（默认7.2）</Label>
                <Input
                  type="number"
                  step={0.01}
                  value={orderInfo.exchangeRate || ""}
                  onChange={(e) => setOrderInfo(p => ({ ...p, exchangeRate: handleNumInput(e.target.value) }))}
                  data-testid="input-exchange-rate"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">税率（%，默认13）</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={orderInfo.taxRate || ""}
                  onChange={(e) => setOrderInfo(p => ({ ...p, taxRate: handleNumInput(e.target.value) }))}
                  data-testid="input-tax-rate"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {facePapers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold section-title">材料配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">面纸类型</Label>
                <Select value={selectedFacePaperId} onValueChange={setSelectedFacePaperId}>
                  <SelectTrigger className="max-w-xs" data-testid="select-facepaper">
                    <SelectValue placeholder="选择面纸" />
                  </SelectTrigger>
                  <SelectContent>
                    {facePapers.map(fp => (
                      <SelectItem key={fp.id} value={fp.id}>{fp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFacePaper && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    单价：{selectedFacePaper.pricePerSqm} 元/m²
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {enabledPrinting.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold section-title">印刷方式</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPrintingId} onValueChange={setSelectedPrintingId}>
                <SelectTrigger className="max-w-xs" data-testid="select-printing">
                  <SelectValue placeholder="选择印刷方式" />
                </SelectTrigger>
                <SelectContent>
                  {enabledPrinting.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPrinting && (
                <p className="mt-2 text-sm text-muted-foreground">
                  单价：{selectedPrinting.pricePerSqm} 元/m²
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {laminationOptions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold section-title">覆膜</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedLaminationId} onValueChange={setSelectedLaminationId}>
                <SelectTrigger className="max-w-xs" data-testid="select-lamination">
                  <SelectValue placeholder="选择覆膜方式" />
                </SelectTrigger>
                <SelectContent>
                  {laminationOptions.map(lo => (
                    <SelectItem key={lo.id} value={lo.id}>{lo.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLamination && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedLamination.pricePerSqm > 0
                    ? `单价：${selectedLamination.pricePerSqm} 元/m²，最低消费：¥${laminationMinCharge}`
                    : "不覆膜"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {(gluing.feePerBox > 0 || gluing.minCharge > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold section-title">糊盒</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                每盒费用：{gluing.feePerBox} 元/个，最低消费：¥{gluing.minCharge}
              </p>
            </CardContent>
          </Card>
        )}

        {calc && !calc.formulaError && (
          <div className="space-y-0" data-testid="calculation-breakdown">
            <div className="summary-panel mb-8">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap tracking-tight">
                <CheckCircle2 className="w-5 h-5 text-primary" /> 报价汇总 & 完整成本计算明细
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-5 border rounded-[10px]" data-testid="card-pretax">
                  <div className="text-sm text-muted-foreground mb-2 font-semibold uppercase tracking-wide">税前单价</div>
                  <div className="price-main">¥{fmt(calc.totalBeforeTax / calc.validQty, 4)} <span className="text-lg">/个</span></div>
                  <div className="price-unit mt-2">≈ ${fmt(calc.totalBeforeTax / calc.validExchangeRate / calc.validQty, 4)}/pc</div>
                  <div className="breakdown-divider"></div>
                  <div className="price-unit font-medium">总价：¥{fmt(calc.totalBeforeTax)} ≈ ${fmt(calc.totalBeforeTax / calc.validExchangeRate)}</div>
                </div>
                <div className="p-5 border-2 border-primary rounded-[10px] bg-primary/5" data-testid="card-final-price">
                  <div className="text-sm text-primary mb-2 font-semibold uppercase tracking-wide">含税最终价（含{calc.validTaxRate}%税）</div>
                  <div className="price-main" data-testid="text-unit-cost">¥{fmt(calc.unitCost, 4)} <span className="text-lg">/个</span></div>
                  <div className="price-unit mt-2 text-primary font-medium">≈ ${fmt(calc.unitCostUsd, 4)}/pc</div>
                  <div className="breakdown-divider"></div>
                  <div className="price-unit text-primary font-medium" data-testid="text-total-cost">总价：¥{fmt(calc.totalCost)} ≈ ${fmt(calc.totalCostUsd)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mt-5" data-testid="cost-breakdown-grid">
                <div className="p-3 rounded-md border" data-testid="cost-paper">
                  <div className="text-muted-foreground text-xs">纸张</div>
                  <div className="font-semibold">{fmt(calc.paperCostPerBox, 4)}</div>
                </div>
                <div className="p-3 rounded-md border" data-testid="cost-printing">
                  <div className="text-muted-foreground text-xs">印刷</div>
                  <div className="font-semibold">{fmt(calc.printingCostPerBox, 4)}</div>
                </div>
                {calc.totalLaminationCost > 0 && (
                  <div className="p-3 rounded-md border" data-testid="cost-lamination">
                    <div className="text-muted-foreground text-xs">覆膜</div>
                    <div className="font-semibold">{fmt(calc.lamCostPerBox, 4)}</div>
                  </div>
                )}
                {calc.totalGluingCost > 0 && (
                  <div className="p-3 rounded-md border" data-testid="cost-gluing">
                    <div className="text-muted-foreground text-xs">糊盒</div>
                    <div className="font-semibold">{fmt(calc.gluingCostPerBox, 4)}</div>
                  </div>
                )}
                {calc.profitAmount > 0 && (
                  <div className="p-3 rounded-md border" data-testid="cost-profit">
                    <div className="text-muted-foreground text-xs">利润</div>
                    <div className="font-semibold">{fmt(calc.profitAmount / calc.validQty, 4)}</div>
                  </div>
                )}
              </div>

              <div className="mt-5 text-sm font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
                <Sparkles className="w-4 h-4 text-primary" /> 核心规则：纸张 + 印刷 + 覆膜 + 糊盒 + 利润 = 税前总成本 → × (1+税率) = 最终价
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">1</Badge> 展开面积计算
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  {isValidSoftBoxFormula(selectedBoxType!.areaFormula) ? (
                    <div className="flex items-start gap-2 flex-wrap">
                      <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                      <span>公式：{selectedBoxType!.areaFormula}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-destructive flex-wrap">
                      <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                      <span>公式格式无效，请返回配置页修改</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>长 = {dimensions.length} cm，宽 = {dimensions.width} cm，高 = {dimensions.height} cm</span>
                  </div>
                  <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>展开面积 = {fmt(calc.areaCm2)} cm² = {fmt(calc.areaSqm, 4)} m²</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">2</Badge> 纸张成本
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>面纸：{selectedFacePaper?.name || "未选择"}，单价 = {calc.facePaperPrice} 元/m²</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>单盒纸张成本 = {fmt(calc.areaSqm, 4)} m² × {calc.facePaperPrice} = {fmt(calc.paperCostPerBox)} 元/个</span>
                  </div>
                  <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>总纸张成本 = {fmt(calc.paperCostPerBox)} × {calc.validQty} = {fmt(calc.totalPaperCost)} 元</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">3</Badge> 印刷成本
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>印刷方式：{selectedPrinting?.name || "未选择"}</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>印刷单价 = {calc.printingPrice} 元/m²</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>单盒印刷成本 = {fmt(calc.areaSqm, 4)} m² × {calc.printingPrice} = {fmt(calc.printingCostPerBox)} 元/个</span>
                  </div>
                  <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>总印刷成本 = {fmt(calc.printingCostPerBox)} × {calc.validQty} = {fmt(calc.totalPrintingCost)} 元</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">4</Badge> 覆膜成本
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>覆膜方式：{selectedLamination?.name || "未选择"}</span>
                  </div>
                  {calc.lamPricePerSqm > 0 ? (
                    <>
                      <div className="flex items-start gap-2 flex-wrap">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>覆膜单价 = {calc.lamPricePerSqm} 元/m²，最低消费 = ¥{laminationMinCharge}</span>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>计算：{fmt(calc.areaSqm, 4)} m² × {calc.lamPricePerSqm} × {calc.validQty} = {fmt(calc.lamCostRaw)} 元</span>
                      </div>
                      {calc.lamUsedMin && (
                        <div className="flex items-start gap-2 flex-wrap text-muted-foreground">
                          <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                          <span>低于最低消费 ¥{laminationMinCharge}，按最低消费计算</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>总覆膜成本 = max({fmt(calc.lamCostRaw)}, {laminationMinCharge}) = {fmt(calc.totalLaminationCost)} 元</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>不覆膜，覆膜成本 = 0 元</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">5</Badge> 糊盒成本
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>每盒糊盒费用 = {gluing.feePerBox} 元/个，最低消费 = ¥{gluing.minCharge}</span>
                  </div>
                  {gluing.feePerBox > 0 || gluing.minCharge > 0 ? (
                    <>
                      <div className="flex items-start gap-2 flex-wrap">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>最低消费分摊 = {gluing.minCharge} ÷ {calc.validQty} = {fmt(calc.gluingMinPerBox, 4)} 元/个</span>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap">
                        <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                        <span>单盒糊盒费用 = max({gluing.feePerBox}, {fmt(calc.gluingMinPerBox, 4)}) = {fmt(calc.gluingCostPerBox, 4)} 元/个</span>
                      </div>
                      {calc.gluingUsedMin && (
                        <div className="flex items-start gap-2 flex-wrap text-muted-foreground">
                          <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                          <span>最低消费分摊高于每盒价格，按最低消费分摊计算</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>总糊盒成本 = {fmt(calc.gluingCostPerBox, 4)} × {calc.validQty} = {fmt(calc.totalGluingCost)} 元</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-primary font-medium flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>糊盒费用未配置，糊盒成本 = 0 元</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-primary mb-3 flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="text-xs">6</Badge> 汇总
                </h3>
                <div className="border-l-2 border-muted pl-4 space-y-1 text-sm">
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>纸张成本：¥{fmt(calc.totalPaperCost)}</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>印刷成本：¥{fmt(calc.totalPrintingCost)}</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>覆膜成本：¥{fmt(calc.totalLaminationCost)}</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>糊盒成本：¥{fmt(calc.totalGluingCost)}</span>
                  </div>
                  {calc.profitAmount > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                      <span>利润（{calc.validProfitRate}%）：¥{fmt(calc.profitAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 flex-wrap font-semibold">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>税前总计：¥{fmt(calc.totalBeforeTax)}</span>
                  </div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <ChevronRight className="w-3 h-3 mt-1 text-muted-foreground shrink-0" />
                    <span>税额（{calc.validTaxRate}%）：¥{fmt(calc.taxAmount)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-primary font-bold flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>含税总计：¥{fmt(calc.totalCost)} ≈ ${fmt(calc.totalCostUsd)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
