import { useState, useEffect } from "react";
import { Globe, ExternalLink } from "lucide-react";

interface UnfurlData {
  url: string;
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  favicon: string | null;
  fetchedAt: string;
}

// Client-side cache to avoid re-fetching during session
const unfurlCache = new Map<string, UnfurlData>();

async function fetchUnfurl(url: string): Promise<UnfurlData | null> {
  const cached = unfurlCache.get(url);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/projects/unfurl?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data: UnfurlData = await res.json();
    unfurlCache.set(url, data);
    return data;
  } catch {
    return null;
  }
}

function getProxyUrl(imageUrl: string): string {
  return `/api/projects/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

interface ProjectImageProps {
  projectUrl: string;
  projectTitle: string;
  className?: string;
}

export function ProjectImage({ projectUrl, projectTitle, className = "" }: ProjectImageProps) {
  const [unfurl, setUnfurl] = useState<UnfurlData | null>(unfurlCache.get(projectUrl) || null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(!unfurlCache.has(projectUrl));

  useEffect(() => {
    if (unfurlCache.has(projectUrl)) {
      setUnfurl(unfurlCache.get(projectUrl)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchUnfurl(projectUrl).then((data) => {
      if (!cancelled) {
        setUnfurl(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [projectUrl]);

  const ogImageSrc = unfurl?.ogImage ? getProxyUrl(unfurl.ogImage) : null;
  const faviconSrc = unfurl?.favicon ? getProxyUrl(unfurl.favicon) : null;

  // State: loading
  if (loading) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
          <span className="text-xs">Loading preview...</span>
        </div>
      </div>
    );
  }

  // State: OG image available and not errored
  if (ogImageSrc && !imageError) {
    return (
      <div className={`bg-muted overflow-hidden ${className}`}>
        <img
          src={ogImageSrc}
          alt={projectTitle}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // State: Fallback - branded card with favicon
  return (
    <div className={`bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-3 p-4">
        {faviconSrc ? (
          <img
            src={faviconSrc}
            alt=""
            className="h-12 w-12 rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Globe className="h-12 w-12 text-muted-foreground/50" />
        )}
        <span className="text-sm font-medium text-muted-foreground text-center max-w-[200px] truncate">
          {projectTitle}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
          <ExternalLink className="h-3 w-3" />
          <span>{new URL(projectUrl).hostname}</span>
        </div>
      </div>
    </div>
  );
}
