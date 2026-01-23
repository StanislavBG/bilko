import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EndpointMeta {
  method: string;
  description: string;
}

interface EndpointRegistry {
  [endpoint: string]: EndpointMeta;
}

interface EndpointInfoProps {
  endpoint: string;
  className?: string;
}

export function EndpointInfo({ endpoint, className = "" }: EndpointInfoProps) {
  const { data: registry } = useQuery<EndpointRegistry>({
    queryKey: ["/api/endpoints"],
    staleTime: 1000 * 60 * 5,
  });

  const meta = registry?.[endpoint];

  if (!meta) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
          data-testid={`endpoint-info-${endpoint.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">API endpoint info</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="text-xs font-semibold bg-muted px-2 py-1 rounded">
              {endpoint}
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface EndpointInfoInlineProps {
  endpoint: string;
  className?: string;
}

export function EndpointInfoInline({ endpoint, className = "" }: EndpointInfoInlineProps) {
  const { data: registry } = useQuery<EndpointRegistry>({
    queryKey: ["/api/endpoints"],
    staleTime: 1000 * 60 * 5,
  });

  const meta = registry?.[endpoint];

  if (!meta) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors ${className}`}
          data-testid={`endpoint-info-inline-${endpoint.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
        >
          <Info className="h-3 w-3" />
          <code className="bg-muted px-1 py-0.5 rounded">{endpoint}</code>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="text-xs font-semibold bg-muted px-2 py-1 rounded">
              {endpoint}
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
