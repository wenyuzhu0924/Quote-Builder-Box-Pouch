import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { evaluateSoftBoxAreaFormula } from "@/lib/softbox-config";
import { useSoftBox } from "@/lib/softbox-store";

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
  const enabledPostProcesses = config.postProcesses.filter(p => p.enabled);

  const [selectedBoxTypeId, setSelectedBoxTypeId] = useState(enabledBoxTypes[0]?.id || "");
  const [selectedPrintingId, setSelectedPrintingId] = useState(enabledPrinting[0]?.id || "");
  const [selectedPostProcessIds, setSelectedPostProcessIds] = useState<string[]>([]);
  const [customerName] = useState(() => localStorage.getItem("customerName") || "");
  const quoteTitle = customerName ? `${customerName}自动报价器` : "软盒自动报价器";

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

  const [dimensions, setDimensions] = useState({ length: 20, width: 15, height: 5 });
  const [orderInfo, setOrderInfo] = useState({
    qty: 1000,
    exchangeRate: 7.2,
    taxRate: 13,
    profitRate: 0,
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePostProcess = (ppId: string) => {
    setSelectedPostProcessIds(prev =>
      prev.includes(ppId) ? prev.filter(id => id !== ppId) : [...prev, ppId]
    );
  };

  const selectedBoxType = config.boxTypes.find(b => b.id === selectedBoxTypeId);
  const selectedPrinting = config.printingSides.find(p => p.id === selectedPrintingId);

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

    const paperCostPerBox = areaSqm * config.paperPricePerSqm;
    const totalPaperCost = paperCostPerBox * validQty;

    const printingPrice = selectedPrinting?.pricePerSqm || 0;
    const printingCostPerBox = areaSqm * printingPrice;
    const totalPrintingCost = printingCostPerBox * validQty;

    let totalPostProcessCost = 0;
    const postProcessDetails: Array<{ name: string; pricePerSqm: number; costPerBox: number; totalCost: number }> = [];
    selectedPostProcessIds.forEach(ppId => {
      const pp = config.postProcesses.find(p => p.id === ppId);
      if (!pp) return;
      const costPerBox = areaSqm * pp.pricePerSqm;
      const totalCost = costPerBox * validQty;
      totalPostProcessCost += totalCost;
      postProcessDetails.push({ name: pp.name, pricePerSqm: pp.pricePerSqm, costPerBox, totalCost });
    });

    const baseCost = totalPaperCost + totalPrintingCost + totalPostProcessCost;
    const profitAmount = baseCost * (validProfitRate / 100);
    const totalBeforeTax = baseCost + profitAmount;
    const taxAmount = totalBeforeTax * (validTaxRate / 100);
    const totalCost = totalBeforeTax + taxAmount;
    const unitCost = totalCost / validQty;
    const unitCostUsd = unitCost / validExchangeRate;
    const totalCostUsd = totalCost / validExchangeRate;

    return {
      areaCm2, areaSqm, formulaError,
      paperCostPerBox, totalPaperCost,
      printingPrice, printingCostPerBox, totalPrintingCost,
      postProcessDetails, totalPostProcessCost,
      baseCost, profitAmount, totalBeforeTax,
      taxAmount, totalCost, unitCost, unitCostUsd, totalCostUsd,
      validQty, validExchangeRate, validTaxRate, validProfitRate,
    };
  }, [selectedBoxType, selectedPrinting, dimensions, orderInfo, selectedPostProcessIds, config]);

  const ExpandButton = ({ sectionKey, label }: { sectionKey: string; label: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      data-testid={`expand-${sectionKey}`}
    >
      {expandedSections[sectionKey] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-quote-title">
            {quoteTitle}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {surveyPath && (
              <Button variant="outline" size="sm" onClick={() => navigate(surveyPath)} className="gap-1.5" data-testid="button-edit-config">
                <Edit className="w-3.5 h-3.5" /> 修改配置
              </Button>
            )}
            {!hideRestart && (
              <Button variant="outline" size="sm" onClick={() => navigate(homePath)} className="gap-1.5" data-testid="button-restart">
                <RefreshCw className="w-3.5 h-3.5" /> 重新开始
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">盒型与尺寸</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <Label className="text-xs text-muted-foreground mb-1 block">长 (cm)</Label>
                  <Input
                    type="number"
                    value={dimensions.length || ""}
                    onChange={(e) => setDimensions(p => ({ ...p, length: Number(e.target.value) || 0 }))}
                    data-testid="input-length"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">宽 (cm)</Label>
                  <Input
                    type="number"
                    value={dimensions.width || ""}
                    onChange={(e) => setDimensions(p => ({ ...p, width: Number(e.target.value) || 0 }))}
                    data-testid="input-width"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">高 (cm)</Label>
                  <Input
                    type="number"
                    value={dimensions.height || ""}
                    onChange={(e) => setDimensions(p => ({ ...p, height: Number(e.target.value) || 0 }))}
                    data-testid="input-height"
                  />
                </div>
              </div>
              {calc && !calc.formulaError && (
                <div className="mt-3 text-sm text-muted-foreground">
                  展开面积：<span className="font-medium text-foreground">{fmt(calc.areaCm2)} cm²</span>
                  <span className="mx-2">=</span>
                  <span className="font-medium text-foreground">{fmt(calc.areaSqm, 4)} m²</span>
                </div>
              )}
              {calc?.formulaError && (
                <p className="mt-3 text-sm text-destructive">公式计算错误，请检查盒型配置</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">订单信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">数量</Label>
                  <Input
                    type="number"
                    value={orderInfo.qty || ""}
                    onChange={(e) => setOrderInfo(p => ({ ...p, qty: Number(e.target.value) || 0 }))}
                    data-testid="input-qty"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">利润率 (%)</Label>
                  <Input
                    type="number"
                    value={orderInfo.profitRate || ""}
                    onChange={(e) => setOrderInfo(p => ({ ...p, profitRate: Number(e.target.value) || 0 }))}
                    data-testid="input-profit-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">汇率 (CNY/USD)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    value={orderInfo.exchangeRate || ""}
                    onChange={(e) => setOrderInfo(p => ({ ...p, exchangeRate: Number(e.target.value) || 0 }))}
                    data-testid="input-exchange-rate"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">税率 (%)</Label>
                  <Input
                    type="number"
                    value={orderInfo.taxRate || ""}
                    onChange={(e) => setOrderInfo(p => ({ ...p, taxRate: Number(e.target.value) || 0 }))}
                    data-testid="input-tax-rate"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {enabledPrinting.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">印刷方式</CardTitle>
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

          {enabledPostProcesses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">后处理工艺</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {enabledPostProcesses.map(pp => (
                    <label
                      key={pp.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover-elevate"
                      data-testid={`checkbox-post-${pp.id}`}
                    >
                      <Checkbox
                        checked={selectedPostProcessIds.includes(pp.id)}
                        onCheckedChange={() => togglePostProcess(pp.id)}
                      />
                      <div>
                        <div className="text-sm font-medium">{pp.name}</div>
                        <div className="text-xs text-muted-foreground">{pp.pricePerSqm} 元/m²</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {calc && !calc.formulaError && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">费用明细</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">纸张费用</span>
                      <ExpandButton sectionKey="paper" label="详情" />
                    </div>
                    <span className="text-sm font-medium">{fmt(calc.totalPaperCost)} 元</span>
                  </div>
                  {expandedSections["paper"] && (
                    <div className="ml-4 text-xs text-muted-foreground space-y-1 pb-2">
                      <p>展开面积 = {fmt(calc.areaSqm, 4)} m²</p>
                      <p>单价 = {config.paperPricePerSqm} 元/m²</p>
                      <p>单个纸张成本 = {fmt(calc.areaSqm, 4)} × {config.paperPricePerSqm} = {fmt(calc.paperCostPerBox)} 元</p>
                      <p>总纸张费 = {fmt(calc.paperCostPerBox)} × {calc.validQty} = {fmt(calc.totalPaperCost)} 元</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">印刷费用</span>
                      <ExpandButton sectionKey="printing" label="详情" />
                    </div>
                    <span className="text-sm font-medium">{fmt(calc.totalPrintingCost)} 元</span>
                  </div>
                  {expandedSections["printing"] && selectedPrinting && (
                    <div className="ml-4 text-xs text-muted-foreground space-y-1 pb-2">
                      <p>印刷方式 = {selectedPrinting.name}</p>
                      <p>单价 = {calc.printingPrice} 元/m²</p>
                      <p>单个印刷成本 = {fmt(calc.areaSqm, 4)} × {calc.printingPrice} = {fmt(calc.printingCostPerBox)} 元</p>
                      <p>总印刷费 = {fmt(calc.printingCostPerBox)} × {calc.validQty} = {fmt(calc.totalPrintingCost)} 元</p>
                    </div>
                  )}

                  {calc.postProcessDetails.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">后处理费用</span>
                          <ExpandButton sectionKey="postProcess" label="详情" />
                        </div>
                        <span className="text-sm font-medium">{fmt(calc.totalPostProcessCost)} 元</span>
                      </div>
                      {expandedSections["postProcess"] && (
                        <div className="ml-4 text-xs text-muted-foreground space-y-2 pb-2">
                          {calc.postProcessDetails.map((pp, i) => (
                            <div key={i} className="space-y-1">
                              <p className="font-medium text-foreground">{pp.name}</p>
                              <p>单价 = {pp.pricePerSqm} 元/m²</p>
                              <p>单个成本 = {fmt(calc.areaSqm, 4)} × {pp.pricePerSqm} = {fmt(pp.costPerBox)} 元</p>
                              <p>小计 = {fmt(pp.costPerBox)} × {calc.validQty} = {fmt(pp.totalCost)} 元</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {calc.validProfitRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">利润 ({calc.validProfitRate}%)</span>
                      <span className="text-sm font-medium">{fmt(calc.profitAmount)} 元</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm">税金 ({calc.validTaxRate}%)</span>
                    <span className="text-sm font-medium">{fmt(calc.taxAmount)} 元</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md" style={{ borderRadius: "10px" }}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-base font-semibold">总计</span>
                      <span className="text-2xl font-bold text-primary" data-testid="text-total-rmb">
                        ¥ {fmt(calc.totalCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">单价</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">¥ {fmt(calc.unitCost)}</span>
                        <span className="mx-2 text-muted-foreground">/</span>
                        <span className="text-sm font-medium">$ {fmt(calc.unitCostUsd)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">总价 (USD)</span>
                      <span className="text-sm font-medium" data-testid="text-total-usd">$ {fmt(calc.totalCostUsd)}</span>
                    </div>
                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                        <span>纸张</span>
                        <span>{fmt(calc.totalPaperCost)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                        <span>印刷</span>
                        <span>{fmt(calc.totalPrintingCost)}</span>
                      </div>
                      {calc.totalPostProcessCost > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                          <span>后处理</span>
                          <span>{fmt(calc.totalPostProcessCost)}</span>
                        </div>
                      )}
                      {calc.profitAmount > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                          <span>利润</span>
                          <span>{fmt(calc.profitAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-1">
                        <span>税金</span>
                        <span>{fmt(calc.taxAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
