# Saharah design system

## Direction

Saharah is a quiet space for personal, anonymous messages. Use a calm, mobile-first interface with clear language and generous spacing. The visual identity combines muted indigo, cool slate neutrals, and restrained status colors. The small outlined conversation mark and rounded heading letterforms give the product its character.

English only. Styling uses Tailwind and shadcn. Motion handles small, purposeful animations. Today the product contains an authentication foundation and a release placeholder; the future messaging screens below are design guidance, not implemented features.

## Color system

The source of truth is `src/app/globals.css`. Raw values stay in that file. Theme variables define their roles, Tailwind exposes named utilities, and shadcn maps its component tokens to the same roles. Every color works with `bg-`, `text-`, `border-`, and `ring-` where appropriate.

### Brand and surfaces

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| main | #4056B5 | #A7B5FF | Brand, primary actions, links |
| main-hover | #354997 | #BAC5FF | Primary action hover |
| main-active | #2B3D81 | #91A3F2 | Primary action pressed state |
| main-foreground | #FFFFFF | #131C3A | Text/icons on main fills |
| main-soft | #E9EDFF | #262F50 | Selected items and gentle brand highlights |
| page | #F7F8FC | #0E1625 | Whole-page background |
| surface | #FFFFFF | #152139 | Cards and form panels |
| surface-raised | #FFFFFF | #1B2A43 | Menus, popovers, dialogs |
| surface-muted | #EFF2F7 | #263349 | Secondary controls and subdued sections |

### Text and interaction

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| ink | #17243A | #E7EDF7 | Headings, body, labels |
| ink-muted | #5B6B82 | #A1AFC4 | Descriptions and helper text |
| ink-subtle | #63728A | #94A3BC | Metadata and timestamps |
| outline | #DCE3EF | #33425C | Decorative dividers and card borders |
| outline-strong | #77859D | #61718C | Visible input/control boundaries |
| focus | main | main | Keyboard focus ring |
| overlay | #101928 | #02060C | Dialog backdrop, normally at 60% opacity |
| disabled | #E6EAF1 | #263349 | Disabled control background |
| disabled-foreground | #63728A | #A1AFC4 | Disabled control text |

Use `border-outline` for structure and `border-outline-strong` for controls. A faint decorative border is not sufficient to identify an input.

### Feedback

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| success | #147A5B | #78D9B0 | Positive state emphasis |
| success-foreground | #FFFFFF | #0C231A | Text on a solid success fill |
| success-soft | #E8F6EF | #142E26 | Success message background |
| warning | #A05D08 | #F2C572 | Caution emphasis |
| warning-foreground | #FFFFFF | #2C1C08 | Text on a solid warning fill |
| warning-soft | #FFF3D9 | #332914 | Warning message background |
| danger | #BC3E4B | #FF9AA5 | Errors and destructive actions |
| danger-foreground | #FFFFFF | #33131A | Text on a solid danger fill |
| danger-soft | #FCECEE | #341D29 | Error message background |
| info | #236CA8 | #8BCBFF | Informational emphasis |
| info-foreground | #FFFFFF | #102337 | Text on a solid info fill |
| info-soft | #E7F1FD | #152D43 | Informational message background |

Pair solid fills with their `-foreground` token. Pair soft fills with the corresponding base color, for example `bg-success-soft text-success`. Always add clear text and, when useful, an icon; status cannot rely on color alone.

### shadcn mapping

- `primary` / `primary-foreground` = main / main-foreground.
- `background` / `foreground` = page / ink.
- `card` / `card-foreground` = surface / ink.
- `popover` / `popover-foreground` = surface-raised / ink.
- `secondary` = surface-muted; `secondary-foreground` = ink.
- `muted` / `muted-foreground` = surface-muted / ink-muted.
- `accent` / `accent-foreground` = main-soft / main.
- `destructive` / `destructive-foreground` = danger / danger-foreground.
- `border`, `input`, `ring` = outline, outline-strong, focus.
- Sidebar tokens follow the same surfaces and brand states.
- Chart 1–5 = main, success, info, warning, danger. Future charts also need labels and non-color distinctions.

The existing theme provider applies `.dark` to the root element and remembers the preference. Custom classes switch automatically; do not repeat dark color classes for each component.

### Ready-to-use classes

```tsx
<section className="bg-surface text-ink border border-outline rounded-xl">
  <p className="text-ink-muted">Supporting text</p>
  <button className="bg-main text-main-foreground hover:bg-main-hover active:bg-main-active">
    Continue
  </button>
</section>

<div className="bg-success-soft text-success">Changes saved.</div>
<div className="bg-warning-soft text-warning">Check your details.</div>
<div className="bg-danger-soft text-danger">Unable to sign in.</div>
<div className="bg-info-soft text-info">More information.</div>
```

These examples show color pairing; use the project's shadcn Button, Alert, and Input for real controls. Avoid raw hex, arbitrary color values, or stock palette colors in product components. Opacity modifiers such as `bg-main/10` and `bg-overlay/60` work normally.

## Typography

- Headings/wordmark: `font-heading`, Trebuchet MS with system fallbacks. Use 600 weight and tight tracking.
- Body/controls: `font-sans`, Segoe UI and system fallbacks. Use 400 body and 500 labels/actions.
- Optional code/data: `font-mono`, system monospace. No font downloads or extra font package.
- Release heading: `text-4xl sm:text-5xl` (36/48px).
- Page title: `text-3xl` (30px); panel title: `text-xl` (20px).
- Body and inputs: `text-base` (16px), body line-height about 1.5–1.75.
- Labels, helper text, timestamps: `text-sm` (14px). Use 12px only for short nonessential captions.
- Use sentence case, readable line lengths, and direct action labels such as “Sign in” and “Create account”.

## Layout and spacing

Use Tailwind's 4px spacing grid: 4, 8, 12, 16, 24, 32, 48, and 64px. Keep 8px between a label and control, 24px between field groups, and 24–32px panel padding.

- Mobile gutters: 24px (`px-6`); desktop: 40px (`sm:px-10`).
- Page shell: `max-w-6xl mx-auto`; auth form: `w-full max-w-md`.
- One column on mobile. Future inbox/detail layouts can split from `lg`.
- Body content remains the visual priority. Avoid decorative hero graphics, gradients, and dense dashboards.
- Base radius is 12px: `rounded-lg`. Cards/popovers use `rounded-xl` (~17px); larger panels can use `rounded-2xl` (~22px).
- Prefer borders and surface contrast over heavy shadows. Floating menus may use shadcn's small shadow.

## Component states

### Buttons

Primary buttons use main, main-hover, main-active, and main-foreground. Secondary buttons use the neutral secondary tokens; outline buttons use the strong outline. Default buttons and icon buttons are at least 44px tall; large actions are 48px. Compact variants are for dense desktop tools only.

Disabled buttons use disabled/disabled-foreground, stop responding, and retain a readable label. Loading keeps the label visible with a small spinner and prevents repeat submissions.

### Inputs and forms

Inputs use surface/ink with outline-strong borders, ink-muted placeholders, and a full-opacity focus ring. Controls are 44px tall and use 16px text. Keep visible labels. Errors appear beside the relevant field using danger, plus text explaining how to fix the value. Never use placeholder-only labels.

### Cards, navigation, and messages

Cards use surface with outline borders. Selected navigation uses main-soft with main text. Menus and dialogs use surface-raised. Inline feedback uses soft status backgrounds and matching status text.

Future anonymous messages use a neutral conversation icon and the word “Anonymous”. Identified messages can show the voluntarily disclosed account name/avatar. Color does not imply a verified identity.

## Motion

Motion for React is already installed. Use opacity and short 4–8px movement for entrances, 150ms for hover/focus, 200ms for feedback/dialog transitions, and at most 250ms for larger entrances. Avoid looping decoration, bouncing, parallax, and animating width/height. Honor reduced motion; the provider already uses `reducedMotion="user"`, and CSS transitions use the motion-reduce variant.

## Accessibility and contrast

Use semantic headings, visible keyboard focus, descriptive icon-button labels, and touch targets of at least 44px. Do not remove focus feedback.

Contrast calculations for the full-opacity palette:
- Main fill/foreground: 6.53:1 light, 8.52:1 dark.
- Ink/page: 14.66:1 light, 15.39:1 dark.
- Muted text/page: 5.11:1 light, 8.14:1 dark.
- Strong input outline/surface: 3.73:1 light, 3.25:1 dark.
- Status text on solid/soft fills: all at least 4.68:1 in light mode and 7.70:1 in dark mode.

Opacity and overlays change contrast, so retain the documented solid pairs for readable text and full-opacity focus rings.

## Implementation rules

1. Change palette values in `src/app/globals.css` only.
2. Use named Tailwind utilities and existing shadcn components.
3. Keep both theme values synchronized when adding a color role.
4. Compile through the existing Tailwind CLI scripts; no project PostCSS setup.
5. Keep the website English only. No translation library or test framework is added.
6. This document defines future screen styling; authentication/backend behavior is outside the design work.

References: [Tailwind theme variables](https://tailwindcss.com/docs/theme), [shadcn theming](https://ui.shadcn.com/docs/theming).
