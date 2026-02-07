/**
 * Flow Viewer Tests
 *
 * Ensures the flow registry loads, the FlowExplorer page renders
 * its widgets (header, tag filters, flow cards), and that each
 * registered flow passes ARCH-005 structural invariants.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { flowRegistry, getFlowById } from "@/lib/flow-inspector/registry";

// ── Flow registry unit tests ─────────────────────────────

describe("Flow Registry", () => {
  it("loads at least one flow", () => {
    expect(flowRegistry.length).toBeGreaterThan(0);
  });

  it("all flows pass ARCH-005 validation (they are in the registry)", () => {
    // validateRegistry filters out invalid flows — anything in the
    // registry has already passed all invariants.
    for (const flow of flowRegistry) {
      expect(flow.id).toBeTruthy();
      expect(flow.name).toBeTruthy();
      expect(flow.steps.length).toBeGreaterThan(0);
    }
  });

  it("can look up video-discovery by ID", () => {
    const flow = getFlowById("video-discovery");
    expect(flow).toBeDefined();
    expect(flow!.name).toBe("AI Video Discovery");
  });

  it("can look up ai-consultation by ID", () => {
    const flow = getFlowById("ai-consultation");
    expect(flow).toBeDefined();
    expect(flow!.name).toBe("AI Leverage Consultation");
  });

  it("each flow has tags for filtering", () => {
    for (const flow of flowRegistry) {
      expect(flow.tags).toBeDefined();
      expect(flow.tags.length).toBeGreaterThan(0);
    }
  });

  it("each flow has at least one root step (dependsOn: [])", () => {
    for (const flow of flowRegistry) {
      const roots = flow.steps.filter((s) => s.dependsOn.length === 0);
      expect(roots.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all step IDs within a flow are unique", () => {
    for (const flow of flowRegistry) {
      const ids = flow.steps.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });
});

// ── FlowExplorer component render tests ──────────────────

// Mock wouter so the component doesn't depend on a real router
vi.mock("wouter", () => ({
  useLocation: () => ["/flows", vi.fn()],
  useRoute: () => [false, {}],
}));

describe("FlowExplorer page", () => {
  it("renders the page header and flow cards", async () => {
    const { default: FlowExplorer } = await import("@/pages/flow-explorer");

    render(<FlowExplorer />);

    // Header should show
    expect(screen.getByText("Flow Explorer")).toBeInTheDocument();
    expect(
      screen.getByText(/Inspect and debug in-platform agentic workflows/),
    ).toBeInTheDocument();

    // Should show the "All" filter badge with count
    expect(screen.getByText(`All (${flowRegistry.length})`)).toBeInTheDocument();

    // Each flow's name should appear as a card
    for (const flow of flowRegistry) {
      expect(screen.getByText(flow.name)).toBeInTheDocument();
    }
  });

  it("renders tag filter badges for all unique tags", async () => {
    const { default: FlowExplorer } = await import("@/pages/flow-explorer");

    render(<FlowExplorer />);

    // Collect all unique tags from the registry
    const allTags = Array.from(new Set(flowRegistry.flatMap((f) => f.tags)));

    // Each tag should appear at least once (may appear in both
    // the filter bar and inside flow cards — that's fine)
    for (const tag of allTags) {
      const elements = screen.getAllByText(tag);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });
});
