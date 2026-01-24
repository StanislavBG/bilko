# UI-003: Secondary Navigation Pattern

**Version**: 1.0.0  
**Priority**: HIGH  
**Partition**: ui

## Purpose

Defines when and how to implement secondary navigation within applications as they grow in complexity.

## When to Use Secondary Navigation

Use secondary navigation when an application has:

1. **Multiple distinct sections** - More than 2-3 major content areas
2. **Different user workflows** - e.g., viewing vs. managing content
3. **Separable concerns** - Features that don't need to be visible simultaneously
4. **Role-based views** - Different perspectives on the same data

## Pattern Options

### Option A: Tabs (Horizontal Secondary Nav)

Use tabs when:
- 2-5 sections with clear labels
- Users may switch between sections frequently
- Sections are peers (no hierarchy implied)
- Content fits within the visible viewport

```tsx
<Tabs defaultValue="catalog">
  <TabsList>
    <TabsTrigger value="catalog">Catalog</TabsTrigger>
    <TabsTrigger value="audit">Audit</TabsTrigger>
  </TabsList>
  <TabsContent value="catalog">...</TabsContent>
  <TabsContent value="audit">...</TabsContent>
</Tabs>
```

### Option B: Secondary Sidebar (Vertical Secondary Nav)

Use a secondary sidebar when:
- More than 5 sections
- Sections have hierarchy (groups/categories)
- Need persistent visibility of all options
- Users navigate less frequently but need to see structure

```tsx
<div className="flex">
  <aside className="w-48 border-r">
    <SecondaryNav items={sections} />
  </aside>
  <main className="flex-1">
    <Content />
  </main>
</div>
```

### Option C: Two-Column Master-Detail

Use master-detail when:
- Left panel is a list/tree of selectable items
- Right panel shows details of selected item
- Users need to browse items and see detail simultaneously
- Content relationships are parent-child or list-item

```tsx
<div className="flex h-full">
  <div className="w-64 border-r overflow-auto">
    <ItemList onSelect={setSelectedId} />
  </div>
  <div className="flex-1 overflow-auto">
    <ItemDetail id={selectedId} />
  </div>
</div>
```

## Implementation Guidelines

1. **Consistent width** - Secondary nav width should be consistent across the application (e.g., w-48, w-64)
2. **Selection state** - Clearly indicate the active section/item
3. **Empty states** - Handle when no item is selected in detail views
4. **Mobile responsive** - Consider collapsing secondary nav on mobile
5. **Keyboard navigation** - Ensure tab order and arrow key navigation work

## Examples in This Project

- **Rules Explorer**: Uses tabs (Catalog/Audit) with master-detail within each tab
- **Memory Explorer**: May use tabs for trace types or filters

## Cross-References

- HUB-001: Hub Layout (primary sidebar)
- UI-001: UI Principles
