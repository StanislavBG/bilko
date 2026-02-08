/**
 * ComponentCatalog — Browsable catalog of flow step type components.
 *
 * Fetches component definitions from GET /api/components and renders:
 * 1. A nav sidebar listing all step types
 * 2. A detail view for the selected component showing description,
 *    inputs, outputs, use cases, and internal codebase references.
 *
 * The UI is purely render-only — all domain knowledge lives in the
 * shared/component-definitions.ts config served by the API.
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  MousePointerClick,
  ArrowRightLeft,
  ShieldCheck,
  Monitor,
  ArrowDown,
  ArrowUp,
  FileCode2,
  Lightbulb,
  BookOpen,
  ChevronRight,
  Loader2,
  Blocks,
} from "lucide-react";
import type { ComponentDefinition } from "@shared/component-definitions";

// ── Step type styling (matches step-detail.tsx pattern) ──────

const TYPE_STYLE: Record<
  string,
  { icon: typeof Brain; color: string; bg: string; accent: string; categoryLabel: string }
> = {
  llm: {
    icon: Brain,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    accent: "border-purple-500/30",
    categoryLabel: "AI",
  },
  "user-input": {
    icon: MousePointerClick,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    accent: "border-blue-500/30",
    categoryLabel: "Interaction",
  },
  transform: {
    icon: ArrowRightLeft,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    accent: "border-orange-500/30",
    categoryLabel: "Data",
  },
  validate: {
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
    accent: "border-green-500/30",
    categoryLabel: "Quality",
  },
  display: {
    icon: Monitor,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    accent: "border-cyan-500/30",
    categoryLabel: "Presentation",
  },
};

// ── Main Component ──────────────────────────────────────────

export function ComponentCatalog() {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/components")
      .then((r) => r.json())
      .then((data) => {
        setComponents(data.components ?? []);
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

  const selected = selectedType
    ? components.find((c) => c.type === selectedType)
    : null;

  return (
    <div className="flex gap-6 min-h-0">
      {/* ── Nav sidebar ────────────────────────────────────── */}
      <div className="w-56 shrink-0 space-y-1">
        <button
          onClick={() => setSelectedType(null)}
          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
            selectedType === null
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Blocks className="h-4 w-4" />
          <span>All Components</span>
        </button>
        <Separator className="my-2" />
        {components.map((comp) => {
          const style = TYPE_STYLE[comp.type];
          const Icon = style?.icon ?? Blocks;
          const isActive = selectedType === comp.type;
          return (
            <button
              key={comp.type}
              onClick={() => setSelectedType(comp.type)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? `${style?.bg ?? "bg-muted"} font-medium`
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? (style?.color ?? "") : ""}`} />
              <span className="flex-1 truncate">{comp.name}</span>
              {isActive && <ChevronRight className="h-3 w-3 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* ── Content area ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-auto">
        {selected ? (
          <ComponentDetail component={selected} />
        ) : (
          <ComponentHome components={components} onSelect={setSelectedType} />
        )}
      </div>
    </div>
  );
}

// ── Component Home (overview of all types) ──────────────────

function ComponentHome({
  components,
  onSelect,
}: {
  components: ComponentDefinition[];
  onSelect: (type: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Flow Components</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every flow is built from these 5 step types. Each component has a specific contract
          enforced by ARCH-005 — learn what goes in, what comes out, and when to use each one.
        </p>
      </div>
      <div className="grid gap-3">
        {components.map((comp) => {
          const style = TYPE_STYLE[comp.type];
          const Icon = style?.icon ?? Blocks;
          return (
            <Card
              key={comp.type}
              className={`cursor-pointer border transition-colors hover:border-foreground/20 ${style?.accent ?? ""}`}
              onClick={() => onSelect(comp.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${style?.bg ?? "bg-muted"} border ${style?.accent ?? ""} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`h-5 w-5 ${style?.color ?? ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{comp.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${style?.color ?? ""}`}>
                        {style?.categoryLabel ?? comp.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {comp.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <ArrowDown className="h-3 w-3" />
                        {comp.inputs.length} inputs
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" />
                        {comp.outputs.length} outputs
                      </span>
                      <span className="flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        {comp.useCases.length} use cases
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Component Detail ────────────────────────────────────────

function ComponentDetail({ component }: { component: ComponentDefinition }) {
  const style = TYPE_STYLE[component.type];
  const Icon = style?.icon ?? Blocks;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className={`rounded-lg border ${style?.accent ?? ""} ${style?.bg ?? "bg-muted"} p-4`}>
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-lg ${style?.bg ?? "bg-muted"} border ${style?.accent ?? ""} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-6 w-6 ${style?.color ?? ""}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{component.name}</h2>
              <Badge variant="outline" className={`text-[10px] ${style?.color ?? ""}`}>
                {style?.categoryLabel ?? component.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                type: "{component.type}"
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {component.description}
            </p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <Section
        title="Inputs"
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        subtitle="What this component receives from upstream steps or configuration"
      >
        {component.inputs.length > 0 ? (
          <div className="space-y-2">
            {component.inputs.map((field) => (
              <FieldCard key={field.name} field={field} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No required inputs — this component type has the most relaxed contract.
          </p>
        )}
      </Section>

      {/* Outputs */}
      <Section
        title="Outputs"
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        subtitle="What this component produces for downstream steps"
      >
        {component.outputs.length > 0 ? (
          <div className="space-y-2">
            {component.outputs.map((field) => (
              <FieldCard key={field.name} field={field} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No outputs — display components are leaf nodes that render final results.
          </p>
        )}
      </Section>

      {/* ARCH-005 Contract */}
      <Section
        title="ARCH-005 Contract"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        subtitle="Rules enforced by the steel frame validator at import time"
      >
        <ul className="space-y-1.5">
          {component.contractRules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground/50 font-mono shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground">{rule}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Use Cases */}
      <Section
        title="Use Cases"
        icon={<Lightbulb className="h-3.5 w-3.5" />}
        subtitle="Common patterns and real examples from registered flows"
      >
        <div className="space-y-3">
          {component.useCases.map((uc, i) => (
            <div key={i} className="rounded-md border bg-muted/30 p-3">
              <h5 className="text-xs font-semibold">{uc.title}</h5>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {uc.description}
              </p>
              {(uc.exampleFlowId || uc.exampleStepId) && (
                <div className="flex items-center gap-2 mt-2">
                  {uc.exampleFlowId && (
                    <a
                      href={`/flows/${uc.exampleFlowId}`}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-mono"
                    >
                      <FileCode2 className="h-3 w-3" />
                      {uc.exampleFlowId}
                      {uc.exampleStepId && ` → ${uc.exampleStepId}`}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Internal References */}
      <Section
        title="Internal References"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        subtitle="Codebase files that implement or define this component type"
      >
        <div className="space-y-2">
          {component.references.map((ref, i) => (
            <div key={i} className="rounded-md border bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-3 w-3 text-primary shrink-0" />
                <code className="text-xs font-mono font-semibold text-primary">
                  {ref.label}
                </code>
              </div>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                {ref.path}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ref.description}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <h4 className="text-xs font-medium">{title}</h4>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

function FieldCard({
  field,
}: {
  field: { name: string; type: string; description: string; required: boolean };
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono font-semibold">{field.name}</code>
        <Badge variant="outline" className="text-[10px] font-mono">
          {field.type}
        </Badge>
        {field.required ? (
          <Badge variant="default" className="text-[10px]">
            required
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            optional
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{field.description}</p>
    </div>
  );
}
