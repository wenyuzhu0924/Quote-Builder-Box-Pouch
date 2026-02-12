import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Plus, Trash2, Save, Package, Layers, Printer, Combine, Scissors, Grid3X3, Calculator, Settings, Zap, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuote, type CustomMaterial, type PrintingPriceRule, type LaminationPriceRule, type PostProcessingOptionConfig, type PostProcessingPricingType, type PostProcessingCategory, type BagTypePrice, type SpecOption, type QuantityDiscountRule, type CustomBagType, type DigitalMaterial, type DigitalPrintMode, type DigitalSpecialProcess, type DigitalSpecialCalcBasis, type DigitalZipperType, type DigitalValveType, type DigitalAccessory, type DigitalPrintingTier, parseDimensionsFromFormula, isValidBagFormula, isValidMakingFormula } from "@/lib/quote-store";

function annotateMakingFormula(formula: string): React.ReactNode {
  const dimNames = ["袋宽", "袋高", "底插入", "底琴", "侧面展开", "侧琴", "背封边"];
  const dimPattern = new RegExp(`(${dimNames.join("|")})`, "g");
  const parts: Array<{ text: string; isUnit: boolean }> = [];
  const annotated = formula.replace(dimPattern, "$1\u0000（米）\u0000");
  const segments = annotated.split(/([\d.]+)/);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (/^[\d.]+$/.test(seg)) {
      const after = segments.slice(i + 1).join("");
      const before = segments.slice(0, i).join("");
      const nextHasMultiply = /^\s*[×*]/.test(after);
      const prevHasMultiply = /[×*]\s*$/.test(before);
      parts.push({ text: seg, isUnit: false });
      if (nextHasMultiply && !prevHasMultiply) {
        parts.push({ text: "（元/米）", isUnit: true });
      } else if (!nextHasMultiply && !prevHasMultiply) {
        parts.push({ text: "（元）", isUnit: true });
      }
    } else {
      const subs = seg.split("\u0000");
      for (const s of subs) {
        if (!s) continue;
        if (s.startsWith("（") && s.endsWith("）")) {
          parts.push({ text: s, isUnit: true });
        } else {
          parts.push({ text: s, isUnit: false });
        }
      }
    }
  }
  return (
    <>
      {parts.map((p, i) =>
        p.isUnit ? (
          <span key={i} className="text-xs text-muted-foreground">{p.text}</span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
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

interface SurveyPageProps {
  backPath?: string;
  nextPath?: string;
  hideBack?: boolean;
}

export default function SurveyPage({ backPath = "/", nextPath = "/quote", hideBack = false }: SurveyPageProps) {
  const [, navigate] = useLocation();
  const { state, updateConfig, updateDigitalConfig } = useQuote();
  const { toast } = useToast();

  const showSaveToast = (section: string) => {
    toast({ title: `${section}已保存`, description: "配置已自动保存到当前会话" });
  };
  const config = state.config;
  const digitalConfig = state.digitalConfig;

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
    makingCostFormula: "",
  });

  const [newLamination, setNewLamination] = useState({ name: "", pricePerSqm: 0 });
  const [newPostProcessing, setNewPostProcessing] = useState({ name: "", category: "additionalProcess" as PostProcessingCategory });
  const [newSurfaceTreatment, setNewSurfaceTreatment] = useState({ name: "" });

  const [newDigitalMaterial, setNewDigitalMaterial] = useState<Partial<DigitalMaterial>>({
    name: "",
    thickness: 0,
    density: 0,
    price: 0,
    squarePrice: 0,
    notes: "",
  });

  const [newSpecialProcess, setNewSpecialProcess] = useState({ name: "", unitPrice: 0, calcBasis: "perQuantity" as DigitalSpecialCalcBasis, minPrice: 0, notes: "" });
  const [newZipper, setNewZipper] = useState({ name: "", pricePerMeter: 0 });
  const [newValve, setNewValve] = useState({ name: "", pricePerUnit: 0 });
  const [newAccessory, setNewAccessory] = useState({ name: "", price: 0, isStackable: false });

  if (!state.productType) {
    navigate(backPath);
    return null;
  }

  const isGravure = state.productType === "pouch" && state.printingMethod === "gravure";
  const isDigital = state.productType === "pouch" && state.printingMethod === "digital";

  const handleBack = () => {
    navigate(backPath);
  };

  const handleNext = () => {
    navigate(nextPath);
  };

  const addCustomBagType = () => {
    if (!newBagType.name || !newBagType.formula) return;
    if (!isValidBagFormula(newBagType.formula)) {
      toast({ title: "公式无效", description: "请输入包含数字、运算符和尺寸关键词的有效公式", variant: "destructive" });
      return;
    }
    const dimensions = parseDimensionsFromFormula(newBagType.formula || "");
    const bagType: CustomBagType = {
      id: `custom_${Date.now()}`,
      name: newBagType.name || "",
      formula: newBagType.formula || "",
      requiredDimensions: dimensions,
      wasteCoefficient: newBagType.wasteCoefficient || 1.1,
      makingCostFormula: newBagType.makingCostFormula || "",
      makingCoefficient: 0,
      makingMinPrice: 0,
      isBuiltIn: false,
      enabled: true,
    };
    updateConfig({ customBagTypes: [...config.customBagTypes, bagType] });
    setNewBagType({ name: "", formula: "", wasteCoefficient: 1.1, makingCostFormula: "" });
    toast({ title: "袋型已添加", description: `已自动匹配尺寸字段：${dimensions.length > 0 ? dimensions.join("、") : "无"}` });
  };

  const removeBagType = (id: string) => {
    updateConfig({ customBagTypes: config.customBagTypes.filter((b) => b.id !== id) });
  };

  const toggleBagType = (id: string) => {
    updateConfig({
      customBagTypes: config.customBagTypes.map((b) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    });
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

  const addPrintingRule = () => {
    const maxCoverage = config.printingPriceRules.length > 0
      ? Math.max(...config.printingPriceRules.map(r => r.coverage)) + 20
      : 100;
    const newRule: PrintingPriceRule = { coverage: maxCoverage, label: `覆盖${maxCoverage}%`, pricePerSqm: 0 };
    updateConfig({ printingPriceRules: [...config.printingPriceRules, newRule] });
  };

  const removePrintingRule = (index: number) => {
    const updated = config.printingPriceRules.filter((_, i) => i !== index);
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

  const updatePostProcessingField = (id: string, field: string, value: any) => {
    updateConfig({
      postProcessingOptions: config.postProcessingOptions.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
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

  const addPostProcessing = (category: PostProcessingCategory) => {
    const name = category === "additionalProcess" ? newPostProcessing.name : newSurfaceTreatment.name;
    if (!name) return;
    const option: PostProcessingOptionConfig = {
      id: `pp_${Date.now()}`,
      name,
      enabled: true,
      category,
      pricingType: "fixed",
      fixedPrice: 0,
      description: "",
    };
    updateConfig({ postProcessingOptions: [...config.postProcessingOptions, option] });
    if (category === "additionalProcess") {
      setNewPostProcessing({ name: "", category: "additionalProcess" });
    } else {
      setNewSurfaceTreatment({ name: "" });
    }
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
    sideGusset: "侧琴",
    sealEdge: "封边",
    areaCoefficient: "面积系数",
    quantityUnit: "数量单位",
  };

  const addDigitalBagType = () => {
    if (!newBagType.name || !newBagType.formula) return;
    if (!isValidBagFormula(newBagType.formula)) {
      toast({ title: "公式无效", description: "请输入包含数字、运算符和尺寸关键词的有效公式", variant: "destructive" });
      return;
    }
    const dimensions = parseDimensionsFromFormula(newBagType.formula || "");
    const bagType: CustomBagType = {
      id: `custom_${Date.now()}`,
      name: newBagType.name || "",
      formula: newBagType.formula || "",
      requiredDimensions: dimensions,
      wasteCoefficient: newBagType.wasteCoefficient || 1.0,
      makingCostFormula: newBagType.makingCostFormula || "",
      makingCoefficient: 0.25,
      makingMinPrice: 300,
      isBuiltIn: false,
      enabled: true,
    };
    updateDigitalConfig({ customBagTypes: [...digitalConfig.customBagTypes, bagType] });
    setNewBagType({ name: "", formula: "", wasteCoefficient: 1.0, makingCostFormula: "" });
    toast({ title: "袋型已添加" });
  };

  const removeDigitalBagType = (id: string) => {
    updateDigitalConfig({ customBagTypes: digitalConfig.customBagTypes.filter((b) => b.id !== id) });
  };

  const toggleDigitalBagType = (id: string) => {
    updateDigitalConfig({
      customBagTypes: digitalConfig.customBagTypes.map((b) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    });
  };

  const updateDigitalMaterial = (category: "print" | "composite" | "seal", id: string, field: keyof DigitalMaterial, value: string | number) => {
    if (category === "print") {
      updateDigitalConfig({
        printLayerMaterials: digitalConfig.printLayerMaterials.map((m) =>
          m.id === id ? { ...m, [field]: value } : m
        ),
      });
    } else if (category === "composite") {
      updateDigitalConfig({
        compositeLayerMaterials: digitalConfig.compositeLayerMaterials.map((m) =>
          m.id === id ? { ...m, [field]: value } : m
        ),
      });
    } else {
      updateDigitalConfig({
        sealLayerMaterials: digitalConfig.sealLayerMaterials.map((m) =>
          m.id === id ? { ...m, [field]: value } : m
        ),
      });
    }
  };

  const addDigitalMaterial = (category: "print" | "composite" | "seal") => {
    const material: DigitalMaterial = {
      id: `${category}_${Date.now()}`,
      name: "新材料",
      thickness: 25,
      density: 0.91,
      price: 20,
      squarePrice: 0.46,
      category,
      notes: "",
    };
    if (category === "print") {
      updateDigitalConfig({ printLayerMaterials: [...digitalConfig.printLayerMaterials, material] });
    } else if (category === "composite") {
      updateDigitalConfig({ compositeLayerMaterials: [...digitalConfig.compositeLayerMaterials, material] });
    } else {
      updateDigitalConfig({ sealLayerMaterials: [...digitalConfig.sealLayerMaterials, material] });
    }
    toast({ title: "已添加新材料，请编辑详情" });
  };

  const removeDigitalMaterial = (category: "print" | "composite" | "seal", id: string) => {
    if (category === "print") {
      updateDigitalConfig({ printLayerMaterials: digitalConfig.printLayerMaterials.filter((m) => m.id !== id) });
    } else if (category === "composite") {
      updateDigitalConfig({ compositeLayerMaterials: digitalConfig.compositeLayerMaterials.filter((m) => m.id !== id) });
    } else {
      updateDigitalConfig({ sealLayerMaterials: digitalConfig.sealLayerMaterials.filter((m) => m.id !== id) });
    }
  };

  const toggleDigitalPrintMode = (id: string) => {
    updateDigitalConfig({
      printModes: digitalConfig.printModes.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    });
  };

  const updateDigitalPrintMode = (id: string, field: keyof DigitalPrintMode, value: string | number | boolean) => {
    updateDigitalConfig({
      printModes: digitalConfig.printModes.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  const addDigitalPrintMode = () => {
    const mode: DigitalPrintMode = {
      id: `pm_${Date.now()}`,
      name: "新印刷模式",
      enabled: true,
      coefficient: 1,
    };
    updateDigitalConfig({ printModes: [...digitalConfig.printModes, mode] });
  };

  const deleteDigitalPrintMode = (id: string) => {
    updateDigitalConfig({ printModes: digitalConfig.printModes.filter((m) => m.id !== id) });
  };

  const addDigitalPrintingTier = () => {
    const lastTier = digitalConfig.printingTiers[digitalConfig.printingTiers.length - 1];
    const tier: DigitalPrintingTier = {
      maxRevolutions: (lastTier?.maxRevolutions || 0) + 500,
      pricePerRevolution: lastTier?.pricePerRevolution || 0,
      label: "",
    };
    updateDigitalConfig({ printingTiers: [...digitalConfig.printingTiers, tier] });
  };

  const deleteDigitalPrintingTier = (index: number) => {
    updateDigitalConfig({ printingTiers: digitalConfig.printingTiers.filter((_, i) => i !== index) });
  };

  const toggleDigitalSpecialProcess = (id: string) => {
    updateDigitalConfig({
      specialProcesses: digitalConfig.specialProcesses.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  const updateDigitalSpecialProcess = (id: string, field: keyof DigitalSpecialProcess, value: string | number) => {
    updateDigitalConfig({
      specialProcesses: digitalConfig.specialProcesses.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  const toggleDigitalZipper = (id: string) => {
    updateDigitalConfig({
      zipperTypes: digitalConfig.zipperTypes.map((z) =>
        z.id === id ? { ...z, enabled: !z.enabled } : z
      ),
    });
  };

  const updateDigitalZipper = (id: string, field: keyof DigitalZipperType, value: string | number) => {
    updateDigitalConfig({
      zipperTypes: digitalConfig.zipperTypes.map((z) =>
        z.id === id ? { ...z, [field]: value } : z
      ),
    });
  };

  const toggleDigitalValve = (id: string) => {
    updateDigitalConfig({
      valveTypes: digitalConfig.valveTypes.map((v) =>
        v.id === id ? { ...v, enabled: !v.enabled } : v
      ),
    });
  };

  const updateDigitalValve = (id: string, field: keyof DigitalValveType, value: string | number) => {
    updateDigitalConfig({
      valveTypes: digitalConfig.valveTypes.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      ),
    });
  };

  const toggleDigitalAccessory = (id: string) => {
    updateDigitalConfig({
      accessories: digitalConfig.accessories.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    });
  };

  const updateDigitalAccessory = (id: string, field: keyof DigitalAccessory, value: string | number | boolean) => {
    updateDigitalConfig({
      accessories: digitalConfig.accessories.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    });
  };

  const updateDigitalPrintingTier = (index: number, field: keyof DigitalPrintingTier, value: string | number) => {
    const updated = [...digitalConfig.printingTiers];
    updated[index] = { ...updated[index], [field]: value };
    updateDigitalConfig({ printingTiers: updated });
  };

  const addSpecialProcess = () => {
    if (!newSpecialProcess.name) return;
    const process: DigitalSpecialProcess = {
      id: `sp_${Date.now()}`,
      name: newSpecialProcess.name,
      unitPrice: newSpecialProcess.unitPrice,
      calcBasis: newSpecialProcess.calcBasis,
      minPrice: newSpecialProcess.minPrice,
      notes: newSpecialProcess.notes,
      enabled: true,
    };
    updateDigitalConfig({ specialProcesses: [...digitalConfig.specialProcesses, process] });
    setNewSpecialProcess({ name: "", unitPrice: 0, calcBasis: "perQuantity", minPrice: 0, notes: "" });
    toast({ title: "工艺已添加" });
  };

  const removeSpecialProcess = (id: string) => {
    updateDigitalConfig({ specialProcesses: digitalConfig.specialProcesses.filter((p) => p.id !== id) });
  };

  const addZipper = () => {
    if (!newZipper.name) return;
    const zipper: DigitalZipperType = {
      id: `zip_${Date.now()}`,
      name: newZipper.name,
      pricePerMeter: newZipper.pricePerMeter,
      enabled: true,
    };
    updateDigitalConfig({ zipperTypes: [...digitalConfig.zipperTypes, zipper] });
    setNewZipper({ name: "", pricePerMeter: 0 });
    toast({ title: "拉链类型已添加" });
  };

  const removeZipper = (id: string) => {
    updateDigitalConfig({ zipperTypes: digitalConfig.zipperTypes.filter((z) => z.id !== id) });
  };

  const addValve = () => {
    if (!newValve.name) return;
    const valve: DigitalValveType = {
      id: `valve_${Date.now()}`,
      name: newValve.name,
      pricePerUnit: newValve.pricePerUnit,
      enabled: true,
    };
    updateDigitalConfig({ valveTypes: [...digitalConfig.valveTypes, valve] });
    setNewValve({ name: "", pricePerUnit: 0 });
    toast({ title: "气阀类型已添加" });
  };

  const removeValve = (id: string) => {
    updateDigitalConfig({ valveTypes: digitalConfig.valveTypes.filter((v) => v.id !== id) });
  };

  const addAccessory = () => {
    if (!newAccessory.name) return;
    const accessory: DigitalAccessory = {
      id: `acc_${Date.now()}`,
      name: newAccessory.name,
      price: newAccessory.price,
      isStackable: newAccessory.isStackable,
      enabled: true,
    };
    updateDigitalConfig({ accessories: [...digitalConfig.accessories, accessory] });
    setNewAccessory({ name: "", price: 0, isStackable: false });
    toast({ title: "附件已添加" });
  };

  const removeAccessory = (id: string) => {
    updateDigitalConfig({ accessories: digitalConfig.accessories.filter((a) => a.id !== id) });
  };

  const updateSystemConstant = (field: string, value: number) => {
    updateDigitalConfig({
      systemConstants: { ...digitalConfig.systemConstants, [field]: value },
    });
  };

  if (!isGravure && !isDigital) {
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
                </span>
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">该产品类型的参数配置页面（待实现）</p>
            </div>

            <div className="mt-8 flex justify-between">
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

  if (isDigital) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground">报价器生成器 - 数码印刷</h1>
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
                配置数码印刷报价器
              </h2>
              <p className="text-muted-foreground">
                配置数码印刷的袋型、材料库、印刷工艺、附件等参数。
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
                        选择或添加袋型（共 {digitalConfig.customBagTypes.length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      数码印刷支持的袋型。包含三边封、自立袋、中封袋、风琴袋、八边封、异形袋等。
                    </p>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">选用</TableHead>
                            <TableHead className="w-[150px]">袋型名称</TableHead>
                            <TableHead>展开面积公式</TableHead>
                            <TableHead className="w-[180px]">尺寸字段</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.customBagTypes.map((bagType) => (
                            <TableRow key={bagType.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={bagType.enabled} 
                                  onCheckedChange={() => toggleDigitalBagType(bagType.id)}
                                  data-testid={`digital-bagtype-check-${bagType.id}`} 
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
                                  <div className="space-y-1">
                                    <Input
                                      value={bagType.formula}
                                      onChange={(e) => {
                                        const dims = parseDimensionsFromFormula(e.target.value);
                                        updateDigitalConfig({
                                          customBagTypes: digitalConfig.customBagTypes.map((b) =>
                                            b.id === bagType.id
                                              ? { ...b, formula: e.target.value, requiredDimensions: dims }
                                              : b
                                          ),
                                        });
                                      }}
                                      className={`h-9 ${bagType.formula && !isValidBagFormula(bagType.formula) ? "border-destructive" : ""}`}
                                    />
                                    {bagType.formula && !isValidBagFormula(bagType.formula) && (
                                      <p className="text-xs text-destructive">请输入有效公式，需包含数字、运算符和尺寸关键词</p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {bagType.requiredDimensions.map((dim) => (
                                    <Badge key={dim} variant="secondary" className="text-xs">
                                      {dimensionLabels[dim] || dim}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {!bagType.isBuiltIn && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeDigitalBagType(bagType.id)}
                                    className="h-8 w-8 text-destructive"
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
                                className="h-9"
                                data-testid="digital-new-bagtype-name"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  value={newBagType.formula}
                                  onChange={(e) => setNewBagType({ ...newBagType, formula: e.target.value })}
                                  placeholder="例如：2 × (袋宽 + 袋高)"
                                  className={`h-9 ${newBagType.formula && !isValidBagFormula(newBagType.formula) ? "border-destructive" : ""}`}
                                  data-testid="digital-new-bagtype-formula"
                                />
                                {newBagType.formula && !isValidBagFormula(newBagType.formula) && (
                                  <p className="text-xs text-destructive">需包含数字、运算符和尺寸关键词</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {newBagType.formula && isValidBagFormula(newBagType.formula)
                                  ? parseDimensionsFromFormula(newBagType.formula).map((d) => dimensionLabels[d] || d).join("、") || "无匹配"
                                  : "自动匹配"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={addDigitalBagType}
                                className="h-8 w-8"
                                data-testid="digital-add-bagtype"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <SectionSaveButton section="bagTypes" label="袋型" onSave={() => showSaveToast("袋型")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="printMaterials" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">印刷层材料</div>
                      <div className="text-sm text-muted-foreground">
                        配置印刷层材料库（当前 {digitalConfig.printLayerMaterials.length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      印刷层材料包括MOPP、BOPP、PET、牛皮纸等。平方价 = (厚度 × 密度 ÷ 1000) × 材料单价。
                    </p>
                    
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">材料名</TableHead>
                            <TableHead className="w-[100px]">厚度(μm)</TableHead>
                            <TableHead className="w-[100px]">密度</TableHead>
                            <TableHead className="w-[100px]">单价(元/kg)</TableHead>
                            <TableHead className="w-[110px]">平方价(元/㎡)</TableHead>
                            <TableHead>备注</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.printLayerMaterials.map((material) => (
                            <TableRow key={material.id}>
                              <TableCell>
                                <Input
                                  value={material.name}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "name", e.target.value)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={material.thickness || ""}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "thickness", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.density || ""}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "density", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={material.price || ""}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "price", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.squarePrice || ""}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "squarePrice", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={material.notes}
                                  onChange={(e) => updateDigitalMaterial("print", material.id, "notes", e.target.value)}
                                  className="h-9"
                                  placeholder="备注"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDigitalMaterial("print", material.id)}
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
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => addDigitalMaterial("print")} className="gap-2" data-testid="button-addPrintMaterial">
                        <Plus className="w-4 h-4" />
                        添加材料
                      </Button>
                    </div>
                  </div>
                  <SectionSaveButton section="printMaterials" label="印刷层材料" onSave={() => showSaveToast("印刷层材料")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="compositeMaterials" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Combine className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">复合层材料</div>
                      <div className="text-sm text-muted-foreground">
                        配置复合层材料库（当前 {digitalConfig.compositeLayerMaterials.length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      复合层材料包括VMPET、AL、NY、CPP、VMCPP等。
                    </p>
                    
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">材料名</TableHead>
                            <TableHead className="w-[100px]">厚度(μm)</TableHead>
                            <TableHead className="w-[100px]">密度</TableHead>
                            <TableHead className="w-[100px]">单价(元/kg)</TableHead>
                            <TableHead className="w-[110px]">平方价(元/㎡)</TableHead>
                            <TableHead>备注</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.compositeLayerMaterials.map((material) => (
                            <TableRow key={material.id}>
                              <TableCell>
                                <Input
                                  value={material.name}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "name", e.target.value)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={material.thickness || ""}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "thickness", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.density || ""}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "density", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={material.price || ""}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "price", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.squarePrice || ""}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "squarePrice", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={material.notes}
                                  onChange={(e) => updateDigitalMaterial("composite", material.id, "notes", e.target.value)}
                                  className="h-9"
                                  placeholder="备注"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDigitalMaterial("composite", material.id)}
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
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => addDigitalMaterial("composite")} className="gap-2" data-testid="button-addCompositeMaterial">
                        <Plus className="w-4 h-4" />
                        添加材料
                      </Button>
                    </div>
                  </div>
                  <SectionSaveButton section="compositeMaterials" label="复合层材料" onSave={() => showSaveToast("复合层材料")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sealMaterials" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">热封层材料</div>
                      <div className="text-sm text-muted-foreground">
                        配置热封层材料库（当前 {digitalConfig.sealLayerMaterials.length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      热封层材料包括PE、PLA、CPP、APE等。袋子最少包含2层印刷层和热封层。
                    </p>
                    
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">材料名</TableHead>
                            <TableHead className="w-[100px]">厚度(μm)</TableHead>
                            <TableHead className="w-[100px]">密度</TableHead>
                            <TableHead className="w-[100px]">单价(元/kg)</TableHead>
                            <TableHead className="w-[110px]">平方价(元/㎡)</TableHead>
                            <TableHead>备注</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.sealLayerMaterials.map((material) => (
                            <TableRow key={material.id}>
                              <TableCell>
                                <Input
                                  value={material.name}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "name", e.target.value)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={material.thickness || ""}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "thickness", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.density || ""}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "density", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={material.price || ""}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "price", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={material.squarePrice || ""}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "squarePrice", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={material.notes}
                                  onChange={(e) => updateDigitalMaterial("seal", material.id, "notes", e.target.value)}
                                  className="h-9"
                                  placeholder="备注"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDigitalMaterial("seal", material.id)}
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
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => addDigitalMaterial("seal")} className="gap-2" data-testid="button-addSealMaterial">
                        <Plus className="w-4 h-4" />
                        添加材料
                      </Button>
                    </div>
                  </div>
                  <SectionSaveButton section="sealMaterials" label="热封层材料" onSave={() => showSaveToast("热封层材料")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="printModes" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">印刷费用</div>
                      <div className="text-sm text-muted-foreground">
                        配置印刷模式（已启用 {digitalConfig.printModes.filter((m) => m.enabled).length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      印刷模式包括无印刷、单黑、单白、双层白。印刷费 = 正单转数 × 印刷费阶梯 + 损耗转数 × 4。
                    </p>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">启用</TableHead>
                            <TableHead>印刷模式</TableHead>
                            <TableHead className="w-[100px]">系数</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.printModes.map((mode) => (
                            <TableRow key={mode.id}>
                              <TableCell>
                                <Checkbox
                                  checked={mode.enabled}
                                  onCheckedChange={() => toggleDigitalPrintMode(mode.id)}
                                  data-testid={`digital-printmode-${mode.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={mode.name}
                                  onChange={(e) => updateDigitalPrintMode(mode.id, "name", e.target.value)}
                                  className="h-9"
                                  data-testid={`input-printmode-name-${mode.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={mode.coefficient || ""}
                                  onChange={(e) => updateDigitalPrintMode(mode.id, "coefficient", Number(e.target.value) || 0)}
                                  className="h-9"
                                  data-testid={`input-printmode-coeff-${mode.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteDigitalPrintMode(mode.id)}
                                  data-testid={`button-delete-printmode-${mode.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button variant="outline" onClick={addDigitalPrintMode} className="gap-2" data-testid="button-add-printmode">
                      <Plus className="w-4 h-4" /> 添加印刷模式
                    </Button>

                    <div className="mt-4">
                      <p className="font-medium mb-2">印刷阶梯价（按转数）</p>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>标签</TableHead>
                              <TableHead className="w-[120px]">最大转数</TableHead>
                              <TableHead className="w-[120px]">单价 (元/转)</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {digitalConfig.printingTiers.map((tier, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Input
                                    value={tier.label}
                                    onChange={(e) => updateDigitalPrintingTier(index, "label", e.target.value)}
                                    className="h-9"
                                    data-testid={`input-tier-label-${index}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={tier.maxRevolutions || ""}
                                    onChange={(e) => updateDigitalPrintingTier(index, "maxRevolutions", Number(e.target.value) || 0)}
                                    className="h-9"
                                    data-testid={`input-tier-maxmeters-${index}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tier.pricePerRevolution || ""}
                                    onChange={(e) => updateDigitalPrintingTier(index, "pricePerRevolution", Number(e.target.value) || 0)}
                                    className="h-9"
                                    data-testid={`input-tier-price-${index}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteDigitalPrintingTier(index)}
                                    data-testid={`button-delete-tier-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Button variant="outline" onClick={addDigitalPrintingTier} className="gap-2 mt-2" data-testid="button-add-tier">
                        <Plus className="w-4 h-4" /> 添加阶梯
                      </Button>
                    </div>
                  </div>
                  <SectionSaveButton section="printModes" label="印刷费用" onSave={() => showSaveToast("印刷费用")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bagMakingCost" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Scissors className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">制袋费用</div>
                      <div className="text-sm text-muted-foreground">
                        配置各袋型的制袋系数和最低起步价
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      制袋费 = max(最低起步价, 制袋系数 × 每转周长<span className="text-xs text-muted-foreground">（米）</span> × (订单转数 + 损耗转数) × 排数)
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>每转周长 = 周向排数 × 袋宽展开尺寸 ÷ 1000</p>
                      <p>订单转数 = 订单数量 ÷ (周向排数 × 横向排数)</p>
                      <p>损耗转数 = SKU数 × 单SKU损耗转数 + 调试损耗转数</p>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>袋型名称</TableHead>
                            <TableHead className="w-[150px]">制袋系数</TableHead>
                            <TableHead className="w-[150px]">最低起步价 (元)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.customBagTypes.filter((b) => b.enabled).map((bagType) => (
                            <TableRow key={bagType.id}>
                              <TableCell className="font-medium">{bagType.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={bagType.makingCoefficient || ""}
                                  onChange={(e) => {
                                    updateDigitalConfig({
                                      customBagTypes: digitalConfig.customBagTypes.map((b) =>
                                        b.id === bagType.id ? { ...b, makingCoefficient: Number(e.target.value) || 0 } : b
                                      ),
                                    });
                                  }}
                                  className="h-9"
                                  data-testid={`input-making-coeff-${bagType.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="1"
                                  value={bagType.makingMinPrice || ""}
                                  onChange={(e) => {
                                    updateDigitalConfig({
                                      customBagTypes: digitalConfig.customBagTypes.map((b) =>
                                        b.id === bagType.id ? { ...b, makingMinPrice: Number(e.target.value) || 0 } : b
                                      ),
                                    });
                                  }}
                                  className="h-9"
                                  data-testid={`input-making-minprice-${bagType.id}`}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <SectionSaveButton section="bagMakingCost" label="制袋费用" onSave={() => showSaveToast("制袋费用")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="laminationCost" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Combine className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">复合费用</div>
                      <div className="text-sm text-muted-foreground">
                        配置复合费用参数
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      复合费 = max(最低价, 单价/米 × 总米数) × 复合层数
                    </p>
                    <p className="text-xs text-muted-foreground">
                      复合层数 = 材料层数 - 1
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>单层复合最低价 (元)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={digitalConfig.laminationUnitPrice || ""}
                          onChange={(e) => updateDigitalConfig({ laminationUnitPrice: Number(e.target.value) || 0 })}
                          data-testid="input-lamination-unit-price"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>单层复合单价/米 (元)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={digitalConfig.laminationPerMeter || ""}
                          onChange={(e) => updateDigitalConfig({ laminationPerMeter: Number(e.target.value) || 0 })}
                          data-testid="input-lamination-per-meter"
                        />
                      </div>
                    </div>
                  </div>
                  <SectionSaveButton section="laminationCost" label="复合费用" onSave={() => showSaveToast("复合费用")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="specialProcesses" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">特殊工艺费用</div>
                      <div className="text-sm text-muted-foreground">
                        配置特殊工艺选项（已启用 {digitalConfig.specialProcesses.filter((p) => p.enabled).length} 种）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      特殊工艺包括双面印刷、异形袋、可变码、局部UV等。
                    </p>
                    
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">启用</TableHead>
                            <TableHead className="w-[180px]">工艺名称</TableHead>
                            <TableHead className="w-[110px]">单价 (元)/倍数</TableHead>
                            <TableHead className="w-[150px]">计算方式</TableHead>
                            <TableHead className="w-[110px]">起步价 (元)</TableHead>
                            <TableHead>备注</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {digitalConfig.specialProcesses.map((process) => (
                            <TableRow key={process.id}>
                              <TableCell>
                                <Checkbox
                                  checked={process.enabled}
                                  onCheckedChange={() => toggleDigitalSpecialProcess(process.id)}
                                  data-testid={`digital-process-${process.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={process.name}
                                  onChange={(e) => updateDigitalSpecialProcess(process.id, "name", e.target.value)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={process.unitPrice || ""}
                                  onChange={(e) => updateDigitalSpecialProcess(process.id, "unitPrice", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={process.calcBasis}
                                  onValueChange={(v) => updateDigitalSpecialProcess(process.id, "calcBasis", v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="perQuantity">元/个</SelectItem>
                                    <SelectItem value="perMeter">元/米</SelectItem>
                                    <SelectItem value="printMultiplier">×印刷费</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={process.minPrice || ""}
                                  onChange={(e) => updateDigitalSpecialProcess(process.id, "minPrice", Number(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={process.notes}
                                  onChange={(e) => updateDigitalSpecialProcess(process.id, "notes", e.target.value)}
                                  className="h-9"
                                  placeholder="备注"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSpecialProcess(process.id)}
                                  className="h-8 w-8 text-destructive"
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
                                value={newSpecialProcess.name}
                                onChange={(e) => setNewSpecialProcess({ ...newSpecialProcess, name: e.target.value })}
                                placeholder="新工艺名称"
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={newSpecialProcess.unitPrice || ""}
                                onChange={(e) => setNewSpecialProcess({ ...newSpecialProcess, unitPrice: Number(e.target.value) || 0 })}
                                placeholder="单价"
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={newSpecialProcess.calcBasis}
                                onValueChange={(v) => setNewSpecialProcess({ ...newSpecialProcess, calcBasis: v as DigitalSpecialCalcBasis })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="perQuantity">元/个</SelectItem>
                                  <SelectItem value="perMeter">元/米</SelectItem>
                                  <SelectItem value="printMultiplier">×印刷费</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={newSpecialProcess.minPrice || ""}
                                onChange={(e) => setNewSpecialProcess({ ...newSpecialProcess, minPrice: Number(e.target.value) || 0 })}
                                placeholder="起步价"
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={newSpecialProcess.notes}
                                onChange={(e) => setNewSpecialProcess({ ...newSpecialProcess, notes: e.target.value })}
                                placeholder="备注"
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={addSpecialProcess}
                                className="h-8 w-8"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <SectionSaveButton section="specialProcesses" label="特殊工艺费用" onSave={() => showSaveToast("特殊工艺费用")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="accessories" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Scissors className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">附加工艺费用</div>
                      <div className="text-sm text-muted-foreground">
                        配置拉链、气阀、吸嘴和其他附件
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-6">
                    <div>
                      <p className="font-medium mb-2">拉链类型（单选）</p>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">启用</TableHead>
                              <TableHead>拉链名称</TableHead>
                              <TableHead className="w-[120px]">单价 (元/米)</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {digitalConfig.zipperTypes.map((zipper) => (
                              <TableRow key={zipper.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={zipper.enabled}
                                    onCheckedChange={() => toggleDigitalZipper(zipper.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={zipper.name}
                                    onChange={(e) => updateDigitalZipper(zipper.id, "name", e.target.value)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={zipper.pricePerMeter || ""}
                                    onChange={(e) => updateDigitalZipper(zipper.id, "pricePerMeter", Number(e.target.value) || 0)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeZipper(zipper.id)}
                                    className="h-8 w-8 text-destructive"
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
                                  value={newZipper.name}
                                  onChange={(e) => setNewZipper({ ...newZipper, name: e.target.value })}
                                  placeholder="新拉链名称"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newZipper.pricePerMeter || ""}
                                  onChange={(e) => setNewZipper({ ...newZipper, pricePerMeter: Number(e.target.value) || 0 })}
                                  placeholder="单价"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={addZipper}
                                  className="h-8 w-8"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium mb-2">气阀类型（单选）</p>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">启用</TableHead>
                              <TableHead>气阀名称</TableHead>
                              <TableHead className="w-[120px]">单价 (元/个)</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {digitalConfig.valveTypes.map((valve) => (
                              <TableRow key={valve.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={valve.enabled}
                                    onCheckedChange={() => toggleDigitalValve(valve.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={valve.name}
                                    onChange={(e) => updateDigitalValve(valve.id, "name", e.target.value)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={valve.pricePerUnit || ""}
                                    onChange={(e) => updateDigitalValve(valve.id, "pricePerUnit", Number(e.target.value) || 0)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeValve(valve.id)}
                                    className="h-8 w-8 text-destructive"
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
                                  value={newValve.name}
                                  onChange={(e) => setNewValve({ ...newValve, name: e.target.value })}
                                  placeholder="新气阀名称"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newValve.pricePerUnit || ""}
                                  onChange={(e) => setNewValve({ ...newValve, pricePerUnit: Number(e.target.value) || 0 })}
                                  placeholder="单价"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={addValve}
                                  className="h-8 w-8"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium mb-2">其他附件</p>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">启用</TableHead>
                              <TableHead>附件名称</TableHead>
                              <TableHead className="w-[120px]">单价 (元/个)</TableHead>
                              <TableHead className="w-[80px]">可叠加</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {digitalConfig.accessories.map((accessory) => (
                              <TableRow key={accessory.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={accessory.enabled}
                                    onCheckedChange={() => toggleDigitalAccessory(accessory.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={accessory.name}
                                    onChange={(e) => updateDigitalAccessory(accessory.id, "name", e.target.value)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={accessory.price || ""}
                                    onChange={(e) => updateDigitalAccessory(accessory.id, "price", Number(e.target.value) || 0)}
                                    className="h-9"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={accessory.isStackable}
                                    onCheckedChange={(checked) => updateDigitalAccessory(accessory.id, "isStackable", !!checked)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAccessory(accessory.id)}
                                    className="h-8 w-8 text-destructive"
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
                                  value={newAccessory.name}
                                  onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })}
                                  placeholder="新附件名称"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newAccessory.price || ""}
                                  onChange={(e) => setNewAccessory({ ...newAccessory, price: Number(e.target.value) || 0 })}
                                  placeholder="单价"
                                  className="h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={newAccessory.isStackable}
                                  onCheckedChange={(checked) => setNewAccessory({ ...newAccessory, isStackable: !!checked })}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={addAccessory}
                                  className="h-8 w-8"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        注意：气阀、吸嘴、拉链仅为单选配件；手提扣、束口条、激光易撕线等功能选项可叠加。
                      </p>
                    </div>
                  </div>
                  <SectionSaveButton section="accessories" label="附加工艺费用" onSave={() => showSaveToast("附加工艺费用")} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="systemConstants" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">系统常量</div>
                      <div className="text-sm text-muted-foreground">
                        设备限制和固定参数（不同厂商可自定义）
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      根据您的设备参数调整以下数值。
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">最大印刷宽度 (mm)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.maxPrintWidth || ""}
                          onChange={(e) => updateSystemConstant("maxPrintWidth", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">最大印刷周长 (mm)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.maxPrintCircumference || ""}
                          onChange={(e) => updateSystemConstant("maxPrintCircumference", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">材料幅宽 (mm)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.materialWidth || ""}
                          onChange={(e) => updateSystemConstant("materialWidth", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">每款SKU损耗 (个)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.skuWaste || ""}
                          onChange={(e) => updateSystemConstant("skuWaste", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">调试损耗 (转)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.adjustmentWaste || ""}
                          onChange={(e) => updateSystemConstant("adjustmentWaste", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">闲置材料最小量 (m)</Label>
                        <Input
                          type="number"
                          value={digitalConfig.systemConstants.idleMaterialMin || ""}
                          onChange={(e) => updateSystemConstant("idleMaterialMin", Number(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                    </div>

                  </div>
                  <SectionSaveButton section="systemConstants" label="系统常量" onSave={() => showSaveToast("系统常量")} />
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground">报价器生成器 - 凹版印刷</h1>
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
                      选择或添加袋型（已选 {config.customBagTypes.filter(b => b.enabled).length}/{config.customBagTypes.length} 种）
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
                          <TableHead className="w-[130px]">袋型名称</TableHead>
                          <TableHead className="min-w-[280px]">展开面积公式</TableHead>
                          <TableHead className="w-[180px]">尺寸字段</TableHead>
                          <TableHead className="w-[100px]">损耗率</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.customBagTypes.map((bagType) => (
                          <TableRow key={bagType.id}>
                            <TableCell>
                              <Checkbox
                                checked={bagType.enabled}
                                onCheckedChange={() => toggleBagType(bagType.id)}
                                data-testid={`bagtype-check-${bagType.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{bagType.name}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
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
                                  className={`h-9 ${bagType.formula && !isValidBagFormula(bagType.formula) ? "border-destructive" : ""}`}
                                />
                                {bagType.formula && !isValidBagFormula(bagType.formula) && (
                                  <p className="text-xs text-destructive">请输入有效公式</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {bagType.requiredDimensions.map((dim) => (
                                  <Badge key={dim} variant="secondary" className="text-xs">
                                    {dimensionLabels[dim] || dim}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={bagType.wasteCoefficient || ""}
                                onChange={(e) => {
                                  updateConfig({
                                    customBagTypes: config.customBagTypes.map((b) =>
                                      b.id === bagType.id
                                        ? { ...b, wasteCoefficient: Number(e.target.value) || 0 }
                                        : b
                                    ),
                                  });
                                }}
                                className="h-9"
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
                              className="h-9"
                              data-testid="new-bagtype-name"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                value={newBagType.formula}
                                onChange={(e) => setNewBagType({ ...newBagType, formula: e.target.value })}
                                placeholder="例如：2 × (袋宽 + 袋高)"
                                className={`h-9 ${newBagType.formula && !isValidBagFormula(newBagType.formula) ? "border-destructive" : ""}`}
                                data-testid="new-bagtype-formula"
                              />
                              {newBagType.formula && !isValidBagFormula(newBagType.formula) && (
                                <p className="text-xs text-destructive">需包含数字、运算符和尺寸关键词</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {newBagType.formula && isValidBagFormula(newBagType.formula)
                                ? parseDimensionsFromFormula(newBagType.formula).map((d) => dimensionLabels[d] || d).join("、") || "无匹配"
                                : "自动匹配"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={newBagType.wasteCoefficient || ""}
                              onChange={(e) => setNewBagType({ ...newBagType, wasteCoefficient: Number(e.target.value) || 0 })}
                              className="h-9"
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
                  <SectionSaveButton section="gravure-bagTypes" label="袋型" onSave={() => showSaveToast("袋型")} />
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
                          <TableHead className="w-[130px]">材料名</TableHead>
                          <TableHead className="w-[100px]">厚度(μm)</TableHead>
                          <TableHead className="w-[110px]">密度(g/cm³)</TableHead>
                          <TableHead className="w-[100px]">克重(g/㎡)</TableHead>
                          <TableHead className="w-[110px]">价格(元/kg)</TableHead>
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
                                className="h-9"
                                data-testid={`material-name-${material.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={material.thickness || ""}
                                onChange={(e) => updateMaterialField(material.id, "thickness", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={material.density || ""}
                                onChange={(e) => updateMaterialField(material.id, "density", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.grammage || ""}
                                onChange={(e) => updateMaterialField(material.id, "grammage", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.price || ""}
                                onChange={(e) => updateMaterialField(material.id, "price", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={material.notes}
                                onChange={(e) => updateMaterialField(material.id, "notes", e.target.value)}
                                className="h-9"
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
                              className="h-9"
                              data-testid="new-material-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={newMaterial.thickness || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, thickness: Number(e.target.value) || 0 })}
                              placeholder="厚度"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={newMaterial.density || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, density: Number(e.target.value) || 0 })}
                              placeholder="密度"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={newMaterial.grammage || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, grammage: Number(e.target.value) || 0 })}
                              placeholder="克重"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={newMaterial.price || ""}
                              onChange={(e) => setNewMaterial({ ...newMaterial, price: Number(e.target.value) || 0 })}
                              placeholder="价格"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={newMaterial.notes}
                              onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })}
                              placeholder="备注"
                              className="h-9"
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
                  <SectionSaveButton section="gravure-materials" label="材料库" onSave={() => { saveMaterialLibrary(); showSaveToast("材料库"); }} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="printing" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">印刷费用</div>
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
                          <TableHead className="w-[120px]">覆盖率 (%)</TableHead>
                          <TableHead>标签</TableHead>
                          <TableHead className="w-[140px]">单价 (元/㎡)</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.printingPriceRules.map((rule, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                type="number"
                                value={rule.coverage || ""}
                                onChange={(e) => updatePrintingPrice(index, "coverage", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`input-printing-coverage-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={rule.label}
                                onChange={(e) => updatePrintingPrice(index, "label", e.target.value)}
                                className="h-9"
                                data-testid={`input-printing-label-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={rule.pricePerSqm || ""}
                                onChange={(e) => updatePrintingPrice(index, "pricePerSqm", Number(e.target.value) || 0)}
                                className="h-9"
                                data-testid={`input-printing-price-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePrintingRule(index)}
                                className="text-destructive"
                                data-testid={`button-remove-printing-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Button variant="outline" onClick={addPrintingRule} className="gap-2" data-testid="button-add-printing-rule">
                      <Plus className="w-4 h-4" />
                      添加印刷规则
                    </Button>
                  </div>
                  <SectionSaveButton section="gravure-printing" label="印刷费用" onSave={() => showSaveToast("印刷费用")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="lamination" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Combine className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">复合费用</div>
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
                          <TableHead className="w-[140px]">单价 (元/㎡)</TableHead>
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
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                value={rule.pricePerSqm || ""}
                                onChange={(e) => updateLaminationPrice(index, "pricePerSqm", Number(e.target.value) || 0)}
                                className="h-9"
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
                              className="h-9"
                              data-testid="new-lamination-name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.001"
                              value={newLamination.pricePerSqm || ""}
                              onChange={(e) => setNewLamination({ ...newLamination, pricePerSqm: Number(e.target.value) || 0 })}
                              placeholder="单价"
                              className="h-9"
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
                  <SectionSaveButton section="gravure-lamination" label="复合费用" onSave={() => showSaveToast("复合费用")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="makingCost" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">制袋费用</div>
                    <div className="text-sm text-muted-foreground">
                      已自动匹配 {config.customBagTypes.filter(b => b.enabled).length} 种已启用袋型的制袋费用公式
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    系统已自动匹配袋型模块中启用的袋型。请为每种袋型确认或编辑制袋计算公式。
                    公式格式示例："0.09 × 袋宽"、"0.04 × 袋高"、"0.03 × min(袋宽,袋高) + 0.009"
                  </p>
                  <div className="space-y-3">
                    {config.customBagTypes.filter(b => b.enabled).map((bagType) => (
                      <div key={bagType.id} className="border rounded-lg p-4 space-y-3" data-testid={`making-cost-${bagType.id}`}>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="shrink-0">{bagType.name}</Badge>
                          {isValidBagFormula(bagType.formula) && (
                            <span className="text-xs text-muted-foreground truncate">展开面积: {bagType.formula}</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">制袋费用公式</Label>
                          <Input
                            value={bagType.makingCostFormula}
                            onChange={(e) => {
                              updateConfig({
                                customBagTypes: config.customBagTypes.map((b) =>
                                  b.id === bagType.id
                                    ? { ...b, makingCostFormula: e.target.value }
                                    : b
                                ),
                              });
                            }}
                            placeholder="例如：0.09 × 袋宽"
                            className={`text-base ${bagType.makingCostFormula && !isValidMakingFormula(bagType.makingCostFormula) ? "border-destructive" : ""}`}
                            data-testid={`making-formula-${bagType.id}`}
                          />
                          {bagType.makingCostFormula && !isValidMakingFormula(bagType.makingCostFormula) && (
                            <p className="text-xs text-destructive mt-1">请输入有效制袋费用公式，格式如：0.09 × 袋宽</p>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-md px-3 py-2">
                          {bagType.makingCostFormula && isValidMakingFormula(bagType.makingCostFormula) ? (
                            <>
                              <span className="text-xs text-muted-foreground">公式预览：</span>
                              <span className="text-sm font-mono ml-2">{annotateMakingFormula(bagType.makingCostFormula)}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">制袋费用计算公式</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {config.customBagTypes.filter(b => b.enabled).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        暂无已启用的袋型，请先在袋型模块中启用至少一种袋型
                      </div>
                    )}
                  </div>
                  <SectionSaveButton section="gravure-makingCost" label="制袋费用" onSave={() => showSaveToast("制袋费用")} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {(["additionalProcess", "surfaceTreatment"] as PostProcessingCategory[]).map((cat) => {
              const catLabel = cat === "additionalProcess" ? "附加工艺费用" : "表面处理费用";
              const catIcon = cat === "additionalProcess" ? Scissors : Layers;
              const CatIcon = catIcon;
              const catOptions = config.postProcessingOptions.filter(o => (o.category || "additionalProcess") === cat);
              const enabledCount = catOptions.filter(o => o.enabled).length;
              return (
                <AccordionItem key={cat} value={cat} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <CatIcon className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold">{catLabel}</div>
                        <div className="text-sm text-muted-foreground">
                          配置{catLabel}选项库（已启用 {enabledCount} 个）
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        勾选需要的{catLabel}选项，选择计价方式后填入对应价格参数。
                      </p>
                      <div className="space-y-3">
                        {catOptions.map((option) => (
                          <div key={option.id} className="border rounded-lg p-4 space-y-3" data-testid={`postprocess-item-${option.id}`}>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={option.enabled}
                                onCheckedChange={() => togglePostProcessing(option.id)}
                                data-testid={`postprocess-${option.id}`}
                              />
                              <Input
                                value={option.name}
                                onChange={(e) => updatePostProcessingName(option.id, e.target.value)}
                                className="w-[160px]"
                              />
                              <Select
                                value={option.pricingType}
                                onValueChange={(val) => updatePostProcessingField(option.id, "pricingType", val as PostProcessingPricingType)}
                              >
                                <SelectTrigger className="w-[180px]" data-testid={`pricing-type-${option.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">固定单价 (元/个)</SelectItem>
                                  <SelectItem value="perMeterWidth">按米×袋宽 (元/米)</SelectItem>
                                  <SelectItem value="perArea">按展开面积 (元/㎡)</SelectItem>
                                  <SelectItem value="perMeterWidthByBagType">按袋型分价×袋宽</SelectItem>
                                  <SelectItem value="free">免费 (标配)</SelectItem>
                                  <SelectItem value="specSelection">按规格选择</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePostProcessing(option.id)}
                                className="text-destructive shrink-0"
                                data-testid={`remove-postprocess-${option.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="ml-8">
                              {option.pricingType === "fixed" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Label className="text-sm text-muted-foreground shrink-0">单价</Label>
                                  <Input
                                    type="number"
                                    value={option.fixedPrice ?? ""}
                                    onChange={(e) => updatePostProcessingField(option.id, "fixedPrice", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                    className="w-[120px]"
                                    data-testid={`price-fixed-${option.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">元/个</span>
                                </div>
                              )}

                              {option.pricingType === "perMeterWidth" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Label className="text-sm text-muted-foreground shrink-0">每米单价</Label>
                                  <Input
                                    type="number"
                                    value={option.pricePerMeter ?? ""}
                                    onChange={(e) => updatePostProcessingField(option.id, "pricePerMeter", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                    className="w-[120px]"
                                    data-testid={`price-permeter-${option.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">元/米 × 袋宽(m)</span>
                                </div>
                              )}

                              {option.pricingType === "perArea" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Label className="text-sm text-muted-foreground shrink-0">每平方米</Label>
                                  <Input
                                    type="number"
                                    value={option.pricePerSqm ?? ""}
                                    onChange={(e) => updatePostProcessingField(option.id, "pricePerSqm", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                    className="w-[100px]"
                                    data-testid={`price-persqm-${option.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">元/㎡</span>
                                  <Label className="text-sm text-muted-foreground shrink-0 ml-3">+ 固定附加</Label>
                                  <Input
                                    type="number"
                                    value={option.fixedAddition ?? ""}
                                    onChange={(e) => updatePostProcessingField(option.id, "fixedAddition", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                    className="w-[100px]"
                                    data-testid={`price-fixedadd-${option.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">元/个</span>
                                </div>
                              )}

                              {option.pricingType === "perMeterWidthByBagType" && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Label className="text-sm text-muted-foreground shrink-0">默认单价</Label>
                                    <Input
                                      type="number"
                                      value={option.defaultPricePerMeter ?? ""}
                                      onChange={(e) => updatePostProcessingField(option.id, "defaultPricePerMeter", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                      className="w-[120px]"
                                      data-testid={`price-default-${option.id}`}
                                    />
                                    <span className="text-sm text-muted-foreground">元/米 × 袋宽(m)</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">特殊袋型单独定价：</div>
                                  {(option.bagTypePrices || []).map((btp, idx) => (
                                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                                      <Input
                                        value={btp.bagTypeName}
                                        onChange={(e) => {
                                          const updated = [...(option.bagTypePrices || [])];
                                          updated[idx] = { ...updated[idx], bagTypeName: e.target.value };
                                          updatePostProcessingField(option.id, "bagTypePrices", updated);
                                        }}
                                        className="w-[100px]"
                                        placeholder="袋型名"
                                      />
                                      <Input
                                        type="number"
                                        value={btp.pricePerMeter ?? ""}
                                        onChange={(e) => {
                                          const updated = [...(option.bagTypePrices || [])];
                                          updated[idx] = { ...updated[idx], pricePerMeter: e.target.value === "" ? "" : parseFloat(e.target.value) };
                                          updatePostProcessingField(option.id, "bagTypePrices", updated);
                                        }}
                                        className="w-[100px]"
                                      />
                                      <span className="text-sm text-muted-foreground">元/米</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const updated = (option.bagTypePrices || []).filter((_, i) => i !== idx);
                                          updatePostProcessingField(option.id, "bagTypePrices", updated);
                                        }}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updated = [...(option.bagTypePrices || []), { bagTypeId: "", bagTypeName: "", pricePerMeter: 0 }];
                                      updatePostProcessingField(option.id, "bagTypePrices", updated);
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> 添加袋型价格
                                  </Button>
                                </div>
                              )}

                              {option.pricingType === "free" && (
                                <div className="text-sm text-muted-foreground">标配免费，不计入成本</div>
                              )}

                              {option.pricingType === "specSelection" && (
                                <div className="space-y-2">
                                  <div className="text-xs text-muted-foreground">报价时用户从下拉框选择规格，自动带入对应单价：</div>
                                  {(option.specOptions || []).map((spec, idx) => (
                                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                                      <Input
                                        value={spec.specName}
                                        onChange={(e) => {
                                          const updated = [...(option.specOptions || [])];
                                          updated[idx] = { ...updated[idx], specName: e.target.value };
                                          updatePostProcessingField(option.id, "specOptions", updated);
                                        }}
                                        className="w-[120px]"
                                        placeholder="规格名称"
                                      />
                                      <Input
                                        type="number"
                                        value={spec.price ?? ""}
                                        onChange={(e) => {
                                          const updated = [...(option.specOptions || [])];
                                          updated[idx] = { ...updated[idx], price: e.target.value === "" ? "" : parseFloat(e.target.value) };
                                          updatePostProcessingField(option.id, "specOptions", updated);
                                        }}
                                        className="w-[100px]"
                                        placeholder="单价"
                                      />
                                      <span className="text-sm text-muted-foreground">元/个</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const updated = (option.specOptions || []).filter((_, i) => i !== idx);
                                          updatePostProcessingField(option.id, "specOptions", updated);
                                        }}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updated = [...(option.specOptions || []), { specName: "", price: 0 }];
                                      updatePostProcessingField(option.id, "specOptions", updated);
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> 添加规格
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="border rounded-lg p-4 border-dashed">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-5" />
                            <Input
                              value={cat === "additionalProcess" ? newPostProcessing.name : newSurfaceTreatment.name}
                              onChange={(e) => cat === "additionalProcess"
                                ? setNewPostProcessing({ ...newPostProcessing, name: e.target.value })
                                : setNewSurfaceTreatment({ ...newSurfaceTreatment, name: e.target.value })
                              }
                              placeholder={`新${catLabel}名称`}
                              className="w-[180px]"
                              data-testid={`new-${cat}-name`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => addPostProcessing(cat)}
                              data-testid={`add-${cat}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground">添加后可选择计价方式</span>
                          </div>
                        </div>
                      </div>
                      <SectionSaveButton section={`gravure-${cat}`} label={catLabel} onSave={() => showSaveToast(catLabel)} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}

            <AccordionItem value="plate" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">制版费用</div>
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
                          <TableHead className="w-[140px]">最低数量</TableHead>
                          <TableHead className="w-[120px]">系数</TableHead>
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
                                onChange={(e) => updateQuantityDiscount(index, "minQuantity", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={discount.coefficient}
                                onChange={(e) => updateQuantityDiscount(index, "coefficient", Number(e.target.value) || 0)}
                                className="h-9"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={discount.label}
                                onChange={(e) => updateQuantityDiscount(index, "label", e.target.value)}
                                className="h-9"
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
                  <div className="flex items-center justify-between gap-3 flex-wrap">
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
                  <SectionSaveButton section="gravure-quantity" label="数量折扣" onSave={() => showSaveToast("数量折扣")} />
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
