# APP-WORKFLOWS-001: Agentic Workflows Page

**Version**: 1.0.0  
**Priority**: HIGH  
**Partition**: apps  
**Dependencies**: HUB-001, UI-006, DATA-002, INT-005

## Purpose

Defines the Agentic Workflows page structure and behavior. This page is the primary interface for viewing and managing n8n-hosted AI agent workflows.

## Page Structure

### Desktop Layout (>= 768px)

Three-column layout with side-by-side navigation:

```
+----------+-------------+------------------+
| Category | Workflows   | Execution Detail |
| List     | List        |                  |
|          |             | Latest | History |
+----------+-------------+------------------+
```

- **Column 1 (Categories)**: Collapsible, lists workflow categories
- **Column 2 (Workflows)**: Collapsible, lists workflows in selected category  
- **Column 3 (Detail)**: Execution detail with Latest/History toggle

### Mobile Layout (< 768px)

Drill-down navigation with Sheet overlays:

```
Step 1: Category List (Sheet)
   ↓ tap category
Step 2: Workflow List (Sheet, with back button)
   ↓ tap workflow  
Step 3: Execution Detail (Main content)
```

**Back Navigation:**
- Sheet header shows back button when viewing workflow list
- Back button returns to category list within same Sheet
- Close button (X) dismisses entire Sheet

## Directives

### D1: Mobile Drill-Down Navigation

On mobile, use Sheet component for hierarchical navigation:

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button size="icon" variant="ghost">
      <Menu />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <SheetHeader>
      {showWorkflows && (
        <Button onClick={() => setShowWorkflows(false)}>
          <ChevronLeft /> Back
        </Button>
      )}
    </SheetHeader>
    {showWorkflows ? <WorkflowList /> : <CategoryList />}
  </SheetContent>
</Sheet>
```

### D2: Execution Detail Views

Two views controlled by toggle:

| View | Shows | Use Case |
|------|-------|----------|
| Latest | Most recent execution | Quick inspection |
| History | Paginated execution list | Historical analysis |

Toggle implementation:
```tsx
<div className="flex gap-1">
  <Button variant={view === "latest" ? "default" : "ghost"}>Latest</Button>
  <Button variant={view === "history" ? "default" : "ghost"}>History</Button>
</div>
```

### D3: Mobile Swipeable Carousel

On mobile, execution detail uses CSS scroll-snap carousel for slides:

```tsx
<div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth">
  <div className="snap-center shrink-0 w-full">Slide 1: Image</div>
  <div className="snap-center shrink-0 w-full">Slide 2: Post 1</div>
  <div className="snap-center shrink-0 w-full">Slide 3: Post 2</div>
</div>
```

Carousel indicators show current slide position.

### D4: Workflow Selection State

- Selected category/workflow persisted in component state
- Mobile Sheet closes after workflow selection
- Desktop maintains selection highlighting

### D5: Real-Time Status Display

Execution status uses semantic indicators:
- Success: CheckCircle icon
- Failed: XCircle icon  
- Pending/In-Progress: Clock icon

## Data Flow

```
Workflow Registry (n8n) → API → Frontend
                              ↓
                        Category grouping
                              ↓
                        Execution history
```

## Cross-References

- UI-006: Mobile Layout (carousel pattern, Sheet overlays)
- INT-005: Callback Persistence Contract (execution data)
- DATA-002: Communication Traces (trace linkage)
- HUB-003: Nested Navigation Pattern (column layout)
