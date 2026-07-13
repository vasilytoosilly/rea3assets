# DESIGN.md — rea3-assets

## 1. Brand identity

**Product domain**: Schema-driven game asset CMS for internal studio library + public marketplace storefront.
**Users**: Studio admins managing game-development assets (3D models, audio, UI components, etc.).
**Feeling**: Dark, professional, game-dev studio tool. Coral-red accent conveys action/energy without being hostile. Inspired by rea3.studio's dark theme.

## 2. Color palette

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0a0a0a` | Root background |
| `--bg-surface` | `#141414` | Cards, sidebar, topbar |
| `--bg-elevated` | `#1a1a1a` | Inputs, elevated surfaces |
| `--bg-hover` | `#222222` | Hover states |
| `--border-default` | `#262626` | Card/input borders |
| `--border-subtle` | `#1f1f1f` | Subtle dividers |
| `--border-active` | `#404040` | Active/focus borders |
| `--text-primary` | `#ffffff` | Headings, body text |
| `--text-secondary` | `#a3a3a3` | Secondary text |
| `--text-muted` | `#737373` | Muted/placeholder text |
| `--accent` | `#ff4d4d` | Primary actions, active states, brand |
| `--accent-hover` | `#ff6666` | Hover on accent buttons |
| `--accent-muted` | `rgba(255,77,77,0.15)` | Accent backgrounds |
| Status colors | `#22c55e` / `#f59e0b` / `#ef4444` / `#737373` / `#ff4d4d` | Success, warning, error, neutral, published(accent) badges |

## 3. Typography

- **Font family**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) — no external font dependency needed for an admin tool.
- **Scale**: Tailwind defaults. Headings use `text-2xl font-bold uppercase tracking-wider`. Body text `text-sm`. Labels `text-xs font-medium uppercase tracking-wider`.
- **Monospace**: Used for slugs, codes, technical labels. System monospace stack.
- **Tabular figures**: Enable `font-variant-numeric: tabular-nums` for data tables (version numbers, file sizes).

## 4. Spacing and layout

- **Layout**: Fixed sidebar (w-64) + scrollable main content area. Sidebar collapses on mobile (<lg).
- **Content width**: `max-w-7xl` container with `px-4 py-6 sm:px-6 lg:px-8`.
- **Card padding**: `px-5 py-4` for card bodies, `px-5 py-4` for headers.
- **Grid gaps**: `gap-4` for card grids, `gap-3` for inline flex items.
- **Border radius**: `rounded-lg` for cards, `rounded-md` for inputs/buttons, `rounded-full` for badges.

## 5. Component patterns

### Buttons
- **Primary**: Coral-red background (`--accent`), white text, no border. Hover: `--accent-hover`.
- **Secondary**: Transparent background, `--text-primary` text, `--border-default` border. Hover: `--bg-hover`.
- **Ghost**: Transparent, `--text-secondary` text. Hover: `--text-primary` + `--bg-hover`.
- **Danger**: `#ef4444` background, white text.
- **Sizes**: `sm` (px-3 py-1.5 text-xs), `md` (px-4 py-2 text-sm), `lg` (px-5 py-2.5 text-sm).
- **Disabled**: `opacity-50 cursor-not-allowed`.

### Cards
- Dark surface (`--bg-surface`), subtle border (`--border-default`), `rounded-lg`.
- Optional `hover` prop: `transition-colors hover:border-[--border-active] hover:bg-[--bg-elevated]`.
- **Never use white backgrounds or transparent cards without borders.**

### Inputs
- Elevated background (`--bg-elevated`), `--border-default` border.
- Focus: `--accent` border + `ring-1 ring-[--accent]`.
- Labels: `text-xs font-medium uppercase tracking-wider text-[--text-secondary]`.

### Badges
- `rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider`.
- Variants: default (muted), accent (coral), success (green), warning (amber), error (red).

### Empty states
- `rounded-lg border border-dashed border-[--border-default] bg-[--bg-surface] px-6 py-16 text-center`.
- Icon + title (uppercase, semibold) + description (muted) + optional action button.

### Error banners
- `rounded-md border p-3 text-sm` with accent border/background/color.
- Dismissible with ✕ button.

### Status badge
- Maps asset/version status to color: draft=muted, in_review=warning, approved=success, published=accent, deprecated=error, archived=muted.

## 6. Motion and interaction

- **Transitions**: All interactive elements use `transition-colors duration-200`. No animation on layout properties.
- **Hover**: Buttons shift background/border color smoothly. Cards get border highlight.
- **Focus**: `focus-visible:outline-2 outline-[--accent] offset-2` globally.
- **Sidebar**: Mobile toggle uses `translate-x` with `duration-200 ease-in-out`.
- **Loading**: Dashed border containers with muted text, not skeleton loaders.
- **No heavy animations** — this is an admin tool, not a marketing page.

## 7. Iconography

- **Icon set**: Lucide React (svg icons). Do NOT use emojis as icons.
- **Key icon mappings** (migrate from emoji):
  - Dashboard: `LayoutDashboard`
  - Asset Types: `Puzzle`
  - Assets: `Package`
  - Tags: `Tag`
  - Pipelines: `Settings2` or `Workflow`
  - Settings: `Settings`
  - Upload: `Upload`
  - Download: `Download`
  - Delete/Remove: `Trash2`
  - Add/Create: `Plus`
  - Search: `Search`
  - Logout: `LogOut`
  - Refresh: `RefreshCw`
  - Check: `Check`

### Frontend rules
- All UI tokens MUST reference these CSS custom properties. No raw hex codes.
- SVG icons only (Lucide). Emojis removed from all visible UI.
- GPU-composited animation only (transform, opacity).
- All interactive elements have hover + focus states.
