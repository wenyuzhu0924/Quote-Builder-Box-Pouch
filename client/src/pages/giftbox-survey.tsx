import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Package, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BOX_TYPES, PAPER_TYPES, LINER_TYPES, CRAFT_TYPES,
  type BoxType, type PaperType, type LinerType, type CraftId,
} from "@/lib/giftbox-config";
import { useGiftBox } from "@/lib/giftbox-store";

interface GiftBoxSurveyPageProps {
  backPath?: string;
  nextPath?: string;
  hideBack?: boolean;
}

export default function GiftBoxSurveyPage({
  backPath = "/",
  nextPath = "/giftbox/quote",
  hideBack = false,
}: GiftBoxSurveyPageProps) {
  const [, navigate] = useLocation();
  const { config, updateConfig } = useGiftBox();

  const handleBack = () => navigate(backPath);
  const handleNext = () => navigate(nextPath);

  const toggleCraft = (craftId: CraftId) => {
    const selected = config.selectedCrafts.includes(craftId)
      ? config.selectedCrafts.filter(c => c !== craftId)
      : [...config.selectedCrafts, craftId];
    updateConfig({ selectedCrafts: selected });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex flex-col">
      <header className="border-b border-orange-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          {!hideBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
              配置礼盒报价器
            </h1>
            <p className="text-sm text-muted-foreground">设置盒型、材料与工艺参数</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        <Accordion type="multiple" defaultValue={["boxType", "material", "craft"]} className="space-y-3">
          <AccordionItem value="boxType" className="border rounded-md bg-white dark:bg-neutral-900 px-4">
            <AccordionTrigger className="hover:no-underline" data-testid="section-box-type">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">盒型选择</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">盒型</Label>
                  <Select
                    value={config.boxType}
                    onValueChange={(v) => updateConfig({ boxType: v as BoxType })}
                  >
                    <SelectTrigger data-testid="select-box-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOX_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="material" className="border rounded-md bg-white dark:bg-neutral-900 px-4">
            <AccordionTrigger className="hover:no-underline" data-testid="section-material">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">材料配置</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">面纸类型</Label>
                  <Select
                    value={config.paperType}
                    onValueChange={(v) => updateConfig({ paperType: v as PaperType })}
                  >
                    <SelectTrigger data-testid="select-paper-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">内衬类型</Label>
                  <Select
                    value={config.linerType}
                    onValueChange={(v) => updateConfig({ linerType: v as LinerType })}
                  >
                    <SelectTrigger data-testid="select-liner-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINER_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="craft" className="border rounded-md bg-white dark:bg-neutral-900 px-4">
            <AccordionTrigger className="hover:no-underline" data-testid="section-craft">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">特殊工艺</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {CRAFT_TYPES.map(craft => {
                  const isSelected = config.selectedCrafts.includes(craft.id);
                  return (
                    <Card
                      key={craft.id}
                      className={`transition-colors ${isSelected ? "border-orange-300 dark:border-orange-700" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCraft(craft.id)}
                            data-testid={`checkbox-craft-${craft.id}`}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{craft.name}</div>
                            <div className="text-xs text-muted-foreground">{craft.desc}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleNext}
            className="gap-2 px-8 bg-orange-500 hover:bg-orange-600 text-white border-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 dark:border-orange-600 dark:text-white no-default-hover-elevate no-default-active-elevate"
            data-testid="button-generate"
          >
            生成报价器
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
