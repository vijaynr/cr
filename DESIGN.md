# PeerView UI DESIGN.md

## Overview

PeerView is a desktop-first code review workspace. The UI should feel like a focused review console rather than a general productivity app or a marketing surface.

This file is the visual and interaction brief for generating or editing PeerView UI. It is based on the current implementation using `@mariozechner/mini-lit` components with shadcn/ui theming and Tailwind CSS v4.

## Product Surface

- Primary surface: web dashboard
- Secondary surface: desktop wrapper around the same web UI
- Not in scope for this document: terminal CLI output design

The product supports:

- an overview dashboard
- provider-specific review workspaces
- settings and configuration panels
- diff inspection
- AI review, summary, and chat side panels

## Overall Feel

The interface should feel:

- calm
- technical
- slightly cinematic
- dense but organized
- premium without being flashy

The visual character is dark-forward with layered gradients, soft glassy chrome, restrained motion, compact typography, and high information density.

Avoid:

- bright startup-dashboard aesthetics
- playful consumer-app styling
- oversized rounded shapes
- noisy gradients on every component
- soft pastel UIs with weak contrast

## Themes

PeerView uses the shadcn/ui default theme provided by `@mariozechner/mini-lit`:

- Dark mode is the default (`.dark` class on `<html>`)
- Light mode activates when the `.dark` class is removed
- Theme switching is handled by toggling the `.dark` class and persisting the preference to localStorage

Both themes are defined entirely through shadcn CSS variables (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, etc.) — no custom color overrides.

## Color System

PeerView uses the shadcn/ui neutral color palette from `@mariozechner/mini-lit/styles/themes/default.css`. All colors are referenced through CSS variables and Tailwind utility classes:

### Core tokens

- `--background` / `--foreground` — page background and default text
- `--card` / `--card-foreground` — card surfaces
- `--muted` / `--muted-foreground` — secondary surfaces and subdued text
- `--primary` / `--primary-foreground` — interactive elements
- `--secondary` / `--secondary-foreground` — subtle buttons and labels
- `--accent` / `--accent-foreground` — hover highlights
- `--destructive` / `--destructive-foreground` — error states
- `--border` — default border color
- `--input` — form input borders
- `--ring` — focus ring color
- `--radius` — border radius token

### Custom semantic tokens

These are defined as custom CSS in `styles.css` since shadcn does not include success/warning:

- Green status: `oklch(0.72 0.17 162)` (used for success states via `.cr-status-dot--ready`)
- Yellow status: `oklch(0.75 0.18 85)` (pending via `.cr-status-dot--pending`)
- Red status: `var(--destructive)` (missing/error states)

## Typography

Primary typeface:

- `Manrope` — used for all UI text, labels, headings, and body copy
- Bundled via `@fontsource/manrope` (weights: 400, 500, 600, 700)

Monospace typeface:

- `IBM Plex Mono` — used for all code, paths, diff content, and technical metadata
- Bundled via `@fontsource/ibm-plex-mono` (weights: 400, 400-italic, 500, 600, 700)

No other typefaces are used. Both fonts are self-hosted and bundled with the application — there are no external font requests and no system-font fallbacks beyond the generic `sans-serif` and `monospace` keywords as a last-resort safety net.

CSS variables:

- `--cr-font-sans: "Manrope", sans-serif`
- `--cr-font-display: var(--cr-font-sans)`
- `--cr-font-mono: "IBM Plex Mono", monospace`

Typography direction:

- headings are compact, medium-bold to bold, with slightly tight tracking
- body copy is concise and neutral
- labels should be short and operational
- metadata should be smaller and quieter than content

Text styling rules:

- base page typography should use slight negative tracking
- headings should use stronger negative tracking than body copy
- do not use decorative display fonts
- do not use large editorial paragraphs

## Shape and Density

Shape tokens:

- selector radius: `0.35rem`
- field radius: `0.4rem`
- box radius: `0.55rem`

Shape direction:

- corners are rounded, but tightly so
- components should feel precise, not pillowy
- panels and cards should read as structured equipment, not soft tiles

Density direction:

- high information density is desirable
- use spacing to separate groups, not to create large empty zones
- long-form review work should fit naturally in one viewport on desktop

## Elevation, Borders, and Surfaces

Surfaces should rely on:

- gradient-backed canvases
- subtle inner and outer shadows
- low-contrast borders
- occasional glass-like blur in navigation chrome

Use elevation sparingly:

- low elevation for standard cards and tabs
- medium elevation for persistent chrome like the sidebar
- temporary surfaces like toasts can sit above all content, but should remain visually compact

Do not use:

- harsh drop shadows
- floating cards with large gaps between them
- pure flat fills without any tonal modulation

## Layout

The product is desktop-first and panel-oriented.

Primary layout ideas:

- persistent left navigation or sidebar
- main workspace area with nested panels
- side-by-side analysis and code inspection where possible
- stacked cards and summary sections on overview pages

Layout should prioritize:

- quick scanning
- stable context
- minimal page-to-page disorientation

## Navigation

The sidebar is a key visual anchor.

Sidebar character:

- translucent dark layered background
- blur and saturation treatment
- faint blue light wash
- subtle top-left highlight
- internal chrome with compact spacing

Brand area:

- compact mark
- strong title
- small uppercase subtitle

Navigation should feel:

- anchored
- always available
- narrower than a typical consumer app nav

## Tabs

There are two main tab styles.

### Workspace Tab Strip

Used for major workspace modes.

Visual rules:

- dark segmented container
- tight padding
- modest corner radius
- active tab has gradient fill, subtle blue border, and light foreground
- inactive tabs are muted blue-gray

Behavior rules:

- hover should slightly raise contrast
- active state should be visible immediately without needing icons
- keep labels short

### Panel Tabs

Used inside side panels and compact regions.

Visual rules:

- tighter and smaller than workspace tabs
- low-contrast segmented background
- active state uses subtle raised fill and border
- small font with firm weight

## Cards

Cards are the default information container.

Card rules:

- use controlled gradients rather than flat fills
- keep border visibility subtle
- avoid huge radius or oversized padding
- one card should communicate one main idea

Use cards for:

- provider summaries
- stat summaries
- config summaries
- collapsible sections
- auxiliary review context

## Collapsible Cards

Collapsible cards should feel like instrument panels.

Visual rules:

- dark gradient body
- hidden overflow
- summary row acts as the header
- body content scrolls inside a bounded region when needed

Interaction rules:

- summary row highlights on hover
- focus-visible should use a clear blue outline
- the chevron rotates when expanded
- expanded state adds a divider between header and body

## Forms and Inputs

Forms should feel technical and compact.

Rules:

- inherit surrounding typography
- remove heavy default shadows
- use border and background contrast to signal affordance
- spacing between fields should be measured and consistent

Use forms for:

- provider credentials
- runtime settings
- webhook settings
- repository selection and filtering

## Toasts and Notifications

Toasts should be:

- compact
- top-right aligned
- visually distinct without blocking workflow
- quick to appear and disappear

Animation behavior:

- short fade and slight upward scale-in
- no bounce
- no dramatic motion

## Diff Viewer

The diff viewer is a primary surface and should remain visually restrained.

Current highlight model:

- additions use soft green tint
- removals use soft red tint
- headers use muted slate tint
- active line uses a thin blue outline

Rules:

- preserve code readability over decoration
- never oversaturate diff colors
- selected or active states must be visible but not overpowering
- technical text should remain easy to scan for long periods

## Motion

Motion should support orientation and feedback only.

Allowed motion:

- quick fade-in for cards or page content
- small hover lifts on compact chrome controls
- toast entry transitions
- chevron rotation on collapsibles

Avoid:

- long animated transitions
- large slide-ins
- high-bounce motion
- ornamental looping animations

## Accessibility

Accessibility requirements:

- strong contrast in both themes
- visible focus states
- meaningful active states beyond color alone
- restrained transparency where text sits on layered backgrounds
- tab controls and compact buttons must remain legible and tappable

When using low-contrast decorative layers:

- never let them reduce text clarity
- keep operational content on more stable surfaces

## Screen Guidance

### Overview Screen

Purpose:

- summarize readiness and current system state

Should include:

- concise page header
- stats row
- provider summary cards
- configuration summary cards

Tone:

- confident
- at-a-glance
- operational rather than narrative

### Provider Workspace

Purpose:

- work on one provider and one review target at a time

Should include:

- target selection context
- workspace tabs for code and review artifacts
- side analysis region for review, summary, and chat

Tone:

- focused
- technical
- low-distraction

### Settings Screen

Purpose:

- configure integrations and runtime behavior

Should include:

- grouped config sections
- clear save/test affordances
- strong status visibility

Tone:

- trustworthy
- explicit
- not intimidating

## Component Inventory

The current UI language should support these component families:

- app sidebar
- dashboard header
- stat card
- provider card
- provider summary card
- config card
- config input
- request item
- review list
- review panel
- summary panel
- chat panel
- comments workspace
- commits list
- diff viewer
- inline comment popover
- discussion thread
- collapsible card
- toast notification
- theme toggle

New components should visually belong to this family before introducing a new pattern.

## Writing Style in the UI

Copy should be:

- brief
- practical
- technically literate

Prefer:

- “Open workspace”
- “Settings”
- “Providers”
- “Review agents”
- “Loading dashboard…”

Avoid:

- marketing slogans
- vague AI hype
- chatty system messages

## Implementation Notes

This document is grounded in:

- `@mariozechner/mini-lit` — UI component library with shadcn/ui theming
- `packages/web/src/styles.css` — minimal custom CSS (spinner, textarea, diff viewer, discussions, chat)
- Tailwind CSS v4 utility classes applied directly in component templates

All component styling uses Tailwind utilities with shadcn color tokens (`bg-card`, `text-foreground`, `border-border`, etc.) directly in the Lit templates. The custom stylesheet is kept minimal (~400 lines) for structural components that require multi-rule CSS (diff viewer, chat, discussions).

If the UI evolves, update this file when the visual system changes, not just when a single screen changes.
