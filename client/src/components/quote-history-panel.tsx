import { useState } from "react";
import { Save, Download, Trash2, CheckSquare, Square, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { QuoteRecord, QuoteType } from "@/lib/quote-history";
import { useQuoteHistory } from "@/lib/quote-history";

interface QuoteHistoryPanelProps {
  quoteType: QuoteType;
  currentQuote: Omit<QuoteRecord, "id" | "timestamp"> | null;
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${min}`;
}

export function QuoteHistoryPanel({ quoteType, currentQuote }: QuoteHistoryPanelProps) {
  const { records, selectedIds, selectedRecords, addRecord, removeRecord, toggleSelect, selectAll, clearSelection, exportCSV } = useQuoteHistory(quoteType);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const handleSave = () => {
    if (!currentQuote) return;
    addRecord(currentQuote);
    toast({ title: "报价已保存" });
  };

  const handleExport = () => {
    if (selectedRecords.length === 0) {
      toast({ title: "请先选择要导出的记录", variant: "destructive" });
      return;
    }
    exportCSV(selectedRecords);
    toast({ title: `已导出 ${selectedRecords.length} 条记录` });
  };

  const allSelected = records.length > 0 && selectedIds.size === records.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold section-title flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            报价记录
            {records.length > 0 && (
              <Badge variant="secondary" className="text-xs">{records.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!currentQuote}
              className="gap-1.5"
              data-testid="button-save-quote"
            >
              <Save className="w-3.5 h-3.5" />
              保存当前报价
            </Button>
            {records.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="gap-1.5"
                data-testid="button-toggle-history"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "收起" : "展开"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && records.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={allSelected ? clearSelection : selectAll}
                  className="gap-1.5 text-xs"
                  data-testid="button-select-all"
                >
                  {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {allSelected ? "取消全选" : "全选"}
                </Button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 条</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={selectedIds.size === 0}
                className="gap-1.5"
                data-testid="button-export-csv"
              >
                <Download className="w-3.5 h-3.5" />
                导出CSV
              </Button>
            </div>

            <div className="space-y-2">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${selectedIds.has(record.id) ? "bg-primary/5 border-primary/30" : ""}`}
                  data-testid={`record-item-${index}`}
                >
                  <Checkbox
                    checked={selectedIds.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    data-testid={`checkbox-record-${index}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{record.label}</span>
                      {record.boxType && (
                        <Badge variant="secondary" className="text-xs">{record.boxType}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{formatTime(record.timestamp)}</span>
                      <span>×{record.qty}</span>
                      <span className="font-medium text-foreground">¥{fmt(record.unitPriceCNY, 4)}/个</span>
                      <span className="text-primary font-medium">≈${fmt(record.unitPriceUSD, 4)}/pc</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      {Object.entries(record.costBreakdown).map(([key, val]) => (
                        <span key={key}>{key}: {fmt(val, 3)}</span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecord(record.id)}
                    className="text-destructive shrink-0"
                    data-testid={`button-remove-record-${index}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
