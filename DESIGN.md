# Eino DevOps Frontend - UI/UX Design Document

## 1. Overview
This document outlines the redesign of the Eino DevOps Graph visualization tool. The goal is to transform the existing functional prototype into a polished, professional, and "tech-savvy" application reminiscent of Apple Keynote's clean and exquisite aesthetic. The implementation will leverage **Vue 3**, **Tailwind CSS**, and **shadcn-vue**.

## 2. Design Principles & Aesthetic

### 2.1 Core Philosophy
*   **Clean & Exquisite:** Minimalist interface, high contrast, subtle shadows, and refined typography. Avoid clutter.
*   **Tech-Savvy:** Use of monospaced fonts for data, smooth transitions, and a "dark mode first" or "high-end light mode" approach (we will target a refined Light Mode with Dark Mode support).
*   **Content-First:** The Graph (DAG) is the hero. UI elements should frame the content, not compete with it.

### 2.2 Visual Style (Tailwind & Shadcn)
*   **Color Palette:**
    *   **Primary:** Deep Indigo/Violet (`indigo-600` / `violet-600`) for active states and key actions.
    *   **Background:** Off-white / Light Gray (`zinc-50` / `slate-50`) for the canvas background to reduce eye strain compared to pure white.
    *   **Surface:** Pure White (`white`) for panels and cards with subtle borders (`zinc-200`).
    *   **Text:** Dark Slate (`slate-900`) for headings, `slate-600` for secondary text.
    *   **Accents:** Semantic colors for node types (Green for Start, Red for End, Blue for Lambda, Orange for Subgraphs).
*   **Typography:**
    *   **Headings:** `Inter` or system sans-serif (Clean, modern).
    *   **Code/Data:** `JetBrains Mono`, `Fira Code`, or `ui-monospace` (Tech feel).
*   **Effects:**
    *   **Shadows:** Soft, diffused shadows (`shadow-lg`, `shadow-xl`) for floating panels to create depth.
    *   **Borders:** Thin, crisp borders (`border`, `border-zinc-200`).
    *   **Radius:** Rounded corners (`rounded-lg` or `rounded-xl`) for a friendly yet modern look.

## 3. Layout & Navigation

We will adopt a **"Canvas-Centric"** layout with floating or collapsible panels to maximize the visualization area.

### 3.1 Structure
*   **Left Sidebar (Navigation):**
    *   **Role:** Graph selection and high-level app navigation.
    *   **Behavior:** Collapsible or slim mode.
    *   **Content:** List of available Graphs, Search/Filter bar.
*   **Main Area (Canvas):**
    *   **Role:** The Vue Flow interactive graph.
    *   **Behavior:** Infinite pan/zoom.
    *   **Overlays:** Zoom controls (bottom-left), Mini-map (bottom-right).
*   **Right Panel (Inspector - Contextual):**
    *   **Role:** Details for the selected node or graph metadata.
    *   **Behavior:** Slide-over or floating card. Shows only when a node is selected.
*   **Bottom Panel (Debug Console):**
    *   **Role:** Debugging interface (Input JSON, Execution Logs).
    *   **Behavior:** Collapsible drawer (BottomSheet style).

## 4. Component Architecture

### 4.1 High-Level Hierarchy
```
App.vue
├── LayoutContainer (Grid/Flex)
│   ├── Sidebar (Left)
│   │   ├── Branding/Logo
│   │   ├── SearchInput (shadcn Input)
│   │   └── GraphList (shadcn ScrollArea + Command)
│   │       └── GraphItem (Selectable)
│   │
│   ├── MainCanvas (Center)
│   │   ├── Toolbar (Floating Top-Center: Layout controls, Fit View)
│   │   ├── VueFlowWrapper
│   │   │   ├── CustomNode (Start, End, Lambda, etc.)
│   │   │   ├── Controls (Zoom/Pan)
│   │   │   └── MiniMap
│   │   │
│   │   └── NodeInspector (Floating Right)
│   │       ├── NodeHeader (Type, Name)
│   │       ├── SchemaViewer (Input/Output types)
│   │       └── ConfigurationViewer (JSON tree)
│   │
│   └── DebugConsole (Bottom Drawer)
│       ├── ConsoleHeader (Toggle, Status)
│       ├── DebugToolbar (Run Button, Clear)
│       ├── SplitView
│       │   ├── InputEditor (Monaco/CodeMirror style textarea)
│       │   └���─ LogViewer (Terminal style output)
```

### 4.2 Key Components & Shadcn Mapping

| Feature | Custom Component | Shadcn-Vue Component | Description |
| :--- | :--- | :--- | :--- |
| **Layout** | `MainLayout` | `ResizablePanel` | Manage resizable areas for Sidebar/Canvas/Console. |
| **Graph List** | `GraphList` | `Command`, `ScrollArea` | Searchable list with keyboard navigation support. |
| **Node Details** | `NodeInspector` | `Card`, `Sheet` (optional) | Floating card showing node properties. |
| **Debug Input** | `JsonEditor` | `Textarea` (styled) | JSON input area with validation feedback. |
| **Debug Logs** | `LogViewer` | `ScrollArea` | Terminal-like log output with timestamps. |
| **Controls** | `GraphControls` | `Button`, `Tooltip` | Zoom in/out, Fit view, Auto-layout buttons. |
| **Modals** | `SettingsModal` | `Dialog` | Global settings (if needed). |
| **Status** | `StatusBadge` | `Badge` | Visual indicator for Node types or Graph status. |

## 5. Detailed Feature Design

### 5.1 Graph Selection (Sidebar)
*   **Visual:** A clean list with a search bar at the top.
*   **Interaction:** Clicking a graph loads it into the canvas.
*   **Active State:** Highlighted with a subtle background and accent border.
*   **Metadata:** Show Graph ID and simple stats (node count) in the list item.

### 5.2 Graph Visualization (Canvas)
*   **Nodes:**
    *   **Design:** Card-like nodes with a header (icon + type) and body (name).
    *   **Styling:** White background, shadow-sm, border-l-4 (colored by type).
    *   **Handles:** Subtle dots that enlarge on hover.
*   **Edges:** Smooth bezier curves, animated when data flows (future enhancement).
*   **Controls:** Floating pill-shaped toolbar at the bottom-center or top-center for "Fit View", "Zoom In/Out", "Layout Direction".

### 5.3 Node Inspection
*   **Trigger:** Click on a node.
*   **Display:** A floating panel on the right side of the canvas (glassmorphism effect).
*   **Content:**
    *   **Header:** Node Name & Type (Badge).
    *   **Tabs:** "Schema" (Input/Output types), "Config" (Parameters), "State" (if debugging).
    *   **Action:** "View Subgraph" button if the node contains a nested graph.

### 5.4 Debugging & Execution
*   **Trigger:** "Debug" button in the top toolbar or a dedicated bottom bar handle.
*   **Interface:** A resizable bottom drawer.
*   **Left Column (Input):**
    *   Dropdown to select "Input Type" (pre-fills JSON template).
    *   Code editor for JSON input.
    *   "Run" button (Primary Action).
*   **Right Column (Output):**
    *   Streaming log view.
    *   Auto-scroll to bottom.
    *   Distinct styling for `stdout`, `stderr`, and `system` messages.

## 6. Implementation Plan

1.  **Setup:** Install `shadcn-vue` and configure Tailwind.
2.  **Layout Shell:** Create the Sidebar + Canvas + Bottom Panel layout using CSS Grid or Resizable panels.
3.  **Graph Integration:** Port existing `VueFlow` setup into the new layout. Style the nodes using Tailwind.
4.  **Sidebar:** Implement the `GraphList` using shadcn `Command` component.
5.  **Inspector:** Create the `NodeInspector` component.
6.  **Debug Panel:** Refactor `DebugPanel` to use the new bottom drawer design and shadcn inputs/buttons.
7.  **Polish:** Add transitions, hover effects, and ensure responsive behavior.