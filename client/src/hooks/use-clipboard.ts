import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for copying text to clipboard with visual feedback
 */
export function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const copy = async (text: string, id: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied!", description: label || "Text copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return { copy, isCopied: (id: string) => copiedId === id };
}

/**
 * Copy an image from URL to clipboard
 */
export async function copyImageToClipboard(
  imageUrl: string,
  toast: ReturnType<typeof useToast>["toast"]
) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    toast({ title: "Copied!", description: "Image copied to clipboard" });
  } catch {
    toast({
      title: "Failed to copy image",
      description: "Your browser may not support this feature",
      variant: "destructive",
    });
  }
}

/**
 * Download an image from URL
 */
export function downloadImage(imageUrl: string, filename: string = "image.png") {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
