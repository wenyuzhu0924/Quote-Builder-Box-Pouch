import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Save, Package, Layers, Printer, Combine, Scissors, Grid3X3, Calculator, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuote, type CustomMaterial, type PrintingPriceRule, type LaminationPriceRule, type PostProcessingOptionConfig, type QuantityDiscountRule, type CustomBagType, parseDimensionsFromFormula } from "@/lib/quote-store";

export default function SurveyPage() {
  const [, navigate] = useLocation();
  const { state, updateConfig } = useQuote();
  const { toast } = useToast();
  const config = state.config;

  const [newMaterial, setNewMaterial] = useState<Partial<CustomMaterial>>({
    name: "",
    thickness: 0,
    density: 0,
    grammage: 0,
    price: 0,
    notes: "",
  });

  const [newBagType, setNewBagType] = useState<Partial<CustomBagType>>({
    name: "",
    formula: "",
    wasteCoefficient: 1.1,
  });

  const [newLamination, setNewLamination] = useState({ name: "", pricePerSqm: 0 });
  const [newPostProcessing, setNewPostProcessing] = useState({ name: "", priceFormula: "" });

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


  const addCustomBagType = () => {
    if (!newBagType.name || !newBagType.formula) return;
    const dimensions = parseDimensionsFromFormula(newBagType.formula || "");
    const bagType: CustomBagType = {
      id: `custom_${Date.now()}`,
      name: newBagType.name || "",
      formula: newBagType.formula || "",
      requiredDimensions: dimensions,
      wasteCoefficient: newBagType.wasteCoefficient || 1.1,
      isBuiltIn: false,
    };
    updateConfig({ customBagTypes: [...config.customBagTypes, bagType] });
    setNewBagType({ name: "", formula: "", wasteCoefficient: 1.1 });
    toast({ title: "袋型已添加", description: `已自动匹配尺寸字段：${dimensions.length > 0 ? dimensions.join("、") : "无"}` });
  };

  const removeBagType = (id: string) => {
    updateConfig({ customBagTypes: config.customBagTypes.filter((b) => b.id !== id) });
  };

  const addMaterial = () => {
    if (!newMaterial.name) return;
    const material: CustomMaterial = {
      id: Date.now().toString(),
      name: newMaterial.name || "",
      thickness: newMaterial.thickness || 0,
      density: newMaterial.density || 0,
      grammage: newMaterial.grammage || 0,
      price: newMaterial.price || 0,
      notes: newMaterial.notes || "",
    };
    updateConfig({ materialLibrary: [...config.materialLibrary, material] });
    setNewMaterial({ name: "", thickness: 0, density: 0, grammage: 0, price: 0, notes: "" });
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

  const saveMaterialLibrary = () => {
    toast({ title: "材料库已保存", description: `共 ${config.materialLibrary.length} 种材料` });
  };

  const updatePrintingPrice = (index: number, field: keyof PrintingPriceRule, value: string | number) => {
    const updated = [...config.printingPriceRules];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ printingPriceRules: updated });
  };

  const addLamination = () => {
    if (!newLamination.name) return;
    const rule: LaminationPriceRule = {
      id: `lam_${Date.now()}`,
      name: newLamination.name,
      pricePerSqm: newLamination.pricePerSqm,
    };
    updateConfig({ laminationPriceRules: [...config.laminationPriceRules, rule] });
    setNewLamination({ name: "", pricePerSqm: 0 });
  };

  const removeLamination = (id: string) => {
    updateConfig({ laminationPriceRules: config.laminationPriceRules.filter((l) => l.id !== id) });
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

  const updatePostProcessingName = (id: string, name: string) => {
    updateConfig({
      postProcessingOptions: config.postProcessingOptions.map((opt) =>
        opt.id === id ? { ...opt, name } : opt
      ),
    });
  };

  const addPostProcessing = () => {
    if (!newPostProcessing.name) return;
    const option: PostProcessingOptionConfig = {
      id: `pp_${Date.now()}`,
      name: newPostProcessing.name,
      enabled: true,
      priceFormula: newPostProcessing.priceFormula,
      description: "",
    };
    updateConfig({ postProcessingOptions: [...config.postProcessingOptions, option] });
    setNewPostProcessing({ name: "", priceFormula: "" });
  };

  const removePostProcessing = (id: string) => {
    updateConfig({ postProcessingOptions: config.postProcessingOptions.filter((p) => p.id !== id) });
  };

  const savePostProcessingLibrary = () => {
    toast({ title: "后处理选项已保存", description: `共 ${config.postProcessingOptions.filter((o) => o.enabled).length} 个启用选项` });
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

  const dimensionLabels: Record<string, string> = {
    width: "袋宽",
    height: "袋高",
    bottomInsert: "底插入",
    sideExpansion: "侧面展开",
    backSeal: "背封边",
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
                    <div className="font-semibold">袋型</div>
                    <div className="text-sm text-muted-foreground">
                      选择或添加袋型（共 {config.customBagTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    勾选需要包含在报价器中的袋型，或添加自定义袋型。输入公式后会自动匹配所需尺寸字段。
                  </p>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">选用</TableHead>
                          <TableHead className="w-[120px]">袋型名称</TableHead>
                          <TableHead>展开面积公式</TableHead>
                          <TableHead className="w-[180px]">尺寸字段</TableHead>
                          <TableHead className="w-[80px]">损耗率</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.customBagTypes.map((bagType) => (
                          <TableRow key={bagType.id}>
                            <TableCell>
                              <Checkbox
                                checked={true}
                                data-testid={`bagtype-check-${bagType.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{bagType.name}</span>
                              {bagType.isBuiltIn && (
                                <span className="ml-2 text-xs text-muted-foreground">(内置)</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bagType.isBuiltIn ? (
                                <span className="text-sm text-muted-foreground">{bagType.formula}</span>
                              ) : (
                                <Input
                                  value={bagType.formula}
                                  onChange={(e) => {
                                    const dims = parseDimensionsFromFormula(e.target.value);
                                    updateConfig({
                                      customBagTypes: config.customBagTypes.map((b) =>
                                        b.id === bagType.id
                                          ? { ...b, formula: e.target.value, requiredDimensions: dims }
                                          : b
                                      ),
                                    });
                                  }}
                                  className="h-8"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {bagType.requiredDimensions.map((dim) => (
                                  <span
                                    key={dim}
                                    className="px-2 py-0.5 bg-muted text-xs rounded"
                                  >
                                    {dimensionLabels[dim] || dim}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={bagType.wasteCoefficient}
                                onChange={(e) => {
                                  updateConfig({
                                    customBagTypes: config.customBagTypes.map((b) =>
                                      b.id === bagType.id
                                        ? { ...b, wasteCoefficient: Number(e.target.value) }
                                        : b
                                    ),
                                  });
                                }}
                                className="h-8 w-20"
                              />
                            </TableCell>
                            <TableCell>
                              {!bagType.isBuiltIn && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeBagType(bagType.id)}
                                  className="h-8 w-8 text-destructive"
                                  data-testid={`remove-bagtype-${bagType.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell>
                            <Input
                              value={newBagType.name}
                              onChange={(e) => setNewBagType({ ...newBagType, name: e.target.value })}
                              placeholder="新袋型名称"
                              className="h-8"
                              data-testid="new-bagtype-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newBagType.formula}
                              onChange={(e) => setNewBagType({ ...newBagType, formula: e.target.value })}
                              placeholder="例如：袋宽 × 袋高 × 2"
                              className="h-8"
                              data-testid="new-bagtype-formula"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {newBagType.formula
                                ? parseDimensionsFromFormula(newBagType.formula).map((d) => dimensionLabels[d] || d).join("、") || "无匹配"
                                : "自动匹配"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={newBagType.wasteCoefficient}
                              onChange={(e) => setNewBagType({ ...newBagType, wasteCoefficient: Number(e.target.value) })}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={addCustomBagType}
                              className="h-8 w-8"
                              data-testid="add-bagtype"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    提示：在公式中使用"袋宽"、"袋高"、"底插入"、"侧面展开"、"背封边"等关键词，系统会自动识别所需尺寸字段
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="materials" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">材料</div>
                    <div className="text-sm text-muted-foreground">
                      配置材料库（当前 {config.materialLibrary.length} 种材料）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    填入您的材料库信息，这些材料将在报价器中供用户选择。材料层数在生成的报价器中由使用者自定义。
                  </p>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">材料名</TableHead>
                          <TableHead className="w-[80px]">厚度(μm)</TableHead>
                          <TableHead className="w-[80px]">密度(g/cm³)</TableHead>
                          <TableHead className="w-[80px]">克重(g/㎡)</TableHead>
                          <TableHead className="w-[80px]">价格(元/kg)</TableHead>
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
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={saveMaterialLibrary} className="gap-2" data-testid="save-materials">
                      <Save className="w-4 h-4" />
                      保存材料库
                    </Button>
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
                      配置复合价格逻辑（共 {config.laminationPriceRules.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    设置不同复合类型的单价（元/㎡）。复合次数在生成的报价器中由使用者自定义。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>复合类型</TableHead>
                          <TableHead className="w-[120px]">单价 (元/㎡)</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLamination(rule.id)}
                                className="h-8 w-8 text-destructive"
                                data-testid={`remove-lamination-${rule.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell>
                            <Input
                              value={newLamination.name}
                              onChange={(e) => setNewLamination({ ...newLamination, name: e.target.value })}
                              placeholder="新复合类型名称"
                              className="h-8"
                              data-testid="new-lamination-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.001"
                              value={newLamination.pricePerSqm || ""}
                              onChange={(e) => setNewLamination({ ...newLamination, pricePerSqm: Number(e.target.value) })}
                              placeholder="单价"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={addLamination}
                              className="h-8 w-8"
                              data-testid="add-lamination"
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
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead className="w-[140px]">选项名称</TableHead>
                          <TableHead>价格公式/说明</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.postProcessingOptions.map((option) => (
                          <TableRow key={option.id}>
                            <TableCell>
                              <Checkbox
                                checked={option.enabled}
                                onCheckedChange={() => togglePostProcessing(option.id)}
                                data-testid={`postprocess-${option.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={option.name}
                                onChange={(e) => updatePostProcessingName(option.id, e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={option.priceFormula}
                                onChange={(e) => updatePostProcessingFormula(option.id, e.target.value)}
                                placeholder="价格公式说明"
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePostProcessing(option.id)}
                                className="h-8 w-8 text-destructive"
                                data-testid={`remove-postprocess-${option.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell>
                            <Input
                              value={newPostProcessing.name}
                              onChange={(e) => setNewPostProcessing({ ...newPostProcessing, name: e.target.value })}
                              placeholder="新选项名称"
                              className="h-8"
                              data-testid="new-postprocess-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newPostProcessing.priceFormula}
                              onChange={(e) => setNewPostProcessing({ ...newPostProcessing, priceFormula: e.target.value })}
                              placeholder="价格公式说明"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={addPostProcessing}
                              className="h-8 w-8"
                              data-testid="add-postprocess"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={savePostProcessingLibrary} className="gap-2" data-testid="save-postprocess">
                      <Save className="w-4 h-4" />
                      保存后处理选项
                    </Button>
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
                      制版费用说明（在报价器中填写）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <p className="font-medium">制版费用计算说明</p>
                        <p className="text-sm text-muted-foreground">
                          版费 = 版长(cm) × 版周(cm) × 色数(支) × 单价(元/cm²)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          制版费用在生成的报价器中由使用者填写具体参数，与袋子单价分开结算。
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-background rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">默认版长</p>
                            <p className="font-medium">{config.platePriceConfig.defaultPlateLength} cm</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">默认版周</p>
                            <p className="font-medium">{config.platePriceConfig.defaultPlateCircumference} cm</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">默认色数</p>
                            <p className="font-medium">{config.platePriceConfig.defaultColorCount} 支</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">单价</p>
                            <p className="font-medium">{config.platePriceConfig.pricePerSqcm} 元/cm²</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
