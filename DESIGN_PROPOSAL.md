# SOTA Visual Upgrade Proposal

## 1. Design Philosophy: "Electric Glass"
We will shift from a standard utility look to a "State of the Art" (SOTA) aesthetic inspired by modern developer tools (Linear, Vercel, Raycast).
- **Core**: Deep, rich dark mode with subtle borders (1px) rather than heavy shadows.
- **Texture**: Heavy use of `backdrop-blur` and semi-transparent backgrounds to create depth.
- **Accent**: A vibrant "Electric Indigo" to replace the standard black/white contrast, making active elements pop.

## 2. Color System (CSS Variables)
We will update `src/assets/main.css` with these refined HSL values.

### Dark Mode (The "Pro" Look)
| Variable | HSL Value | Description |
|----------|-----------|-------------|
| `--background` | `240 10% 3.9%` → `240 6% 10%` | Richer, slightly warmer dark gray (Zinc 950) |
| `--foreground` | `0 0% 98%` → `240 5% 96%` | Softened white for less eye strain |
| `--card` | `240 10% 3.9%` → `240 6% 12%` | Slightly lighter than bg for hierarchy |
| `--popover` | `240 10% 3.9%` → `240 6% 10%` | Matches background |
| `--primary` | `0 0% 98%` → `252 85% 65%` | **Electric Indigo** (Vibrant accent) |
| `--primary-foreground` | `240 5.9% 10%` → `0 0% 100%` | White text on accent |
| `--muted` | `240 3.7% 15.9%` → `240 6% 15%` | Subtle background for secondary items |
| `--muted-foreground` | `240 5% 64.9%` → `240 5% 60%` | Medium contrast text |
| `--border` | `240 3.7% 15.9%` → `240 6% 20%` | Visible but subtle borders |
| `--input` | `240 3.7% 15.9%` → `240 6% 20%` | Matches border |

### Light Mode (Clean & Crisp)
| Variable | HSL Value | Description |
|----------|-----------|-------------|
| `--background` | `0 0% 100%` | Pure white |
| `--foreground` | `240 10% 3.9%` | Almost black |
| `--primary` | `240 5.9% 10%` → `252 80% 55%` | Deep Indigo |
| `--border` | `240 5.9% 90%` → `240 6% 90%` | Crisp light gray |

### Radius & Spacing
- `--radius`: `0.75rem` (12px) - Softer, more modern corners.

## 3. New Logo Design
A geometric, abstract symbol representing "Nodes & Flow".

**Component Name**: `src/components/Logo.vue`
**Concept**: A hexagon shape formed by connected nodes, implying structure and connectivity.

```vue
<template>
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L4 9V23L16 30L28 23V9L16 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"/>
    <circle cx="16" cy="16" r="3" fill="currentColor" class="text-foreground"/>
    <path d="M16 2V9M4 9L10 12.5M28 9L22 12.5M16 30V23M4 23L10 19.5M28 23L22 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-primary/50"/>
  </svg>
</template>
```

## 4. Component Style Upgrades

### Sidebar (`src/components/Sidebar.vue`)
- **Container**: Remove solid background. Use `bg-background/60 backdrop-blur-xl border-r border-border/40`.
- **Header**: Remove the old "E" box. Use the new `<Logo />` component.
- **Typography**: Change "Eino DevOps" to `font-bold tracking-tight text-lg`.

### Graph List (`src/components/GraphList.vue`)
- **Interaction**:
    - **Idle**: Transparent background, `text-muted-foreground`.
    - **Hover**: `bg-primary/5 text-foreground translate-x-1` (Subtle movement).
    - **Active**: `bg-primary/10 text-primary font-medium border-l-2 border-primary`.
- **Transition**: `transition-all duration-200 ease-out`.

### Main Layout (`src/layout/MainLayout.vue`)
- **Background**: Add a subtle gradient mesh or noise texture in the background layer to reduce "flatness".
- **Shadows**: Use `shadow-xl` for floating panels (Inspector/BottomPanel) to separate them from the canvas.