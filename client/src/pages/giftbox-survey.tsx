import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Package, Layers, Sparkles, Wrench, DollarSign, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  type BoxTypeConfig, type PaperTypeConfig, type LinerTypeConfig, type CraftConfig, type MoldFeeRule,
  parseGiftBoxDimensionsFromFormula, giftBoxDimensionLabels, isValidGiftBoxFormula,
} from "@/lib/giftbox-config";
import { useGiftBox } from "@/lib/giftbox-store";

interface GiftBoxSurveyPageProps {
  backPath?: string;
  nextPath?: string;
  hideBack?: boolean;
}

function SectionSaveButton({ section, label, onSave }: { section: string; label: string; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-3">
      <Button
        variant="default"
        size="sm"
        onClick={onSave}
        className="gap-1.5"
        data-testid={`save-${section}`}
      >
        <Save className="w-3.5 h-3.5" />
        保存{label}
      </Button>
    </div>
  );
}

export default function GiftBoxSurveyPage({
  backPath = "/",
  nextPath = "/giftbox/quote",
  hideBack = false,
}: GiftBoxSurveyPageProps) {
  const [, navigate] = useLocation();
  const { config, updateConfig } = useGiftBox();
  const { toast } = useToast();

  const [newBoxType, setNewBoxType] = useState({ name: "", formula: "" });
  const [newPaper, setNewPaper] = useState({ name: "", pricePerSqm: 0 });
  const [newLiner, setNewLiner] = useState({ name: "", calcMethod: "volume" as "volume" | "halfBoard", pricePerCubicM: 0, minCost: 0, baseProcessFee: 0 });
  const [newCraft, setNewCraft] = useState({ name: "", calcType: "perUnit" as "perUnit" | "perArea", price: 0, startPrice: 400, desc: "" });
  const [newMoldRule, setNewMoldRule] = useState({ minQty: 0, maxQty: 0, price: 0, desc: "" });

  const handleBack = () => navigate(backPath);
  const handleNext = () => navigate(nextPath);

  const showSaveToast = (section: string) => {
    toast({ title: `${section}已保存`, description: "配置已更新" });
  };

  const toggleBoxType = (id: string) => {
    updateConfig({
      boxTypes: config.boxTypes.map(b =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    });
  };

  const updateBoxFormula = (boxId: string, formula: string) => {
    const dims = parseGiftBoxDimensionsFromFormula(formula);
    updateConfig({
      boxTypes: config.boxTypes.map(b =>
        b.id === boxId ? { ...b, areaFormula: formula, requiredDimensions: dims } : b
      ),
    });
  };

  const addBoxType = () => {
    if (!newBoxType.name || !newBoxType.formula) return;
    if (!isValidGiftBoxFormula(newBoxType.formula)) {
      toast({ title: "公式无效", description: "请输入包含数字、运算符和尺寸关键词(长/宽/高)的有效公式", variant: "destructive" });
      return;
    }
    const dims = parseGiftBoxDimensionsFromFormula(newBoxType.formula);
    const box: BoxTypeConfig = {
      id: `box_${Date.now()}`,
      name: newBoxType.name,
      enabled: true,
      areaFormula: newBoxType.formula,
      requiredDimensions: dims,
      ladder: [
        { minQty: 0, maxQty: 999, price: 5, minPrice: 3000 },
        { minQty: 1000, maxQty: 2999, price: 4 },
        { minQty: 3000, maxQty: 4999, price: 3.5 },
        { minQty: 5000, maxQty: Infinity, price: 3 },
      ],
    };
    updateConfig({ boxTypes: [...config.boxTypes, box] });
    setNewBoxType({ name: "", formula: "" });
    toast({ title: "盒型已添加", description: `已自动匹配尺寸字段：${dims.map(d => giftBoxDimensionLabels[d] || d).join("、") || "无"}` });
  };

  const removeBoxType = (id: string) => {
    updateConfig({ boxTypes: config.boxTypes.filter(b => b.id !== id) });
  };

  const updateBoxLadder = (boxId: string, ladderIndex: number, field: string, value: number) => {
    updateConfig({
      boxTypes: config.boxTypes.map(b =>
        b.id === boxId
          ? { ...b, ladder: b.ladder.map((l, i) => i === ladderIndex ? { ...l, [field]: value } : l) }
          : b
      ),
    });
  };

  const addBoxLadderRow = (boxId: string) => {
    updateConfig({
      boxTypes: config.boxTypes.map(b =>
        b.id === boxId
          ? { ...b, ladder: [...b.ladder, { minQty: 0, maxQty: Infinity, price: 0 }] }
          : b
      ),
    });
  };

  const removeBoxLadderRow = (boxId: string, ladderIndex: number) => {
    updateConfig({
      boxTypes: config.boxTypes.map(b =>
        b.id === boxId
          ? { ...b, ladder: b.ladder.filter((_, i) => i !== ladderIndex) }
          : b
      ),
    });
  };

  const addPaperType = () => {
    if (!newPaper.name) return;
    const paper: PaperTypeConfig = {
      id: `paper_${Date.now()}`,
      name: newPaper.name,
      pricePerSqm: newPaper.pricePerSqm,
    };
    updateConfig({ paperTypes: [...config.paperTypes, paper] });
    setNewPaper({ name: "", pricePerSqm: 0 });
    toast({ title: "面纸类型已添加" });
  };

  const removePaperType = (id: string) => {
    updateConfig({ paperTypes: config.paperTypes.filter(p => p.id !== id) });
  };

  const updatePaperField = (id: string, field: keyof PaperTypeConfig, value: string | number) => {
    updateConfig({
      paperTypes: config.paperTypes.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const updateLinerField = (id: string, field: keyof LinerTypeConfig, value: string | number) => {
    updateConfig({
      linerTypes: config.linerTypes.map(l =>
        l.id === id ? { ...l, [field]: value } : l
      ),
    });
  };

  const addLinerType = () => {
    if (!newLiner.name) return;
    const liner: LinerTypeConfig = {
      id: `liner_${Date.now()}`,
      name: newLiner.name,
      calcMethod: newLiner.calcMethod,
      pricePerCubicM: newLiner.pricePerCubicM,
      minCost: newLiner.minCost,
      baseProcessFee: newLiner.baseProcessFee,
    };
    updateConfig({ linerTypes: [...config.linerTypes, liner] });
    setNewLiner({ name: "", calcMethod: "volume", pricePerCubicM: 0, minCost: 0, baseProcessFee: 0 });
    toast({ title: "内衬类型已添加" });
  };

  const removeLinerType = (id: string) => {
    updateConfig({ linerTypes: config.linerTypes.filter(l => l.id !== id) });
  };

  const toggleCraft = (id: string) => {
    updateConfig({
      crafts: config.crafts.map(c =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      ),
    });
  };

  const updateCraftField = (id: string, field: keyof CraftConfig, value: string | number) => {
    updateConfig({
      crafts: config.crafts.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  const addCraft = () => {
    if (!newCraft.name) return;
    const craft: CraftConfig = {
      id: `craft_${Date.now()}`,
      name: newCraft.name,
      enabled: true,
      calcType: newCraft.calcType,
      price: newCraft.price,
      startPrice: newCraft.startPrice,
      desc: newCraft.desc,
    };
    updateConfig({ crafts: [...config.crafts, craft] });
    setNewCraft({ name: "", calcType: "perUnit", price: 0, startPrice: 400, desc: "" });
    toast({ title: "工艺已添加" });
  };

  const removeCraft = (id: string) => {
    updateConfig({ crafts: config.crafts.filter(c => c.id !== id) });
  };

  const updateMoldRule = (index: number, field: keyof MoldFeeRule, value: string | number) => {
    updateConfig({
      moldFeeRules: config.moldFeeRules.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      ),
    });
  };

  const addMoldRule = () => {
    const rule: MoldFeeRule = {
      minQty: newMoldRule.minQty,
      maxQty: newMoldRule.maxQty || Infinity,
      price: newMoldRule.price,
      desc: newMoldRule.desc,
    };
    updateConfig({ moldFeeRules: [...config.moldFeeRules, rule] });
    setNewMoldRule({ minQty: 0, maxQty: 0, price: 0, desc: "" });
    toast({ title: "模具费用档位已添加" });
  };

  const removeMoldRule = (index: number) => {
    updateConfig({ moldFeeRules: config.moldFeeRules.filter((_, i) => i !== index) });
  };

  const enabledBoxCount = config.boxTypes.filter(b => b.enabled).length;
  const enabledCraftCount = config.crafts.filter(c => c.enabled).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">报价器生成器 - 礼盒</h1>
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
            <h2 className="text-2xl font-bold text-foreground mb-2">配置报价器</h2>
            <p className="text-muted-foreground">
              配置您的礼盒自动报价器参数和价格逻辑。填入的数据将用于生成最终报价器。
            </p>
          </div>

          <Accordion type="multiple" defaultValue={["boxTypes"]} className="space-y-4">
            <AccordionItem value="boxTypes" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-box-type">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">盒型配置</div>
                    <div className="text-sm text-muted-foreground">
                      选择或添加盒型，配置展开面积公式（已选 {enabledBoxCount}/{config.boxTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    勾选需要包含在报价器中的盒型，或添加自定义盒型。输入面积公式后会自动匹配所需尺寸字段。
                  </p>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">选用</TableHead>
                          <TableHead className="w-[140px]">盒型名称</TableHead>
                          <TableHead className="min-w-[280px]">展开面积公式</TableHead>
                          <TableHead className="w-[140px]">尺寸字段</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.boxTypes.map(box => (
                          <TableRow key={box.id}>
                            <TableCell>
                              <Checkbox
                                checked={box.enabled}
                                onCheckedChange={() => toggleBoxType(box.id)}
                                data-testid={`boxtype-check-${box.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{box.name}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  value={box.areaFormula}
                                  onChange={(e) => updateBoxFormula(box.id, e.target.value)}
                                  className={`h-9 ${box.areaFormula && !isValidGiftBoxFormula(box.areaFormula) ? "border-destructive" : ""}`}
                                  data-testid={`boxtype-formula-${box.id}`}
                                />
                                {box.areaFormula && !isValidGiftBoxFormula(box.areaFormula) && (
                                  <p className="text-xs text-destructive">请输入有效公式，需包含数字、运算符和尺寸关键词(长/宽/高)</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {box.requiredDimensions.map(dim => (
                                  <Badge key={dim} variant="secondary" className="text-xs">
                                    {giftBoxDimensionLabels[dim] || dim}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBoxType(box.id)}
                                className="text-destructive"
                                data-testid={`remove-boxtype-${box.id}`}
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
                              value={newBoxType.name}
                              onChange={(e) => setNewBoxType({ ...newBoxType, name: e.target.value })}
                              placeholder="新盒型名称"
                              className="h-9"
                              data-testid="new-boxtype-name"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                value={newBoxType.formula}
                                onChange={(e) => setNewBoxType({ ...newBoxType, formula: e.target.value })}
                                placeholder="例如：(长+高×2)×(宽+高×2)×2"
                                className={`h-9 ${newBoxType.formula && !isValidGiftBoxFormula(newBoxType.formula) ? "border-destructive" : ""}`}
                                data-testid="new-boxtype-formula"
                              />
                              {newBoxType.formula && !isValidGiftBoxFormula(newBoxType.formula) && (
                                <p className="text-xs text-destructive">需包含数字、运算符和尺寸关键词(长/宽/高)</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {newBoxType.formula && isValidGiftBoxFormula(newBoxType.formula)
                                ? parseGiftBoxDimensionsFromFormula(newBoxType.formula).map(d => giftBoxDimensionLabels[d] || d).join("、") || "无匹配"
                                : "自动匹配"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={addBoxType}
                              data-testid="add-boxtype"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    提示：在公式中使用"长"、"宽"、"高"关键词，系统会自动识别所需尺寸字段。支持 ×、÷、+、- 运算符和括号。
                  </p>
                  <SectionSaveButton section="boxTypes" label="盒型配置" onSave={() => showSaveToast("盒型配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ladderPricing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-ladder">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">阶梯价格</div>
                    <div className="text-sm text-muted-foreground">
                      配置各盒型的做工阶梯价格（{enabledBoxCount} 种盒型）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    为每种盒型设置不同数量区间的做工单价。仅显示已启用的盒型。
                  </p>

                  {config.boxTypes.filter(b => b.enabled).map(box => (
                    <div key={box.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{box.name}</span>
                        {isValidGiftBoxFormula(box.areaFormula) && (
                          <span className="text-xs text-muted-foreground">公式：{box.areaFormula}</span>
                        )}
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">最小数量</TableHead>
                              <TableHead className="w-[100px]">最大数量</TableHead>
                              <TableHead className="w-[100px]">单价(元/个)</TableHead>
                              <TableHead className="w-[100px]">起步价(元)</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {box.ladder.map((l, i) => (
                              <TableRow key={i}>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={l.minQty || ""}
                                    onChange={(e) => updateBoxLadder(box.id, i, "minQty", Number(e.target.value) || 0)}
                                    className="h-9"
                                    data-testid={`box-ladder-min-${box.id}-${i}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={l.maxQty === Infinity ? "" : (l.maxQty || "")}
                                    onChange={(e) => updateBoxLadder(box.id, i, "maxQty", e.target.value === "" ? Infinity : (Number(e.target.value) || 0))}
                                    className="h-9"
                                    placeholder="不限"
                                    data-testid={`box-ladder-max-${box.id}-${i}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step={0.1}
                                    value={l.price || ""}
                                    onChange={(e) => updateBoxLadder(box.id, i, "price", Number(e.target.value) || 0)}
                                    className="h-9"
                                    data-testid={`box-ladder-price-${box.id}-${i}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={l.minPrice || ""}
                                    onChange={(e) => updateBoxLadder(box.id, i, "minPrice", Number(e.target.value) || 0)}
                                    className="h-9"
                                    placeholder="无"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeBoxLadderRow(box.id, i)}
                                    className="text-destructive"
                                    data-testid={`remove-ladder-${box.id}-${i}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell colSpan={5}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addBoxLadderRow(box.id)}
                                  className="gap-1.5 w-full"
                                  data-testid={`add-ladder-${box.id}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  添加档位
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}

                  {config.boxTypes.filter(b => b.enabled).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      请先在"盒型配置"中启用至少一种盒型
                    </p>
                  )}
                  <SectionSaveButton section="ladderPricing" label="阶梯价格" onSave={() => showSaveToast("阶梯价格")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="materials" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-material">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">材料</div>
                    <div className="text-sm text-muted-foreground">
                      配置面纸、内衬材料及价格（面纸 {config.paperTypes.length} 种，内衬 {config.linerTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-6">
                  <div>
                    <p className="font-medium mb-2">灰板参数</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">灰板单价（元/m²）</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={config.boardPricePerSqm || ""}
                          onChange={(e) => updateConfig({ boardPricePerSqm: Number(e.target.value) || 0 })}
                          data-testid="input-board-price"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">面纸面积系数</Label>
                        <Input
                          type="number"
                          step={0.01}
                          value={config.paperAreaRatio || ""}
                          onChange={(e) => updateConfig({ paperAreaRatio: Number(e.target.value) || 0 })}
                          data-testid="input-paper-ratio"
                        />
                        <p className="text-xs text-muted-foreground mt-1">面纸面积 = 灰板面积 × 此系数</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">面纸类型</p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>面纸名称</TableHead>
                            <TableHead className="w-[120px]">单价（元/m²）</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.paperTypes.map(paper => (
                            <TableRow key={paper.id}>
                              <TableCell>
                                <Input
                                  value={paper.name}
                                  onChange={(e) => updatePaperField(paper.id, "name", e.target.value)}
                                  className="h-9"
                                  data-testid={`paper-name-${paper.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step={0.1}
                                  value={paper.pricePerSqm || ""}
                                  onChange={(e) => updatePaperField(paper.id, "pricePerSqm", Number(e.target.value) || 0)}
                                  className="h-9"
                                  data-testid={`paper-price-${paper.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePaperType(paper.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell>
                              <Input
                                value={newPaper.name}
                                onChange={(e) => setNewPaper({ ...newPaper, name: e.target.value })}
                                placeholder="新面纸名称"
                                className="h-9"
                                data-testid="new-paper-name"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={newPaper.pricePerSqm || ""}
                                onChange={(e) => setNewPaper({ ...newPaper, pricePerSqm: Number(e.target.value) || 0 })}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={addPaperType} data-testid="add-paper">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">内衬类型</p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>内衬名称</TableHead>
                            <TableHead className="w-[100px]">计算方式</TableHead>
                            <TableHead className="w-[100px]">体积单价(元/m³)</TableHead>
                            <TableHead className="w-[100px]">起步价(元)</TableHead>
                            <TableHead className="w-[100px]">加工费(元/个)</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.linerTypes.map(liner => (
                            <TableRow key={liner.id}>
                              <TableCell>
                                <Input
                                  value={liner.name}
                                  onChange={(e) => updateLinerField(liner.id, "name", e.target.value)}
                                  className="h-9"
                                  data-testid={`liner-name-${liner.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={liner.calcMethod}
                                  onValueChange={(v) => updateLinerField(liner.id, "calcMethod", v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="volume">按体积</SelectItem>
                                    <SelectItem value="halfBoard">灰板÷2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={liner.pricePerCubicM || ""}
                                  onChange={(e) => updateLinerField(liner.id, "pricePerCubicM", Number(e.target.value) || 0)}
                                  className="h-9"
                                  disabled={liner.calcMethod === "halfBoard"}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={liner.minCost || ""}
                                  onChange={(e) => updateLinerField(liner.id, "minCost", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step={0.1}
                                  value={liner.baseProcessFee || ""}
                                  onChange={(e) => updateLinerField(liner.id, "baseProcessFee", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLinerType(liner.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell>
                              <Input
                                value={newLiner.name}
                                onChange={(e) => setNewLiner({ ...newLiner, name: e.target.value })}
                                placeholder="新内衬名称"
                                className="h-9"
                                data-testid="new-liner-name"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={newLiner.calcMethod}
                                onValueChange={(v: "volume" | "halfBoard") => setNewLiner({ ...newLiner, calcMethod: v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="volume">按体积</SelectItem>
                                  <SelectItem value="halfBoard">灰板÷2</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={newLiner.pricePerCubicM || ""}
                                onChange={(e) => setNewLiner({ ...newLiner, pricePerCubicM: Number(e.target.value) || 0 })}
                                className="h-9"
                                disabled={newLiner.calcMethod === "halfBoard"}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={newLiner.minCost || ""}
                                onChange={(e) => setNewLiner({ ...newLiner, minCost: Number(e.target.value) || 0 })}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={newLiner.baseProcessFee || ""}
                                onChange={(e) => setNewLiner({ ...newLiner, baseProcessFee: Number(e.target.value) || 0 })}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={addLinerType} data-testid="add-liner">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">孔位单价（元/个）</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={config.holeCostPerUnit || ""}
                          onChange={(e) => updateConfig({ holeCostPerUnit: Number(e.target.value) || 0 })}
                          data-testid="input-hole-cost"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">运输纸箱单价（元/个）</Label>
                        <Input
                          type="number"
                          step={0.1}
                          value={config.cartonPricePerBox || ""}
                          onChange={(e) => updateConfig({ cartonPricePerBox: Number(e.target.value) || 0 })}
                          data-testid="input-carton-price"
                        />
                      </div>
                    </div>
                  </div>
                  <SectionSaveButton section="materials" label="材料配置" onSave={() => showSaveToast("材料配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="crafts" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-craft">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">特殊工艺</div>
                    <div className="text-sm text-muted-foreground">
                      配置工艺选项及定价（已启用 {enabledCraftCount}/{config.crafts.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    配置可选的特殊工艺及其定价方式。按个计价的工艺有起步价限制，按面积计价的按cm²计算。
                  </p>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead>工艺名称</TableHead>
                          <TableHead className="w-[140px]">计价方式</TableHead>
                          <TableHead className="w-[100px]">单价</TableHead>
                          <TableHead className="w-[100px]">起步价(元)</TableHead>
                          <TableHead>说明</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.crafts.map(craft => (
                          <TableRow key={craft.id}>
                            <TableCell>
                              <Checkbox
                                checked={craft.enabled}
                                onCheckedChange={() => toggleCraft(craft.id)}
                                data-testid={`craft-check-${craft.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={craft.name}
                                onChange={(e) => updateCraftField(craft.id, "name", e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={craft.calcType}
                                onValueChange={(v) => updateCraftField(craft.id, "calcType", v)}
                              >
                                <SelectTrigger className="h-9 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="perUnit">按个</SelectItem>
                                  <SelectItem value="perArea">按面积</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={craft.price || ""}
                                onChange={(e) => updateCraftField(craft.id, "price", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={craft.startPrice || ""}
                                onChange={(e) => updateCraftField(craft.id, "startPrice", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={craft.desc}
                                onChange={(e) => updateCraftField(craft.id, "desc", e.target.value)}
                                className="h-9"
                                placeholder="说明"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCraft(craft.id)}
                                className="text-destructive"
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
                              value={newCraft.name}
                              onChange={(e) => setNewCraft({ ...newCraft, name: e.target.value })}
                              placeholder="新工艺名称"
                              className="h-9"
                              data-testid="new-craft-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={newCraft.calcType}
                              onValueChange={(v: "perUnit" | "perArea") => setNewCraft({ ...newCraft, calcType: v })}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="perUnit">按个</SelectItem>
                                <SelectItem value="perArea">按面积</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step={0.1}
                              value={newCraft.price || ""}
                              onChange={(e) => setNewCraft({ ...newCraft, price: Number(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={newCraft.startPrice || ""}
                              onChange={(e) => setNewCraft({ ...newCraft, startPrice: Number(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newCraft.desc}
                              onChange={(e) => setNewCraft({ ...newCraft, desc: e.target.value })}
                              placeholder="说明"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={addCraft} data-testid="add-craft">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <SectionSaveButton section="crafts" label="特殊工艺" onSave={() => showSaveToast("特殊工艺")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="moldFee" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-mold">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">模具费用</div>
                    <div className="text-sm text-muted-foreground">
                      配置刀版及模具费用规则（{config.moldFeeRules.length} 档）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    根据数量区间设置刀版+模具费用。可在报价器中进一步调整优惠。
                  </p>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">最小数量</TableHead>
                          <TableHead className="w-[120px]">最大数量</TableHead>
                          <TableHead className="w-[100px]">单价(元/个)</TableHead>
                          <TableHead>说明</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.moldFeeRules.map((rule, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Input
                                type="number"
                                value={rule.minQty || ""}
                                onChange={(e) => updateMoldRule(i, "minQty", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`mold-min-${i}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={rule.maxQty === Infinity ? "" : (rule.maxQty || "")}
                                onChange={(e) => updateMoldRule(i, "maxQty", e.target.value === "" ? Infinity : (Number(e.target.value) || 0))}
                                className="h-9"
                                placeholder="不限"
                                data-testid={`mold-max-${i}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={rule.price || ""}
                                onChange={(e) => updateMoldRule(i, "price", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`mold-price-${i}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={rule.desc}
                                onChange={(e) => updateMoldRule(i, "desc", e.target.value)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMoldRule(i)}
                                className="text-destructive"
                                data-testid={`remove-mold-${i}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell>
                            <Input
                              type="number"
                              value={newMoldRule.minQty || ""}
                              onChange={(e) => setNewMoldRule({ ...newMoldRule, minQty: Number(e.target.value) || 0 })}
                              className="h-9"
                              placeholder="最小"
                              data-testid="new-mold-min"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={newMoldRule.maxQty || ""}
                              onChange={(e) => setNewMoldRule({ ...newMoldRule, maxQty: Number(e.target.value) || 0 })}
                              className="h-9"
                              placeholder="最大"
                              data-testid="new-mold-max"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step={0.1}
                              value={newMoldRule.price || ""}
                              onChange={(e) => setNewMoldRule({ ...newMoldRule, price: Number(e.target.value) || 0 })}
                              className="h-9"
                              placeholder="单价"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newMoldRule.desc}
                              onChange={(e) => setNewMoldRule({ ...newMoldRule, desc: e.target.value })}
                              className="h-9"
                              placeholder="说明"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={addMoldRule} data-testid="add-mold">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <SectionSaveButton section="moldFee" label="模具费用" onSave={() => showSaveToast("模具费用")} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-8 flex justify-between sticky bottom-4 bg-background/95 backdrop-blur py-4 border-t">
            {!hideBack ? (
              <Button
                data-testid="button-back"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
            ) : <div />}
            <Button
              data-testid="button-generate"
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
