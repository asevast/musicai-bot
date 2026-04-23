# WebApp UI Design — 9 Screens for MusicAI Mini App

**Status:** design
**Branch:** dev
**Worktree:** none
**Mode:** hands-off

## Design

### Purpose

Transform the existing functional webapp into a polished Telegram Mini App matching the provided HTML mockups (`musicai_mini_app_screens.html`). The design uses a purple (#5B5FC7) primary color with clean rounded cards, subtle borders, and iOS-style aesthetics.

### Context

- Existing webapp at `apps/webapp/` uses React 19, Tailwind CSS 4, `@telegram-apps/telegram-ui`, `react-router` v7, and Zustand
- Currently has basic pages: Home (placeholder), Library, Create (form), Profile, Track
- Need to redesign all screens to match mockups with Russian copy

### Scope — 9 Screens in 4 Sections

**Экран 1 — Главная & Лента (Home & Library)**

- Hero card: gradient (#5B5FC7 to #8B5CF6), credit pill with green dot, "+ Новый трек" CTA
- Recent tracks list: emoji covers (36×36px), track info with overflow ellipsis, circular play buttons
- Bottom nav: 4 tabs with active state (purple icon + label)
- Library: genre filter tabs (horizontal scroll), 2×2 grid of cards with emoji covers in colored backgrounds

**Экран 2 — Мастер создания (4-Step Wizard)**

- Step dots: active=elongated pill (18px), done=solid circle, pending=gray circle
- Step 1 Type: 4 selectable cards (2×2 grid), each with emoji icon, name, cost badge
- Step 2 Prompt: textarea with char counter (1000 max), two sliders (intensity 3 steps, duration 30-184s), negative prompt button
- Step 3 Language: 6 cards (2×3 grid) with flag emoji + name + code, custom lyrics option
- Step 4 Confirm: summary card with all params, highlighted cost, create/change buttons

**Экран 3 — Генерация & Результат**

- Generating: 12 animated wave bars (varying heights 12-38px, opacity 0.4-1.0), ETA countdown
- Stage list: 5 steps with done (checkmark/active green), active (play icon/purple), pending (cloud/gray) icons
- Progress bar: fill + shimmer animation
- Result: cover with play button overlay, waveform visualization (20 bars, played=purple, pending=gray)
- Actions: 4-button grid (Share/Download/Edit Lyrics/Add to Library)
- Regenerate button with credit cost

**Экран 4 — Профиль & Покупка**

- Profile: initials avatar (44px), Pro badge, stats (tracks created/library count), credit bar with refresh date
- Menu: 3 items with colored icons (Buy Credits/Invite Friend/Settings)
- Buy Credits: balance header, one-time packs S/M/L with "Популярный" badge on M
- Subscriptions: Pro/Unlimited tiers with rouble pricing

### Technical Approach

**Architecture**: Expand existing React Router structure with nested routes for wizard steps (`/create`, `/create/prompt`, `/create/lang`, `/create/confirm`). Each screen is a page component composed of shared UI primitives.

**Styling**:

- Option A: Tailwind CSS with custom config extending colors (matches existing setup, fast iteration)
- Option B: CSS Modules with design tokens (better isolation, more boilerplate)
- Option C: `@telegram-apps/telegram-ui` components with custom CSS overrides (native Telegram look, limited customization)

**Choice: Option A (Tailwind)** — The mockups deviate significantly from Telegram's standard UI. Tailwind offers the flexibility needed for custom gradients, animations, and sizing while keeping the lightweight DX.

**Animation**:

- CSS keyframes for wave bars (staggered animation-delay, infinite alternate)
- CSS transform for shimmer (translateX gradient)
- transition-transform for button presses
- No JS animation library needed for these effects

**State**: Continue with Zustand. Add `wizardStore` for multi-step form state persistence.

**Icons**: Inline SVG components (no icon font), matching mockup paths exactly.

### Design Tokens

```typescript
const colors = {
  primary: '#5B5FC7',
  primaryLight: '#EEF2FF',
  primaryDark: '#8B5CF6', // gradient end
  success: '#4ADE80',
  successDark: '#16A34A',
  text: {
    primary: 'var(--tg-theme-text-color)',
    secondary: 'var(--tg-theme-hint-color)',
    tertiary: 'rgba(0,0,0,0.4)',
  },
  background: {
    primary: 'var(--tg-theme-bg-color)',
    secondary: 'var(--tg-theme-secondary-bg-color)',
  },
  border: {
    secondary: 'rgba(0,0,0,0.1)',
    tertiary: 'rgba(0,0,0,0.05)',
  },
};

const radius = {
  sm: '8px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
};

const spacing = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  page: '20px',
};
```

### Component Inventory

**Layout**

- `Page` — Safe area, scrollable container with bottom padding for nav
- `BottomNav` — Fixed bottom, 4 tabs with active state

**Home**

- `HeroCard` — Gradient background, title, subtitle, credit pill, CTA button
- `TrackRow` — Emoji cover, text info, play button
- `SectionHeader` — Title + optional action link

**Wizard**

- `StepDots` — Progress indicator (4 states)
- `TypeCard` — Selectable type with emoji, cost badge
- `PromptInput` — Textarea with char counter
- `Slider` — Custom range input with value display
- `LangButton` — Flag + name + code, selected state
- `SummaryRow` — Label + value pair

**Generation**

- `WaveBars` — 12 animated bars
- `StageList` + `StageItem` — Progress steps with icon states
- `ProgressBar` — Fill with shimmer

**Result**

- `ResultCover` — Gradient cover with play overlay
- `Waveform` — 20-bar visualization with played indicator
- `ActionGrid` — 4-square action buttons

**Profile**

- `Avatar` — Initials circle
- `Badge` — Pro/Free/Unlimited label
- `CreditBar` — Visual bar with numerical display
- `MenuItem` — Icon + text + arrow
- `PackCard` — Purchase option with optional "popular" badge

TDD: no (UI components, visual-heavy, integration tests more valuable than unit tests)

### Invariants

- IV1: All screen dimensions use logical pixels (CSS px), responsive to Telegram Mini App viewport
- IV2: All interactive elements have minimum 44×44px touch target
- IV3: All animations respect `prefers-reduced-motion` media query
- IV4: All text content is in Russian as per mockups
- V5: All colors derive from Telegram theme variables where available (fallback to hardcoded for design fidelity)

### Principles

- PC1: Component-first — build primitives first, compose into screens
- PC2: Composition over configuration — props for styling variants, not boolean flags
- PC3: Mobile-first CSS — base styles for 375px, scale up with media queries
- PC4: Progressive enhancement — core functionality works without animations

### Assumptions

- AS1: `window.Telegram.WebApp` SDK available at runtime
- AS2: Project continues with React 19 + Tailwind 4 + Zustand
- AS3: API endpoints exist for all CRUD operations
- AS4: No external image assets — emoji/CSS only

### Unknowns

- UK1: Is there a shared types package for Track/User that needs updating?
- UK2: Are there existing icons in the project to reuse?
- UK3: Does the Track type have emoji/cover fields?

### Backwards Compatibility

This is a visual redesign of existing pages:

- Route structure remains compatible (`/create`, `/library`, etc.)
- Store shape may need extension for wizard state (additive only)
- No breaking API changes

### Tradeoffs

| Approach               | Pros                                 | Cons                                          |
| ---------------------- | ------------------------------------ | --------------------------------------------- |
| Tailwind custom tokens | Full design fidelity, fast iteration | Overrides Telegram UI kit defaults            |
| CSS Modules            | Better encapsulation, explicit deps  | More boilerplate, no tree-shaking             |
| Telegram UI overrides  | Native feel, less code               | Limited customization, fighting the framework |

**Chosen**: Tailwind with custom theme extension. The mockups are custom enough that fighting Telegram UI kit's opinions would cost more than building from Tailwind primitives.

### Hands-off decisions

- **size: Medium** — 9 screens across 4 sections with custom animations; full Design → Plan → Execute → Verify flow warranted
- **udesign: Tailwind over CSS Modules** — matches existing setup (already using `@import "tailwindcss";`)
- **udesign: No external icon library** — inline SVG matching mockups exactly
- **udesign: Russian copy preserved** — all UI text matches HTML mockups

### Deferred (needs user input)

## Plan

Approach: Extend existing Tailwind CSS with custom theme tokens for the purple (#5B5FC7) design system, build new component primitives matching mockups, then refactor pages to compose from these primitives. Inline SVG icons replace dependency on external icon libraries.

### PH1 — Tailwind Theme + CSS Animations

**1.1** `apps/webapp/tailwind.config.ts:1-50` (create)

- Define custom theme extending colors: primary (#5B5FC7), primary-light (#EEF2FF), primary-dark (#8B5CF6), success (#4ADE80)
- Map Telegram theme CSS variables for background/text
- Spacing scale matching design tokens

**1.2** `apps/webapp/src/app.css:1-20` (modify)

- Add CSS keyframes for bar animation (`@keyframes bar-{n}` 9 variants)
- Add shimmer animation for progress bar
- Add custom utilities: `.animate-bar-{n}`, `.animate-shimmer`
- Respects: IV3 (reduce motion support)

- Commit: "feat: add Tailwind theme and CSS animations"

### PH2 — Icon Components + Shared Primitives

**2.1** `apps/webapp/src/components/icons/index.tsx:1-200` (create)

- `HomeIcon`, `CreateIcon`, `LibraryIcon`, `ProfileIcon` — navigation icons
- `PlayIcon`, `PauseIcon`, `CheckIcon`, `CloudIcon`, `SettingsIcon`, `ShareIcon`, `DownloadIcon`, `EditIcon`, `HeartIcon`, `ChevronRightIcon`, `BackIcon` — utility icons
- All icons match mockup SVG paths exactly

**2.2** `apps/webapp/src/components/Button/index.tsx:1-50` (create)

- Props: `variant: 'primary' | 'ghost'`, `size: 'sm' | 'md' | 'lg'`, `children`, `...buttonProps`
- Primary: bg-primary, white text, rounded-lg
- Ghost: bg-secondary border, gray text
- Respects: IV2 (min 44px touch target)

**2.3** `apps/webapp/src/components/Slider/index.tsx:1-40` (create)

- Props: `value`, `min`, `max`, `onChange`, `label`, `displayValue`
- Custom styled range input matching mockup track/thumb

**2.4** `apps/webapp/src/components/Textarea/index.tsx:1-35` (create)

- Props: `value`, `onChange`, `maxLength`, `placeholder`, `charCount`
- Character counter display, styled border
- Respects: IV4 (Russian copy)

- Commit: "feat: add icon components and UI primitives"

### PH3 — BottomNav + Home Page

**3.1** `apps/webapp/src/components/BottomNav/index.tsx:1-60` (create)

- Fixed bottom navigation with 4 tabs: Главная, Создать, Лента, Профиль
- Active state: purple icon + label (`fill="#5B5FC7"`)
- Uses icons from PH2

**3.2** `apps/webapp/src/pages/Home.tsx:1-100` (create)

- HeroCard: gradient bg (#5B5FC7 to #8B5CF6), "Создать трек" title, "Google Lyria 3 · до 3 минут" subtitle
- CreditsPill: green dot + "80 кредитов"
- CTA: "+ Новый трек" button (links to /create)
- SectionHeader: "Недавние" + "Все" link
- TrackRow list: emoji cover, name, meta, play button
- Hardcoded data for initial rendering

**3.3** `apps/webapp/src/App.tsx:1-25` (modify)

- Import Home component, add to Routes
- Wrap app with BottomNav (present on all routes)
- Respects: AS2 (existing router structure)

- Commit: "feat: add BottomNav and Home page"

### PH4 — Library Page Redesign

**4.1** `apps/webapp/src/pages/Library.tsx:1-80` (modify)

- Replace Button tabs with custom styled tabs: Все, Pop, Lo-fi, Epic
- 2×2 grid layout for cards
- TrackCard component: emoji cover with colored backgrounds, title, duration meta
- Remove Telegram UI kit dependency for this page (use Tailwind primitives)

**4.2** `apps/webapp/src/components/TrackGrid/index.tsx:1-40` (modify)

- Simplify to grid container only
- Remove Telegram UI Cell usage

- Commit: "feat: redesign Library page with grid layout"

### PH5 — Wizard Pages (4 Steps) + Store

**5.1** `apps/webapp/src/store/wizard.store.ts:1-50` (create)

- State: `step: 1|2|3|4`, `trackType`, `prompt`, `intensity`, `duration`, `language`, `customLyrics`
- Actions: `setStep`, `updateField`, `resetWizard`
- Zustand store for persistence across steps
- Respects: AS2 (Zustand)

**5.2** `apps/webapp/src/components/StepDots/index.tsx:1-30` (create)

- Props: `currentStep`, `totalSteps`
- Active dot: 18px width, pill shape
- Done dot: solid purple circle
- Pending dot: gray circle

**5.3** `apps/webapp/src/pages/CreateType.tsx:1-50` (create)

- Step 1: "Тип трека" header
- 2×2 grid TypeCards: Full Song (5 кр), Clip 30s (1 кр), Instrumental (3 кр), 3 Variants (3 кр)
- Each with emoji icon, name, cost
- Next button links to /create/prompt

**5.4** `apps/webapp/src/pages/CreatePrompt.tsx:1-70` (create)

- Step 2: "Описание" header
- Prompt Textarea with char counter (87 / 1000)
- Intensity Slider: Low/Medium/High/Epic
- Duration Slider: 30-184 seconds
- "Negative prompt" ghost button
- Next/Back buttons

**5.5** `apps/webapp/src/pages/CreateLanguage.tsx:1-60` (create)

- Step 3: "Язык вокала" header
- 2×3 grid LangButtons: EN, DE, ES, FR, JA, KO with flags
- Selected state: purple border, light bg
- "Свои тексты" option at bottom
- Next/Back buttons

**5.6** `apps/webapp/src/pages/CreateConfirm.tsx:1-60` (create)

- Step 4: "Всё готово" header
- Summary card: Type, Prompt preview, Language, BPM, Duration
- Cost highlight: "5 кредитов" in primary color
- "Создать трек" primary CTA
- "Изменить" ghost button

**5.7** `apps/webapp/src/App.tsx:20-25` (modify)

- Replace single `/create` route with nested routes
- Add `/create`, `/create/prompt`, `/create/lang`, `/create/confirm`
- Respects: UK1 (existing types)

- Commit: "feat: add 4-step creation wizard"

### PH6 — Generating + Result Pages

**6.1** `apps/webapp/src/pages/Generating.tsx:1-80` (create)

- 12 animated WaveBars (heights: 12,28,36,20,32,16,24,38,18,20,28,16 px)
- Status: "Создаём трек...", ETA: "~38 секунд"
- ProgressBar with shimmer animation
- StageList: 5 steps (Промпт улучшен ✓, Задача в очереди ✓, Генерация аудио ▶, Сохранение в облако, Отправка в Telegram)
- IPH2 icon components

**6.2** `apps/webapp/src/components/Waveform/index.tsx:1-40` (create)

- Props: `progress: number` (0-100), `barCount: 20`
- Bars: played=primary color, pending=gray
- Random heights for visual variety

**6.3** `apps/webapp/src/pages/Track.tsx:1-100` (modify)

- ResultCover: gradient bg, play button overlay
- Title, meta: "Pop · EN · 120 BPM · 2:00"
- Waveform component with mock progress
- ActionGrid: 4 buttons (Поделиться, Скачать, Изменить текст, В библиотеку)
- Regenerate button: "🔄 Перегенерировать (3 кр.)"

- Commit: "feat: add Generating animation and redesign Track result"

### PH7 — Profile + Buy Credits Pages

**7.1** `apps/webapp/src/pages/Profile.tsx:1-100` (modify)

- Avatar: initials (44px circle), Pro badge
- Stats grid: 2 cards (Треков создано, В библиотеке)
- CreditBar: visual progress bar, "80 / 150" display, "Обновятся 1 мая" hint
- Menu: 3 items with colored icons (Купить кредиты, Пригласить друга, Настройки)
- Remove Telegram UI kit dependency

**7.2** `apps/webapp/src/pages/BuyCredits.tsx:1-90` (create)

- Balance header: "Текущий баланс 80 кр."
- One-time packs: Pack S (79 ⭐), Pack M with "Популярный" badge (299 ⭐), Pack L (699 ⭐)
- Subscriptions: Pro (299 ₽/мес), Unlimited (799 ₽/мес)
- Each pack has crown/star icon for currency

**7.3** `apps/webapp/src/App.tsx:20-25` (modify)

- Add `/buy` route for BuyCredits

- Commit: "feat: redesign Profile and add Buy Credits page"

### PH8 — Final Integration

**8.1** `apps/webapp/src/App.tsx:1-30` (modify)

- Ensure BottomNav visible on all pages
- Active tab detection from current route

**8.2** `apps/webapp/src/pages/Home.tsx:1-100` (modify)

- Connect Hero CTA to `/create` route
- Replace hardcoded tracks with store data via `useTracksStore`

**8.3** `apps/webapp/src/store/wizard.store.ts:1-50` (modify)

- Add selector integration with PH5 navigation guards
- Prevent direct access to later steps

- Commit: "feat: integrate all pages with routing"

### Interface graph

- PH1 -> Theme tokens @ apps/webapp/tailwind.config.ts
- PH2 -> Icon components @ apps/webapp/src/components/icons/
- PH3 -> BottomNav @ apps/webapp/src/components/BottomNav/index.tsx
- PH4 -> TrackGrid updates @ apps/webapp/src/components/TrackGrid/
- PH5 -> Wizard store @ apps/webapp/src/store/wizard.store.ts, StepDots @ apps/webapp/src/components/StepDots/
- PH6 -> Waveform @ apps/webapp/src/components/Waveform/
- PH7 -> BuyCredits page @ apps/webapp/src/pages/BuyCredits.tsx
- PH8 -> App.tsx @ apps/webapp/src/App.tsx (consumes all)

### Test strategy

- Manual smoke test: `pnpm smoke` verifies build passes
- Visual verification: each screen matches mockup dimensions, colors, spacing
- Animation check: wave bars animate, shimmer visible, hover states work
- Responsive: 375px viewport renders correctly, 390px+ scales appropriately
- AS1: Telegram WebApp SDK mock or browser fallback works

### Risks / rollback

- RK1 — Telegram UI kit conflicts: We replace UI kit components with Tailwind primitives; if critical bug found, revert to UI kit and ship behind feature flag
- RK2 — CSS animation performance: Test 12-bar animation on low-end devices; if jank, reduce to CSS transitions only
- RK3 — Route structure changes: Beacon detects 404s on old `/create` path; if detected, add redirect

### Backwards compatibility

- Existing /create single-step form removed; split into 4-step flow
- TrackCard props may change shape; verify @musicai/shared-types Track interface unchanged
- BottomNav adds visual element but doesn't break functionality

## Verify

## Conclusion
