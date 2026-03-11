# Flight Page Redesign Plan ("Pro Max" Edition)

## 1. Goal
Rebuild the Flight Management Page (`src/app/(dashboard)/flights/page.tsx`) to achieve a premium, high-contrast, professional "Pro Max" aesthetic, matching the user's provided visual reference.

## 2. Design System & Aesthetics
- **Theme**: Dark Mode optimized (Zinc/Slate 950 base).
- **Typography**: Inter/Geist (Modern Sans).
- **Visuals**:
    - High contrast cards (`bg-card` with subtle borders).
    - Vivid status colors (Yellow/Green/Red/Blue) using `ring` or `bg-opacity`.
    - Clean, spacious table layout.

## 3. Component Breakdown

### A. Stats Dashboard (Top Section)
Replace generic cards with dedicated `StatCard` components.
- **Total**: Primary Blue/White icon.
- **Pending**: Warning Yellow icon + border accent.
- **Confirmed**: Success Green icon + border accent.
- **Cancelled**: Destructive Red icon + border accent.
**Layout**: 4-column grid.

### B. Filters & Actions (Toolbar)
Refactor into a cohesive `FlightToolbar` component.
- **Event Selector**: Prominent, left-aligned.
- **Search**: Wide, central search bar with icon.
- **Status Filter**: Right-aligned dropdown.
- **Action**: "New Flight" button (Primary).

### C. Data Table (`FlightsTable`)
Enhance `src/components/tables/flights-table.tsx`.
- **Columns**:
    1. **ID**: Fighter ID badge (Mono font).
    2. **Monitor**: Person details (Avatar + Name + Country).
    3. **Type**: Icon only (Arrival/Departure/Both).
    4. **Arrival**: Date | Time | Flight # | Airport (Vertical stack).
    5. **Departure**: Date | Time | Flight # | Airport (Vertical stack).
    6. **Status**: Pill badge (right aligned or center).
    7. **Actions**: 3-dots menu.
- **Styling**: `hover:bg-muted/50`, `border-b`, `py-4` for comfortable touch targets.

## 4. Implementation Steps (Phase 2)

### Step 1: Component Refactor
- [ ] Create `components/flights/flight-stats.tsx`
- [ ] Create `components/flights/flight-toolbar.tsx`
- [ ] Update `components/tables/flights-table.tsx`

### Step 2: Page Layout
- [ ] Update `app/(dashboard)/flights/page.tsx` to use new components.
- [ ] Ensure responsive mobile layout.

### Step 3: Verification
- [ ] Verify data loading.
- [ ] Verify functionality (CRUD).
- [ ] Visual Logic Check (Dark mode contrast).

## 5. Dependencies
- `lucide-react` (Icons)
- `shadcn/ui` (Base components)
- `tailwindcss` (Styling)

## 6. Verification Plan
- Run `lint_runner.py`
- Manual visual check via walkthrough screenshots.
