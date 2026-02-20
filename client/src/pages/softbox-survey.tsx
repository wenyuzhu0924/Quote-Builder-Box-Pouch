import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Package, Printer, Sparkles, Layers, Save, Film, Wrench, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  type SoftBoxTypeConfig, type SoftBoxPrintingSideOption,
  type SoftBoxFacePaperConfig, type SoftBoxLaminationOption,
  parseSoftBoxDimensionsFromDualFormulas, softBoxDimensionLabels, isValidSoftBoxFormula,
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

  const [newBoxType, setNewBoxType] = useState({ name: "", frameLFormula: "", frameWFormula: "" });

  const showSaveToast = (label: string) => {
    toast({ title: `${label}已保存` });
  };

  const enabledBoxCount = config.boxTypes.filter(b => b.enabled).length;

  const addBoxType = () => {
    if (!newBoxType.name || !isValidSoftBoxFormula(newBoxType.frameLFormula) || !isValidSoftBoxFormula(newBoxType.frameWFormula)) return;
    const box: SoftBoxTypeConfig = {
      id: `softbox_${Date.now()}`,
      name: newBoxType.name,
      enabled: true,
      frameLengthFormula: newBoxType.frameLFormula,
      frameWidthFormula: newBoxType.frameWFormula,
      requiredDimensions: parseSoftBoxDimensionsFromDualFormulas(newBoxType.frameLFormula, newBoxType.frameWFormula),
    };
    updateConfig({ boxTypes: [...config.boxTypes, box] });
    setNewBoxType({ name: "", frameLFormula: "", frameWFormula: "" });
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
        if (field === "frameLengthFormula" || field === "frameWidthFormula") {
          updated.requiredDimensions = parseSoftBoxDimensionsFromDualFormulas(
            updated.frameLengthFormula, updated.frameWidthFormula
          );
        }
        return updated;
      }),
    });
  };

  const printingSideOptions = config.printingSideOptions || [];
  const printingTier = config.printingTier || { baseCost: 450, baseThreshold: 3000, stepCost: 80, stepSize: 1000 };

  const updatePrintingSideField = (id: string, field: string, value: unknown) => {
    updateConfig({
      printingSideOptions: printingSideOptions.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const addPrintingSideOption = () => {
    const newItem: SoftBoxPrintingSideOption = {
      id: `ps_${Date.now()}`,
      name: "",
      sides: 1,
      enabled: true,
    };
    updateConfig({ printingSideOptions: [...printingSideOptions, newItem] });
  };

  const removePrintingSideOption = (id: string) => {
    updateConfig({ printingSideOptions: printingSideOptions.filter(p => p.id !== id) });
  };

  const updatePrintingTierField = (field: string, value: number) => {
    updateConfig({ printingTier: { ...printingTier, [field]: value } });
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

  const exportFacePaperCSV = () => {
    const papers = config.facePapers || [];
    const headers = ["面纸名称", "单价(元/m²)"];
    const escCSV = (v: string | number) => { const s = String(v); return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = papers.map(fp => [fp.name, fp.pricePerSqm].map(escCSV).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `面纸材料库_${new Date().toLocaleDateString("zh-CN")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: `已导出 ${papers.length} 种面纸材料` });
  };

  const parseCSVRows = (text: string): string[][] => {
    const rows: string[][] = []; let cols: string[] = []; let cur = ""; let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuote) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { cols.push(cur); cur = ""; }
        else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) { if (ch === '\r') i++; cols.push(cur); cur = ""; if (cols.some(c => c.trim())) rows.push(cols); cols = []; }
        else if (ch === '\r') { cols.push(cur); cur = ""; if (cols.some(c => c.trim())) rows.push(cols); cols = []; }
        else { cur += ch; }
      }
    }
    cols.push(cur); if (cols.some(c => c.trim())) rows.push(cols);
    return rows;
  };

  const importFacePaperCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = (e.target?.result as string) || "";
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const rows = parseCSVRows(text);
        if (rows.length < 2) { toast({ title: "导入失败", description: "CSV文件为空或格式错误", variant: "destructive" }); return; }
        const imported: SoftBoxFacePaperConfig[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          const name = (cols[0] || "").trim();
          if (!name) continue;
          imported.push({ id: `fp_${Date.now()}_${i}`, name, pricePerSqm: Number(cols[1]) || 0 });
        }
        if (imported.length === 0) { toast({ title: "导入失败", description: "未找到有效材料数据", variant: "destructive" }); return; }
        updateConfig({ facePapers: imported });
        toast({ title: "导入成功", description: `已导入 ${imported.length} 种面纸材料，替换原有材料库` });
      } catch { toast({ title: "导入失败", description: "CSV文件解析出错", variant: "destructive" }); }
    };
    reader.readAsText(file);
  };

  const laminationOptions = config.laminationOptions || [];

  const updateLaminationField = (id: string, field: string, value: unknown) => {
    updateConfig({
      laminationOptions: laminationOptions.map(lo =>
        lo.id === id ? { ...lo, [field]: value } : lo
      ),
    });
  };

  const addLaminationOption = () => {
    const newItem: SoftBoxLaminationOption = {
      id: `lam_${Date.now()}`,
      name: "",
      pricePerSqm: 0,
      faces: 1,
    };
    updateConfig({ laminationOptions: [...laminationOptions, newItem] });
  };

  const removeLaminationOption = (id: string) => {
    updateConfig({ laminationOptions: laminationOptions.filter(lo => lo.id !== id) });
  };

  const uvConfig = config.uvConfig || { enabled: true, sheetWidth: 59, sheetHeight: 88, pricePerSheet: 0.15, maxPerSheet: 8, minTotalCharge: 150 };

  const updateUVField = (field: string, value: unknown) => {
    updateConfig({ uvConfig: { ...uvConfig, [field]: value } });
  };

  const gluing = config.gluing || { feePerBox: 0, minCharge: 0 };

  const handleBack = () => navigate(backPath);
  const handleNext = () => navigate(nextPath);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-survey-title">
            报价器生成器 - 软盒
          </h1>
          <p className="text-sm text-muted-foreground mt-1">配置盒型、材料、印刷方式、覆膜、UV和糊盒的定价规则</p>
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
                      配置盒型及展开红框公式（已启用 {enabledBoxCount}/{config.boxTypes.length} 种）
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    分别配置红框的长度公式和宽度公式，展开面积 = 红框长 × 红框宽。系统会自动识别所需的尺寸字段（长/宽/高）。
                  </p>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">启用</TableHead>
                          <TableHead className="w-[100px]">盒型名称</TableHead>
                          <TableHead>红框长公式</TableHead>
                          <TableHead>红框宽公式</TableHead>
                          <TableHead className="w-[80px]">尺寸</TableHead>
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
                              <Input
                                value={box.frameLengthFormula}
                                onChange={(e) => updateBoxField(box.id, "frameLengthFormula", e.target.value)}
                                className={`h-9 ${box.frameLengthFormula && !isValidSoftBoxFormula(box.frameLengthFormula) ? "border-destructive" : ""}`}
                                placeholder="例如：长+4×高+2"
                                data-testid={`boxtype-framel-${box.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={box.frameWidthFormula}
                                onChange={(e) => updateBoxField(box.id, "frameWidthFormula", e.target.value)}
                                className={`h-9 ${box.frameWidthFormula && !isValidSoftBoxFormula(box.frameWidthFormula) ? "border-destructive" : ""}`}
                                placeholder="例如：2×宽+3×高"
                                data-testid={`boxtype-framew-${box.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
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
                            <Input
                              value={newBoxType.frameLFormula}
                              onChange={(e) => setNewBoxType({ ...newBoxType, frameLFormula: e.target.value })}
                              placeholder="红框长公式"
                              className={`h-9 ${newBoxType.frameLFormula && !isValidSoftBoxFormula(newBoxType.frameLFormula) ? "border-destructive" : ""}`}
                              data-testid="new-boxtype-framel"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newBoxType.frameWFormula}
                              onChange={(e) => setNewBoxType({ ...newBoxType, frameWFormula: e.target.value })}
                              placeholder="红框宽公式"
                              className={`h-9 ${newBoxType.frameWFormula && !isValidSoftBoxFormula(newBoxType.frameWFormula) ? "border-destructive" : ""}`}
                              data-testid="new-boxtype-framew"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {newBoxType.frameLFormula && newBoxType.frameWFormula &&
                               isValidSoftBoxFormula(newBoxType.frameLFormula) && isValidSoftBoxFormula(newBoxType.frameWFormula)
                                ? parseSoftBoxDimensionsFromDualFormulas(newBoxType.frameLFormula, newBoxType.frameWFormula)
                                    .map(d => softBoxDimensionLabels[d] || d).join("、") || "无匹配"
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
                    提示：展开面积 = 红框长 × 红框宽。在公式中使用"长"、"宽"、"高"关键词，支持 ×、÷、+、- 运算符和括号。
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
                    <p className="text-sm text-muted-foreground mb-3">材料成本 = 展开面积 × 材料单价</p>
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
                            step={0.001}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={exportFacePaperCSV} className="gap-1.5" data-testid="export-facepaper-csv">
                      <Download className="w-3.5 h-3.5" /> 导出材料库CSV
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" data-testid="import-facepaper-csv" onClick={() => document.getElementById("softbox-facepaper-csv-input")?.click()}>
                      <Upload className="w-3.5 h-3.5" /> 从CSV导入材料库
                    </Button>
                    <input id="softbox-facepaper-csv-input" type="file" accept=".csv" className="hidden" data-testid="file-input-softbox-facepaper-csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) { importFacePaperCSV(f); e.target.value = ""; } }} />
                  </div>
                  <SectionSaveButton section="materials" label="材料配置" onSave={() => showSaveToast("材料配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="printing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-printing">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">印刷费用</div>
                    <div className="text-sm text-muted-foreground">
                      阶梯定价：≤{printingTier.baseThreshold}个 每面¥{printingTier.baseCost}，每多{printingTier.stepSize}个 +¥{printingTier.stepCost}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    印刷成本 = 每面价格(Q) × 面数 ÷ 数量。每面价格随数量阶梯递增。
                  </p>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">阶梯定价参数</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">基础价格（¥/面）</Label>
                        <Input
                          type="number"
                          step={1}
                          value={printingTier.baseCost || ""}
                          onChange={(e) => updatePrintingTierField("baseCost", Number(e.target.value) || 0)}
                          data-testid="printing-basecost"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">基础阈值（个）</Label>
                        <Input
                          type="number"
                          step={100}
                          value={printingTier.baseThreshold || ""}
                          onChange={(e) => updatePrintingTierField("baseThreshold", Number(e.target.value) || 0)}
                          data-testid="printing-threshold"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">每步递增（¥）</Label>
                        <Input
                          type="number"
                          step={1}
                          value={printingTier.stepCost || ""}
                          onChange={(e) => updatePrintingTierField("stepCost", Number(e.target.value) || 0)}
                          data-testid="printing-stepcost"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">步长（个）</Label>
                        <Input
                          type="number"
                          step={100}
                          value={printingTier.stepSize || ""}
                          onChange={(e) => updatePrintingTierField("stepSize", Number(e.target.value) || 0)}
                          data-testid="printing-stepsize"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">印刷面选项</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">启用</TableHead>
                            <TableHead>选项名称</TableHead>
                            <TableHead className="w-[100px]">面数</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {printingSideOptions.map(ps => (
                            <TableRow key={ps.id}>
                              <TableCell>
                                <Checkbox
                                  checked={ps.enabled}
                                  onCheckedChange={(v) => updatePrintingSideField(ps.id, "enabled", !!v)}
                                  data-testid={`toggle-print-${ps.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={ps.name}
                                  onChange={(e) => updatePrintingSideField(ps.id, "name", e.target.value)}
                                  className="h-9"
                                  data-testid={`print-name-${ps.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={ps.sides || ""}
                                  onChange={(e) => updatePrintingSideField(ps.id, "sides", Number(e.target.value) || 1)}
                                  className="h-9"
                                  data-testid={`print-sides-${ps.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePrintingSideOption(ps.id)}
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
                  </div>
                  <Button variant="outline" size="sm" onClick={addPrintingSideOption} className="gap-1.5" data-testid="add-printing">
                    <Plus className="w-3.5 h-3.5" /> 添加印刷面选项
                  </Button>
                  <SectionSaveButton section="printing" label="印刷配置" onSave={() => showSaveToast("印刷配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lamination" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-lamination">
                <div className="flex items-center gap-3">
                  <Film className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">覆膜配置</div>
                    <div className="text-sm text-muted-foreground">
                      配置覆膜选项（{laminationOptions.length} 种），公式：max(面积 × 单价 × 面数, 最低消费 ÷ 数量)
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    每只覆膜成本 = max(展开面积 × 单价 × 面数, 最低消费 ÷ 数量)
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>覆膜类型</TableHead>
                          <TableHead className="w-[120px]">单价（元/m²）</TableHead>
                          <TableHead className="w-[80px]">面数</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laminationOptions.map(lo => (
                          <TableRow key={lo.id}>
                            <TableCell>
                              <Input
                                value={lo.name}
                                onChange={(e) => updateLaminationField(lo.id, "name", e.target.value)}
                                className="h-9"
                                data-testid={`lam-name-${lo.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step={0.01}
                                value={lo.pricePerSqm || ""}
                                onChange={(e) => updateLaminationField(lo.id, "pricePerSqm", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`lam-price-${lo.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={lo.faces ?? ""}
                                onChange={(e) => updateLaminationField(lo.id, "faces", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`lam-faces-${lo.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLaminationOption(lo.id)}
                                className="text-destructive"
                                data-testid={`remove-lam-${lo.id}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={addLaminationOption} className="gap-1.5" data-testid="add-lamination">
                      <Plus className="w-3.5 h-3.5" /> 添加覆膜类型
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">最低消费（¥）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={config.laminationMinCharge || ""}
                        onChange={(e) => updateConfig({ laminationMinCharge: Number(e.target.value) || 0 })}
                        className="w-[100px] h-9"
                        data-testid="lam-min-charge"
                      />
                    </div>
                  </div>
                  <SectionSaveButton section="lamination" label="覆膜配置" onSave={() => showSaveToast("覆膜配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="uvCoating" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-uv">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">UV上光</div>
                    <div className="text-sm text-muted-foreground">
                      {uvConfig.enabled ? "已启用" : "已禁用"} — 版面拼版计算，最低消费 ¥{uvConfig.minTotalCharge}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    UV拼版：将产品展开红框排入版面（两方向取最优），计算所需版数。
                    总UV成本 = max(版数 × 每版单价, 最低消费)，每只UV成本 = 总成本 ÷ 数量。
                  </p>
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox
                      checked={uvConfig.enabled}
                      onCheckedChange={(v) => updateUVField("enabled", !!v)}
                      data-testid="toggle-uv-enabled"
                    />
                    <Label className="text-sm">启用UV上光选项</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">版面宽度（cm）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={uvConfig.sheetWidth || ""}
                        onChange={(e) => updateUVField("sheetWidth", Number(e.target.value) || 0)}
                        data-testid="uv-sheet-width"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">版面高度（cm）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={uvConfig.sheetHeight || ""}
                        onChange={(e) => updateUVField("sheetHeight", Number(e.target.value) || 0)}
                        data-testid="uv-sheet-height"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">每版单价（¥）</Label>
                      <Input
                        type="number"
                        step={0.01}
                        value={uvConfig.pricePerSheet || ""}
                        onChange={(e) => updateUVField("pricePerSheet", Number(e.target.value) || 0)}
                        data-testid="uv-price-per-sheet"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">每版最多（个）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={uvConfig.maxPerSheet || ""}
                        onChange={(e) => updateUVField("maxPerSheet", Number(e.target.value) || 0)}
                        data-testid="uv-max-per-sheet"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">最低消费（¥）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={uvConfig.minTotalCharge || ""}
                        onChange={(e) => updateUVField("minTotalCharge", Number(e.target.value) || 0)}
                        data-testid="uv-min-charge"
                      />
                    </div>
                  </div>
                  <SectionSaveButton section="uvCoating" label="UV上光配置" onSave={() => showSaveToast("UV上光配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="gluing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4" data-testid="section-gluing">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">糊盒配置</div>
                    <div className="text-sm text-muted-foreground">
                      公式：max(每盒费用, 最低消费 ÷ 数量)
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    每只糊盒成本 = max(每盒费用, 最低消费 ÷ 数量)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">每盒费用（元/个）</Label>
                      <Input
                        type="number"
                        step={0.01}
                        value={gluing.feePerBox || ""}
                        onChange={(e) => updateConfig({ gluing: { ...gluing, feePerBox: Number(e.target.value) || 0 } })}
                        data-testid="gluing-fee"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">最低消费（¥）</Label>
                      <Input
                        type="number"
                        step={1}
                        value={gluing.minCharge || ""}
                        onChange={(e) => updateConfig({ gluing: { ...gluing, minCharge: Number(e.target.value) || 0 } })}
                        data-testid="gluing-min"
                      />
                    </div>
                  </div>
                  <SectionSaveButton section="gluing" label="糊盒配置" onSave={() => showSaveToast("糊盒配置")} />
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          <div className="flex justify-between gap-3 pt-6">
            {!hideBack && (
              <Button variant="outline" onClick={handleBack} className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
            )}
            <div className="flex-1" />
            <Button onClick={handleNext} className="gap-2" data-testid="button-generate">
              <ArrowRight className="w-4 h-4" />
              生成报价器
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
