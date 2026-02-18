import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Package, Printer, Sparkles, Layers, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  type SoftBoxTypeConfig, type SoftBoxPrintingConfig, type SoftBoxPostProcessConfig,
  type SoftBoxFacePaperConfig,
  parseSoftBoxDimensionsFromFormula, softBoxDimensionLabels, isValidSoftBoxFormula,
} from "@/lib/softbox-config";
import { useSoftBox } from "@/lib/softbox-store";

interface SoftBoxSurveyPageProps {
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

export default function SoftBoxSurveyPage({
  backPath = "/",
  nextPath = "/softbox/quote",
  hideBack = false,
}: SoftBoxSurveyPageProps) {
  const [, navigate] = useLocation();
  const { config, updateConfig } = useSoftBox();
  const { toast } = useToast();

  const [newBoxType, setNewBoxType] = useState({ name: "", formula: "" });

  const showSaveToast = (label: string) => {
    toast({ title: `${label}已保存` });
  };

  const enabledBoxCount = config.boxTypes.filter(b => b.enabled).length;

  const addBoxType = () => {
    if (!newBoxType.name || !isValidSoftBoxFormula(newBoxType.formula)) return;
    const box: SoftBoxTypeConfig = {
      id: `softbox_${Date.now()}`,
      name: newBoxType.name,
      enabled: true,
      areaFormula: newBoxType.formula,
      requiredDimensions: parseSoftBoxDimensionsFromFormula(newBoxType.formula),
    };
    updateConfig({ boxTypes: [...config.boxTypes, box] });
    setNewBoxType({ name: "", formula: "" });
    toast({ title: "盒型已添加" });
  };

  const removeBoxType = (id: string) => {
    updateConfig({ boxTypes: config.boxTypes.filter(b => b.id !== id) });
  };

  const updateBoxField = (id: string, field: string, value: unknown) => {
    updateConfig({
      boxTypes: config.boxTypes.map(b => {
        if (b.id !== id) return b;
        const updated = { ...b, [field]: value };
        if (field === "areaFormula" && typeof value === "string") {
          updated.requiredDimensions = parseSoftBoxDimensionsFromFormula(value);
        }
        return updated;
      }),
    });
  };

  const updatePrintingField = (id: string, field: string, value: unknown) => {
    updateConfig({
      printingSides: config.printingSides.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const updatePostProcessField = (id: string, field: string, value: unknown) => {
    updateConfig({
      postProcesses: config.postProcesses.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const addPrintingSide = () => {
    const newItem: SoftBoxPrintingConfig = {
      id: `print_${Date.now()}`,
      name: "",
      enabled: true,
      pricePerSqm: 0,
    };
    updateConfig({ printingSides: [...config.printingSides, newItem] });
  };

  const removePrintingSide = (id: string) => {
    updateConfig({ printingSides: config.printingSides.filter(p => p.id !== id) });
  };

  const addPostProcess = () => {
    const newItem: SoftBoxPostProcessConfig = {
      id: `post_${Date.now()}`,
      name: "",
      enabled: true,
      pricePerSqm: 0,
    };
    updateConfig({ postProcesses: [...config.postProcesses, newItem] });
  };

  const removePostProcess = (id: string) => {
    updateConfig({ postProcesses: config.postProcesses.filter(p => p.id !== id) });
  };

  const updateFacePaperField = (id: string, field: string, value: unknown) => {
    updateConfig({
      facePapers: (config.facePapers || []).map(fp =>
        fp.id === id ? { ...fp, [field]: value } : fp
      ),
    });
  };

  const addFacePaper = () => {
    const newItem: SoftBoxFacePaperConfig = {
      id: `fp_${Date.now()}`,
      name: "",
      pricePerSqm: 0,
    };
    updateConfig({ facePapers: [...(config.facePapers || []), newItem] });
  };

  const removeFacePaper = (id: string) => {
    updateConfig({ facePapers: (config.facePapers || []).filter(fp => fp.id !== id) });
  };

  const handleBack = () => navigate(backPath);
  const handleNext = () => navigate(nextPath);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-survey-title">
            报价器生成器 - 软盒
          </h1>
          <p className="text-sm text-muted-foreground mt-1">配置盒型、材料、印刷方式和后处理工艺的定价规则</p>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Accordion type="multiple" defaultValue={["boxTypes"]} className="space-y-4">

            <AccordionItem value="boxTypes" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-boxtypes">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">盒型配置</div>
                    <div className="text-sm text-muted-foreground">
                      配置盒型及展开面积公式（已启用 {enabledBoxCount}/{config.boxTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    配置盒型的展开面积公式，系统会自动识别所需的尺寸字段（长/宽/高）。
                  </p>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead className="w-[120px]">盒型名称</TableHead>
                          <TableHead>展开面积公式</TableHead>
                          <TableHead className="w-[100px]">尺寸字段</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.boxTypes.map(box => (
                          <TableRow key={box.id}>
                            <TableCell>
                              <Checkbox
                                checked={box.enabled}
                                onCheckedChange={(v) => updateBoxField(box.id, "enabled", !!v)}
                                data-testid={`toggle-boxtype-${box.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={box.name}
                                onChange={(e) => updateBoxField(box.id, "name", e.target.value)}
                                className="h-9"
                                data-testid={`boxtype-name-${box.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  value={box.areaFormula}
                                  onChange={(e) => updateBoxField(box.id, "areaFormula", e.target.value)}
                                  className={`h-9 ${box.areaFormula && !isValidSoftBoxFormula(box.areaFormula) ? "border-destructive" : ""}`}
                                  data-testid={`boxtype-formula-${box.id}`}
                                />
                                {box.areaFormula && !isValidSoftBoxFormula(box.areaFormula) && (
                                  <p className="text-xs text-destructive">请输入有效公式，需包含数字、运算符和尺寸关键词(长/宽/高)</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {box.requiredDimensions.map(dim => (
                                  <Badge key={dim} variant="secondary" className="text-xs">
                                    {softBoxDimensionLabels[dim] || dim}
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
                                placeholder="例如：(长+宽×2+4)×(宽+高×2+2)"
                                className={`h-9 ${newBoxType.formula && !isValidSoftBoxFormula(newBoxType.formula) ? "border-destructive" : ""}`}
                                data-testid="new-boxtype-formula"
                              />
                              {newBoxType.formula && !isValidSoftBoxFormula(newBoxType.formula) && (
                                <p className="text-xs text-destructive">需包含数字、运算符和尺寸关键词(长/宽/高)</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {newBoxType.formula && isValidSoftBoxFormula(newBoxType.formula)
                                ? parseSoftBoxDimensionsFromFormula(newBoxType.formula).map(d => softBoxDimensionLabels[d] || d).join("、") || "无匹配"
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

            <AccordionItem value="materials" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-materials">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">材料</div>
                    <div className="text-sm text-muted-foreground">
                      配置面纸类型及单价（{(config.facePapers || []).length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">面纸类型</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-3">
                        <span className="text-sm font-medium text-primary flex-1">面纸名称</span>
                        <span className="text-sm font-medium text-primary w-[140px]">单价（元/m²）</span>
                        <span className="w-9"></span>
                      </div>
                      {(config.facePapers || []).map(fp => (
                        <div key={fp.id} className="flex items-center gap-3 px-3">
                          <Input
                            value={fp.name}
                            onChange={(e) => updateFacePaperField(fp.id, "name", e.target.value)}
                            className="flex-1"
                            data-testid={`facepaper-name-${fp.id}`}
                          />
                          <Input
                            type="number"
                            step={0.1}
                            value={fp.pricePerSqm || ""}
                            onChange={(e) => updateFacePaperField(fp.id, "pricePerSqm", Number(e.target.value) || 0)}
                            className="w-[140px]"
                            data-testid={`facepaper-price-${fp.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFacePaper(fp.id)}
                            className="text-destructive shrink-0"
                            data-testid={`remove-facepaper-${fp.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={addFacePaper} className="gap-1.5" data-testid="add-facepaper">
                    <Plus className="w-3.5 h-3.5" /> 添加面纸类型
                  </Button>
                  <SectionSaveButton section="materials" label="材料配置" onSave={() => showSaveToast("材料配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="printing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-printing">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">印刷方式</div>
                    <div className="text-sm text-muted-foreground">
                      配置印刷方式及单价（{config.printingSides.filter(p => p.enabled).length}/{config.printingSides.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    配置可选的印刷方式及其每平方米单价。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead>印刷方式</TableHead>
                          <TableHead className="w-[140px]">单价（元/m²）</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.printingSides.map(ps => (
                          <TableRow key={ps.id}>
                            <TableCell>
                              <Checkbox
                                checked={ps.enabled}
                                onCheckedChange={(v) => updatePrintingField(ps.id, "enabled", !!v)}
                                data-testid={`toggle-print-${ps.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={ps.name}
                                onChange={(e) => updatePrintingField(ps.id, "name", e.target.value)}
                                className="h-9"
                                data-testid={`print-name-${ps.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={ps.pricePerSqm || ""}
                                onChange={(e) => updatePrintingField(ps.id, "pricePerSqm", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`print-price-${ps.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePrintingSide(ps.id)}
                                className="text-destructive"
                                data-testid={`remove-print-${ps.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addPrintingSide} className="gap-1.5" data-testid="add-printing">
                    <Plus className="w-3.5 h-3.5" /> 添加印刷方式
                  </Button>
                  <SectionSaveButton section="printing" label="印刷配置" onSave={() => showSaveToast("印刷配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="postProcess" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-postprocess">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">后处理工艺</div>
                    <div className="text-sm text-muted-foreground">
                      配置后处理工艺及单价（{config.postProcesses.filter(p => p.enabled).length}/{config.postProcesses.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    配置可选的后处理工艺及其每平方米单价。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead>工艺名称</TableHead>
                          <TableHead className="w-[140px]">单价（元/m²）</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.postProcesses.map(pp => (
                          <TableRow key={pp.id}>
                            <TableCell>
                              <Checkbox
                                checked={pp.enabled}
                                onCheckedChange={(v) => updatePostProcessField(pp.id, "enabled", !!v)}
                                data-testid={`toggle-post-${pp.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={pp.name}
                                onChange={(e) => updatePostProcessField(pp.id, "name", e.target.value)}
                                className="h-9"
                                data-testid={`post-name-${pp.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.1}
                                value={pp.pricePerSqm || ""}
                                onChange={(e) => updatePostProcessField(pp.id, "pricePerSqm", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`post-price-${pp.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePostProcess(pp.id)}
                                className="text-destructive"
                                data-testid={`remove-post-${pp.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addPostProcess} className="gap-1.5" data-testid="add-postprocess">
                    <Plus className="w-3.5 h-3.5" /> 添加后处理工艺
                  </Button>
                  <SectionSaveButton section="postProcess" label="后处理配置" onSave={() => showSaveToast("后处理配置")} />
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
