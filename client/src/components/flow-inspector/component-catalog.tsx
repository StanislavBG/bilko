/**
 * ComponentCatalog — Bilko adapter wrapping bilko-flow/react's ComponentCatalog.
 *
 * The bilko-flow/react ComponentCatalog is props-driven (takes definitions
 * as a prop, no API calls). This adapter fetches component definitions from
 * Bilko's GET /api/components endpoint and maps them to the library's type.
 */

import { useState, useEffect } from "react";
import {
  ComponentCatalog as LibComponentCatalog,
  type ComponentDefinition,
} from "bilko-flow/react";
import { Loader2 } from "lucide-react";

export function ComponentCatalog() {
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/components")
      .then((r) => r.json())
      .then((data) => {
        // Map Bilko's API response to bilko-flow/react's ComponentDefinition
        const mapped: ComponentDefinition[] = (data.components ?? []).map(
          (c: Record<string, unknown>) => ({
            type: c.type,
            name: c.name,
            description: c.description,
            category: c.category,
            inputs: c.inputs,
            outputs: c.outputs,
            useCases: (c.useCases as Array<Record<string, unknown>>)?.map(
              (uc) => ({ title: uc.title, description: uc.description }),
            ) ?? [],
            references: c.references,
            contractRules: c.contractRules,
          }),
        );
        setDefinitions(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LibComponentCatalog definitions={definitions} />;
}
