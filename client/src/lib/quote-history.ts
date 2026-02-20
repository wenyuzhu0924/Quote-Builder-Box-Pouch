import { useState, useCallback, useMemo } from "react";

export interface QuoteRecord {
  id: string;
  timestamp: number;
  label: string;
  boxType?: string;
  qty: number;
  unitPriceCNY: number;
  totalPriceCNY: number;
  unitPriceUSD: number;
  totalPriceUSD: number;
  taxRate: number;
  exchangeRate: number;
  costBreakdown: Record<string, number>;
  extra?: Record<string, string | number>;
}

export type QuoteType = "softbox" | "giftbox" | "gravure" | "digital";

const MAX_RECORDS = 10;

function storageKey(type: QuoteType): string {
  return `quote-history:${type}`;
}

function loadRecords(type: QuoteType): QuoteRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(type));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECORDS) : [];
  } catch {
    return [];
  }
}

function saveRecords(type: QuoteType, records: QuoteRecord[]) {
  localStorage.setItem(storageKey(type), JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export function useQuoteHistory(type: QuoteType) {
  const [records, setRecords] = useState<QuoteRecord[]>(() => loadRecords(type));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const addRecord = useCallback((record: Omit<QuoteRecord, "id" | "timestamp">) => {
    const newRecord: QuoteRecord = {
      ...record,
      id: `qr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setRecords(prev => {
      const updated = [newRecord, ...prev].slice(0, MAX_RECORDS);
      saveRecords(type, updated);
      return updated;
    });
  }, [type]);

  const removeRecord = useCallback((id: string) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveRecords(type, updated);
      return updated;
    });
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [type]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(records.map(r => r.id)));
  }, [records]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedRecords = useMemo(() => {
    return records.filter(r => selectedIds.has(r.id));
  }, [records, selectedIds]);

  const exportCSV = useCallback((selected: QuoteRecord[]) => {
    if (selected.length === 0) return;

    const allBreakdownKeys = new Set<string>();
    const allExtraKeys = new Set<string>();
    selected.forEach(r => {
      Object.keys(r.costBreakdown).forEach(k => allBreakdownKeys.add(k));
      if (r.extra) Object.keys(r.extra).forEach(k => allExtraKeys.add(k));
    });

    const bkKeys = Array.from(allBreakdownKeys);
    const exKeys = Array.from(allExtraKeys);

    const headers = [
      "序号", "日期", "标签", "盒型", "数量",
      "含税单价(¥)", "含税总价(¥)", "单价(USD)", "总价(USD)",
      "税率(%)", "汇率",
      ...bkKeys.map(k => `${k}(¥/个)`),
      ...exKeys,
    ];

    const escapeCSV = (val: string | number): string => {
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = selected.map((r, i) => [
      i + 1,
      new Date(r.timestamp).toLocaleString("zh-CN"),
      r.label,
      r.boxType || "",
      r.qty,
      r.unitPriceCNY.toFixed(4),
      r.totalPriceCNY.toFixed(2),
      r.unitPriceUSD.toFixed(4),
      r.totalPriceUSD.toFixed(2),
      r.taxRate,
      r.exchangeRate,
      ...bkKeys.map(k => (r.costBreakdown[k] ?? 0).toFixed(4)),
      ...exKeys.map(k => r.extra?.[k] ?? ""),
    ]);

    const BOM = "\uFEFF";
    const csv = BOM + [headers.map(escapeCSV).join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `报价记录_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [type]);

  return {
    records,
    selectedIds,
    selectedRecords,
    addRecord,
    removeRecord,
    toggleSelect,
    selectAll,
    clearSelection,
    exportCSV,
  };
}
