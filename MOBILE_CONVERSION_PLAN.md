# Mobile Version Conversion Plan

## Overview
Converting the desktop-first application into a fully mobile-responsive version.

## Key Changes Required

### 1. **Layout Architecture** (`AccidentReportWizard.tsx`)
#### Desktop (Current)
- Horizontal split: Left panel (wizard) + Right panel (chat)
- Fixed chat window (400px wide)
- Side-by-side navigation

#### Mobile (Target)
- Vertical stacking: Wizard on top, chat as overlay
- Full-screen chat when active
- Bottom navigation bar
- Floating chat button when collapsed

---

### 2. **Step1Search Component**
#### Desktop Issues
- 4 buttons in a row (検索, AI検索, 比較検索, + tabs)
- Fixed-width form elements
- Multi-column result lists

#### Mobile Solutions
- Wrap buttons to 2x2 grid on mobile
- Full-width inputs and buttons
- Single-column result cards
- Collapsible filter badges
- Sticky search bar

---

### 3. **ChatWindow Component**
#### Desktop Issues
- Fixed 400px width sidebar
- Small textarea
- Horizontal image previews

#### Mobile Solutions
- Full-screen overlay (covers entire screen)
- Larger touch targets (48px minimum)
- Bottom-sheet style drawer
- Swipe-to-close gesture support
- Larger input area for touch keyboards
- Full-width image previews

---

### 4. **SearchComparisonPage**
#### Desktop Issues
- Side-by-side comparison panels
- Fixed-width content

#### Mobile Solutions
- Vertically stacked comparison
- Swipeable cards (left/right to switch)
- Collapsible sections
- Mobile-optimized metrics display

---

### 5. **WorkflowStepper**
#### Desktop Issues
- Horizontal stepper with 4 steps
- Long step names

#### Mobile Solutions
- Condensed circular indicator
- Dropdown for step navigation
- Progress bar instead of full stepper
- Abbreviated step names on mobile

---

## Responsive Breakpoints

```css
/* Tailwind CSS breakpoints used */
sm: 640px  /* Small devices */
md: 768px  /* Medium devices (tablets) */
lg: 1024px /* Large devices (desktops) */
xl: 1280px /* Extra large devices */
```

## Implementation Strategy

### Phase 1: Core Layout (Mobile-First)
1. Update `AccidentReportWizard.tsx` with responsive flex/grid
2. Convert chat to overlay on mobile
3. Add mobile-friendly navigation

### Phase 2: Component Optimization
1. Responsive buttons and inputs in `Step1Search`
2. Touch-optimized `ChatWindow`
3. Mobile-friendly result cards

### Phase 3: Advanced Features
1. Swipe gestures
2. Mobile-specific animations
3. PWA manifest for "Add to Home Screen"

### Phase 4: Testing & Polish
1. Test on actual devices
2. Optimize performance (lazy loading, code splitting)
3. Deploy to Vercel preview

---

## Mobile-Specific Features to Add

1. **Touch Optimizations**
   - Minimum 48x48px touch targets
   - Swipe gestures for navigation
   - Pull-to-refresh on result lists

2. **Performance**
   - Lazy load images
   - Reduce initial bundle size
   - Optimize for 3G networks

3. **UX Enhancements**
   - Bottom navigation bar
   - Haptic feedback (vibrations)
   - Voice input prominence
   - Camera integration for accident photos

4. **Accessibility**
   - Larger fonts (16px minimum)
   - High contrast mode support
   - Screen reader optimizations

---

## Testing Checklist

- [ ] iPhone SE (375px width)
- [ ] iPhone 12/13/14 (390px width)
- [ ] Android standard (360px width)
- [ ] Tablet portrait (768px width)
- [ ] Landscape mode on all devices
- [ ] Touch gestures work
- [ ] Keyboard doesn't obscure inputs
- [ ] Images load and display correctly
- [ ] Chat overlay animations smooth
