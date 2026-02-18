import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ShareQuoteButtonProps {
  quoteType: "gravure" | "digital" | "giftbox" | "softbox";
  customerName: string;
  configData: unknown;
}

export function ShareQuoteButton({ quoteType, customerName, configData }: ShareQuoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/shared-quotes", {
        quoteType,
        customerName,
        configData,
      });
      const data = await res.json();
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/s/${data.id}`);
      setOpen(true);
    } catch (error) {
      toast({
        title: "保存失败",
        description: "无法生成分享链接，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "已复制链接" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.querySelector<HTMLInputElement>('[data-testid="input-share-url"]');
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={saving}
        className="gap-2"
        data-testid="button-share"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        导出链接
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>报价器链接已生成</DialogTitle>
            <DialogDescription>
              复制以下链接，输入浏览器即可直接使用报价器
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 items-center">
            <Input
              data-testid="input-share-url"
              value={shareUrl}
              readOnly
              className="flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              data-testid="button-copy-url"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
