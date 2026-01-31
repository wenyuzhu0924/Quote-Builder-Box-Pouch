import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Info, Package, Layers, Printer, Combine, Scissors, Grid3X3, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuote, type CustomMaterial, type PrintingPriceRule, type LaminationPriceRule, type PostProcessingOptionConfig, type QuantityDiscountRule, type BagType } from "@/lib/quote-store";
import { BAG_TYPES } from "@/lib/gravure-config";

export default function SurveyPage() {
  const [, navigate] = useLocation();
  const { state, updateConfig } = useQuote();
  const config = state.config;

  const [newMaterial, setNewMaterial] = useState<Partial<CustomMaterial>>({
    name: "",
    category: "",
    thickness: 0,
    density: 0,
    grammage: 0,
    price: 0,
    notes: "",
  });

  if (!state.productType) {
    navigate("/");
    return null;
  }

  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";

  const handleBack = () => {
    navigate("/");
  };

  const handleNext = () => {
    navigate("/quote");
  };

  const toggleBagType = (bagType: BagType) => {
    const current = config.selectedBagTypes;
    if (current.includes(bagType)) {
      updateConfig({ selectedBagTypes: current.filter((t) => t !== bagType) });
    } else {
      updateConfig({ selectedBagTypes: [...current, bagType] });
    }
  };

  const addMaterial = () => {
    if (!newMaterial.name) return;
    const material: CustomMaterial = {
      id: Date.now().toString(),
      name: newMaterial.name || "",
      category: newMaterial.category || "",
      thickness: newMaterial.thickness || 0,
      density: newMaterial.density || 0,
      grammage: newMaterial.grammage || 0,
      price: newMaterial.price || 0,
      notes: newMaterial.notes || "",
    };
    updateConfig({ materialLibrary: [...config.materialLibrary, material] });
    setNewMaterial({ name: "", category: "", thickness: 0, density: 0, grammage: 0, price: 0, notes: "" });
  };

  const removeMaterial = (id: string) => {
    updateConfig({ materialLibrary: config.materialLibrary.filter((m) => m.id !== id) });
  };

  const updateMaterialField = (id: string, field: keyof CustomMaterial, value: string | number) => {
    updateConfig({
      materialLibrary: config.materialLibrary.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  const updatePrintingPrice = (index: number, field: keyof PrintingPriceRule, value: string | number) => {
    const updated = [...config.printingPriceRules];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ printingPriceRules: updated });
  };

  const updateLaminationPrice = (index: number, field: keyof LaminationPriceRule, value: string | number) => {
    const updated = [...config.laminationPriceRules];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ laminationPriceRules: updated });
  };

  const togglePostProcessing = (id: string) => {
    updateConfig({
      postProcessingOptions: config.postProcessingOptions.map((opt) =>
        opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
      ),
    });
  };

  const updatePostProcessingFormula = (id: string, formula: string) => {
    updateConfig({
      postProcessingOptions: config.postProcessingOptions.map((opt) =>
        opt.id === id ? { ...opt, priceFormula: formula } : opt
      ),
    });
  };

  const updatePlateConfig = (field: keyof typeof config.platePriceConfig, value: number) => {
    updateConfig({
      platePriceConfig: { ...config.platePriceConfig, [field]: value },
    });
  };

  const updateQuantityDiscount = (index: number, field: keyof QuantityDiscountRule, value: string | number) => {
    const updated = [...config.quantityDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ quantityDiscounts: updated });
  };

  const addQuantityDiscount = () => {
    const newDiscount: QuantityDiscountRule = {
      minQuantity: 0,
      coefficient: 1.0,
      label: "新折扣",
    };
    updateConfig({ quantityDiscounts: [...config.quantityDiscounts, newDiscount] });
  };

  const removeQuantityDiscount = (index: number) => {
    const updated = config.quantityDiscounts.filter((_, i) => i !== index);
    updateConfig({ quantityDiscounts: updated });
  };

  if (!isGravure) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-foreground">报价器生成器</h1>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-muted-foreground">第 2 步，共 3 步</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                配置报价器
              </h2>
              <p className="text-muted-foreground">
                您选择的产品类型：
                <span className="font-medium text-foreground ml-1">
                  {state.productType === "box" ? "礼盒" : "包装袋"}
                  {state.printingMethod === "digital" && " - 数码印刷"}
                </span>
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">该印刷方式的参数配置页面（待实现）</p>
            </div>

            <div className="mt-8 flex justify-between">
              <Button
                data-testid="button-back"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <Button
                data-testid="button-next"
                onClick={handleNext}
                className="gap-2"
              >
                生成报价器
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">报价器生成器</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <span className="text-sm text-muted-foreground">第 2 步，共 3 步</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              配置报价器
            </h2>
            <p className="text-muted-foreground">
              配置您的自动报价器参数和价格逻辑。填入的数据将用于生成最终报价器。
            </p>
          </div>

          <Accordion type="multiple" defaultValue={["bagTypes"]} className="space-y-4">
            <AccordionItem value="bagTypes" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">袋型与尺寸</div>
                    <div className="text-sm text-muted-foreground">
                      选择报价器中包含的袋型（已选 {config.selectedBagTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    勾选需要包含在报价器中的袋型。尺寸字段会根据袋型的展开面积公式自动对应。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(BAG_TYPES).map(([key, bagType]) => (
                      <Card
                        key={key}
                        className={`cursor-pointer transition-colors ${
                          config.selectedBagTypes.includes(key as BagType)
                            ? "border-primary bg-primary/5"
                            : "hover-elevate"
                        }`}
                        onClick={() => toggleBagType(key as BagType)}
                        data-testid={`bagtype-${key}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={config.selectedBagTypes.includes(key as BagType)}
                              onCheckedChange={() => toggleBagType(key as BagType)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{bagType.nameZh}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                公式：{bagType.areaFormula}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                尺寸字段：{bagType.requiredDimensions.map(d => {
                                  const labels: Record<string, string> = {
                                    width: "袋宽",
                                    height: "袋高",
                                    bottomInsert: "底插入",
                                    sideExpansion: "侧面展开",
                                    backSeal: "背封边",
                                  };
                                  return labels[d] || d;
                                }).join("、")}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="materials" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">材料层结构</div>
                    <div className="text-sm text-muted-foreground">
                      配置材料库（当前 {config.materialLibrary.length} 种材料）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      填入您的材料库信息，这些材料将在报价器中供用户选择。
                    </p>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">报价器中材料层数：</Label>
                      <Select
                        value={String(config.materialLayerCount)}
                        onValueChange={(v) => updateConfig({ materialLayerCount: Number(v) })}
                      >
                        <SelectTrigger className="w-20" data-testid="select-layerCount">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} 层</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">材料名</TableHead>
                          <TableHead className="w-[80px]">类别</TableHead>
                          <TableHead className="w-[80px]">厚度</TableHead>
                          <TableHead className="w-[80px]">密度</TableHead>
                          <TableHead className="w-[80px]">克重</TableHead>
                          <TableHead className="w-[80px]">价格</TableHead>
                          <TableHead>备注</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.materialLibrary.map((material) => (
                          <TableRow key={material.id}>
                            <TableCell>
                              <Input
                                value={material.name}
                                onChange={(e) => updateMaterialField(material.id, "name", e.target.value)}
                                className="h-8"
                                data-testid={`material-name-${material.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={material.category}
                                onChange={(e) => updateMaterialField(material.id, "category", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={material.thickness}
                                onChange={(e) => updateMaterialField(material.id, "thickness", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={material.density}
                                onChange={(e) => updateMaterialField(material.id, "density", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.grammage}
                                onChange={(e) => updateMaterialField(material.id, "grammage", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.price}
                                onChange={(e) => updateMaterialField(material.id, "price", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={material.notes}
                                onChange={(e) => updateMaterialField(material.id, "notes", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMaterial(material.id)}
                                className="h-8 w-8 text-destructive"
                                data-testid={`remove-material-${material.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell>
                            <Input
                              value={newMaterial.name}
                              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                              placeholder="新材料名"
                              className="h-8"
                              data-testid="new-material-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newMaterial.category}
                              onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                              placeholder="类别"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={newMaterial.thickness || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, thickness: Number(e.target.value) })}
                              placeholder="厚度"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={newMaterial.density || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, density: Number(e.target.value) })}
                              placeholder="密度"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={newMaterial.grammage || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, grammage: Number(e.target.value) })}
                              placeholder="克重"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={newMaterial.price || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, price: Number(e.target.value) })}
                              placeholder="价格"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newMaterial.notes}
                              onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })}
                              placeholder="备注"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={addMaterial}
                              className="h-8 w-8"
                              data-testid="add-material"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="printing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">印刷</div>
                    <div className="text-sm text-muted-foreground">
                      配置印刷价格逻辑（按覆盖率）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    设置不同覆盖率对应的印刷单价（元/㎡）。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">覆盖率 (%)</TableHead>
                          <TableHead>标签</TableHead>
                          <TableHead className="w-[120px]">单价 (元/㎡)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.printingPriceRules.map((rule, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                type="number"
                                value={rule.coverage}
                                onChange={(e) => updatePrintingPrice(index, "coverage", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={rule.label}
                                onChange={(e) => updatePrintingPrice(index, "label", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={rule.pricePerSqm}
                                onChange={(e) => updatePrintingPrice(index, "pricePerSqm", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lamination" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Combine className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">复合</div>
                    <div className="text-sm text-muted-foreground">
                      配置复合价格逻辑
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      设置不同复合类型的单价（元/㎡），每一步按展开面积计价。
                    </p>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">报价器中复合次数：</Label>
                      <Select
                        value={String(config.laminationStepCount)}
                        onValueChange={(v) => updateConfig({ laminationStepCount: Number(v) })}
                      >
                        <SelectTrigger className="w-20" data-testid="select-laminationCount">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} 次</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>复合类型</TableHead>
                          <TableHead className="w-[120px]">单价 (元/㎡)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.laminationPriceRules.map((rule, index) => (
                          <TableRow key={rule.id}>
                            <TableCell>
                              <Input
                                value={rule.name}
                                onChange={(e) => updateLaminationPrice(index, "name", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                value={rule.pricePerSqm}
                                onChange={(e) => updateLaminationPrice(index, "pricePerSqm", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="postProcessing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">后处理</div>
                    <div className="text-sm text-muted-foreground">
                      配置后处理选项库（已启用 {config.postProcessingOptions.filter(o => o.enabled).length} 个）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    勾选需要包含在报价器中的后处理选项，并配置价格公式。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {config.postProcessingOptions.map((option) => (
                      <Card
                        key={option.id}
                        className={`${option.enabled ? "border-primary/50" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={option.enabled}
                              onCheckedChange={() => togglePostProcessing(option.id)}
                              data-testid={`postprocess-${option.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{option.name}</div>
                              <div className="mt-2">
                                <Input
                                  value={option.priceFormula}
                                  onChange={(e) => updatePostProcessingFormula(option.id, e.target.value)}
                                  placeholder="价格公式说明"
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="plate" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">制版</div>
                    <div className="text-sm text-muted-foreground">
                      配置制版价格逻辑
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    设置制版费用计算参数。版费 = 版长 × 版周 × 色数 × 单价
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">默认版长 (cm)</Label>
                      <Input
                        type="number"
                        value={config.platePriceConfig.defaultPlateLength}
                        onChange={(e) => updatePlateConfig("defaultPlateLength", Number(e.target.value))}
                        data-testid="plate-length"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">默认版周 (cm)</Label>
                      <Input
                        type="number"
                        value={config.platePriceConfig.defaultPlateCircumference}
                        onChange={(e) => updatePlateConfig("defaultPlateCircumference", Number(e.target.value))}
                        data-testid="plate-circumference"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">默认色数 (支)</Label>
                      <Input
                        type="number"
                        value={config.platePriceConfig.defaultColorCount}
                        onChange={(e) => updatePlateConfig("defaultColorCount", Number(e.target.value))}
                        data-testid="plate-colors"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">单价 (元/cm²)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={config.platePriceConfig.pricePerSqcm}
                        onChange={(e) => updatePlateConfig("pricePerSqcm", Number(e.target.value))}
                        data-testid="plate-price"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      预览：版费合计 = {config.platePriceConfig.defaultPlateLength} × {config.platePriceConfig.defaultPlateCircumference} × {config.platePriceConfig.defaultColorCount} × {config.platePriceConfig.pricePerSqcm} = 
                      <span className="font-semibold ml-1">
                        {(config.platePriceConfig.defaultPlateLength * config.platePriceConfig.defaultPlateCircumference * config.platePriceConfig.defaultColorCount * config.platePriceConfig.pricePerSqcm).toFixed(2)} 元
                      </span>
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quantity" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">数量折扣</div>
                    <div className="text-sm text-muted-foreground">
                      配置数量折扣机制
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    设置不同数量对应的价格系数。系数小于1表示折扣，大于1表示加价。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">最低数量</TableHead>
                          <TableHead className="w-[100px]">系数</TableHead>
                          <TableHead>标签</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.quantityDiscounts.map((discount, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                type="number"
                                value={discount.minQuantity}
                                onChange={(e) => updateQuantityDiscount(index, "minQuantity", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={discount.coefficient}
                                onChange={(e) => updateQuantityDiscount(index, "coefficient", Number(e.target.value))}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={discount.label}
                                onChange={(e) => updateQuantityDiscount(index, "label", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuantityDiscount(index)}
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addQuantityDiscount}
                    className="gap-2"
                    data-testid="add-discount"
                  >
                    <Plus className="w-4 h-4" />
                    添加折扣档位
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 flex justify-between sticky bottom-4 bg-background/95 backdrop-blur py-4 border-t">
            <Button
              data-testid="button-back"
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <Button
              data-testid="button-next"
              onClick={handleNext}
              className="gap-2"
              size="lg"
            >
              生成报价器
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
