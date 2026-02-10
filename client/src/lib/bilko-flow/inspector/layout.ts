/**
 * Bilko Flow API — DAG Layout Engine
 *
 * Computes 2D positions for flow steps based on their dependency graph.
 * Steps are arranged in columns (depth levels) left-to-right, with
 * parallel branches stacked vertically within each column.
 */

import type { FlowStep } from "../types";

export interface NodeLayout {
  stepId: string;
  /** Column index (depth in the DAG, 0 = roots) */
  col: number;
  /** Row index within the column */
  row: number;
  /** Pixel x position (top-left) */
  x: number;
  /** Pixel y position (top-left) */
  y: number;
}

export interface EdgeLayout {
  from: string;
  to: string;
  /** SVG path d attribute */
  path: string;
}

export interface DAGLayout {
  nodes: Map<string, NodeLayout>;
  edges: EdgeLayout[];
  /** Total width needed */
  width: number;
  /** Total height needed */
  height: number;
  /** Number of columns */
  columns: number;
  /** Max nodes in any column */
  maxLaneCount: number;
}

// Layout constants
export const NODE_W = 220;
export const NODE_H = 72;
export const COL_GAP = 100;
export const ROW_GAP = 24;
export const PADDING = 40;

/**
 * Compute a 2D layout for a set of flow steps treated as a DAG.
 *
 * Algorithm:
 * 1. Assign depth to each node (longest path from any root).
 * 2. Group nodes by depth into columns.
 * 3. Order nodes within each column to minimise edge crossings
 *    (barycenter heuristic on dependency positions).
 * 4. Convert column/row indices to pixel coordinates.
 * 5. Compute SVG edge paths between connected nodes.
 */
export function computeLayout(steps: FlowStep[]): DAGLayout {
  if (steps.length === 0) {
    return { nodes: new Map(), edges: [], width: 0, height: 0, columns: 0, maxLaneCount: 0 };
  }

  const byId = new Map(steps.map((s) => [s.id, s]));

  // 1. Compute depth (longest path from a root)
  const depth = new Map<string, number>();

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const step = byId.get(id)!;
    if (step.dependsOn.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d = Math.max(...step.dependsOn.map((dep) => getDepth(dep))) + 1;
    depth.set(id, d);
    return d;
  }

  for (const s of steps) getDepth(s.id);

  // 2. Group by depth
  const columns: string[][] = [];
  for (const [id, d] of Array.from(depth.entries())) {
    while (columns.length <= d) columns.push([]);
    columns[d].push(id);
  }

  // 3. Order within each column (barycenter heuristic)
  // For column 0 (roots), use original order.
  // For subsequent columns, sort by average row of dependencies.
  const rowOf = new Map<string, number>();

  // Assign initial rows for column 0
  columns[0].forEach((id, i) => rowOf.set(id, i));

  for (let c = 1; c < columns.length; c++) {
    // Compute barycenter for each node
    const scored = columns[c].map((id) => {
      const step = byId.get(id)!;
      const depRows = step.dependsOn
        .filter((d) => rowOf.has(d))
        .map((d) => rowOf.get(d)!);
      const avg = depRows.length > 0
        ? depRows.reduce((a, b) => a + b, 0) / depRows.length
        : 0;
      return { id, avg };
    });
    scored.sort((a, b) => a.avg - b.avg);
    columns[c] = scored.map((s) => s.id);
    columns[c].forEach((id, i) => rowOf.set(id, i));
  }

  // 4. Compute pixel positions
  const maxLaneCount = Math.max(...columns.map((c) => c.length));
  const nodes = new Map<string, NodeLayout>();

  for (let c = 0; c < columns.length; c++) {
    const col = columns[c];
    for (let r = 0; r < col.length; r++) {
      const id = col[r];
      nodes.set(id, {
        stepId: id,
        col: c,
        row: r,
        x: PADDING + c * (NODE_W + COL_GAP),
        y: PADDING + r * (NODE_H + ROW_GAP),
      });
    }
  }

  // 5. Compute edges (bezier curves)
  const edges: EdgeLayout[] = [];
  for (const step of steps) {
    for (const depId of step.dependsOn) {
      const from = nodes.get(depId);
      const to = nodes.get(step.id);
      if (!from || !to) continue;

      const x1 = from.x + NODE_W;
      const y1 = from.y + NODE_H / 2;
      const x2 = to.x;
      const y2 = to.y + NODE_H / 2;
      const dx = (x2 - x1) * 0.5;

      edges.push({
        from: depId,
        to: step.id,
        path: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
      });
    }
  }

  const width =
    PADDING * 2 + columns.length * NODE_W + (columns.length - 1) * COL_GAP;
  const height =
    PADDING * 2 + maxLaneCount * NODE_H + (maxLaneCount - 1) * ROW_GAP;

  return { nodes, edges, width, height, columns: columns.length, maxLaneCount };
}
