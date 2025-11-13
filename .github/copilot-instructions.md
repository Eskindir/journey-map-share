# Journey Map Share - AI Coding Agent Instructions

## Project Overview
**Journey Map Share** is a Progressive Web App (PWA) for ride-sharing with real-time tracking, safety features (SOS alerts), and push notifications. Built with React, TypeScript, Vite, and shadcn/ui components.

Originally created with [Lovable](https://lovable.dev), the project emphasizes mobile-first design, offline functionality, and accessibility.

## Architecture

### Core Stack
- **Framework**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Routing**: React Router v6 (`/`, `/track`, `/ride-end`, `/notifications`)
- **State**: React Query for server state, local state with hooks
- **PWA**: vite-plugin-pwa with Workbox for service worker

### Project Structure
```
src/
├── pages/         # Route components (RideStart, TrackRide, RideEnd, NotificationsTest)
├── components/    # Reusable components + ui/ folder (shadcn components)
├── lib/           # Services (notifications.ts singleton, utils.ts)
├── hooks/         # Custom hooks (use-mobile, use-toast)
└── assets/        # Static images
```

### Key Patterns

#### Path Aliases
Use `@/*` for all imports: `import { Button } from "@/components/ui/button"`
Configured in `tsconfig.json` and `vite.config.ts`.

#### shadcn/ui Components
All UI components in `src/components/ui/` follow shadcn conventions:
- Use `cn()` utility from `@/lib/utils` for className merging
- Built on Radix UI with Tailwind CSS
- Add new components with: `npx shadcn@latest add <component-name>`

#### Styling
- **Tailwind**: Use semantic color tokens (`text-foreground`, `bg-card`, `border-border`)
- **Custom colors**: `success`, `warning`, `danger` defined in `tailwind.config.ts`
- **Responsive**: Mobile-first (components adapt from `md:` breakpoint)

#### Notification System
`src/lib/notifications.ts` exports a singleton `NotificationService`:
```typescript
import { notificationService } from "@/lib/notifications";

// Request permission once on app load
await notificationService.requestPermission();
await notificationService.initialize();

// Trigger typed notifications
await notificationService.showNotification('sos', 'Custom message');
// Types: 'sos' | 'route-deviation' | 'delay' | 'arrival' | 'general'
```

**Critical**: Each notification type has unique configs (vibration patterns, icons, actions) in `NOTIFICATION_CONFIGS`. Service worker (`public/sw.js`) handles click events.

#### PWA Configuration
- Manifest: `vite.config.ts` → VitePWA plugin defines app name, icons, theme
- Service Worker: `public/sw.js` handles push events and notification clicks
- Install prompt: `<InstallPWA />` component shows install banner

## Development Workflows

### Running the App
```bash
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build
npm run build:dev    # Dev build (enables component tagger)
npm run preview      # Preview production build
npm run lint         # ESLint check
```

### Adding shadcn Components
```bash
npx shadcn@latest add <component>
# Components auto-install to src/components/ui/
```

### Testing Notifications
1. Visit `/notifications` route
2. Click "Enable Notifications" → grant permission
3. Test each type (SOS, delay, route deviation, arrival)
4. Or test during ride: start ride → go to `/track` → triggers after ~10s

## Conventions & Guidelines

### State Management
- **URL state**: Use `useSearchParams()` for ride details (from, to, eta)
- **Local state**: `useState` for UI state
- **Global state**: React Query for async data (currently minimal usage)

### Component Design
- **Pages** (`src/pages/`): Full-screen route components
- **Components** (`src/components/`): Reusable, composable pieces
- **Mobile-first**: Cards overlay maps on mobile, side-by-side on desktop
  - Example: `TrackRide.tsx` → info card absolute positioned (bottom on mobile, top-right on desktop)

### TypeScript
- `tsconfig.json` has relaxed rules (`noImplicitAny: false`, `strictNullChecks: false`)
- Prefer explicit types for props and service interfaces
- Use type unions for state: `useState<"on-time" | "delayed">("on-time")`

### Routing
- Always use `useNavigate()` for navigation
- Pass state via query params: `navigate(\`/track?from=\${from}&to=\${to}&eta=\${eta}\`)`

### Map Component
`MapView.tsx` is a **simulated map** (not Google Maps integration despite the package):
- SVG-based route visualization
- Animated progress line
- Customizable start/end markers
- Grid background pattern

## Critical Integration Points

### Service Worker Events
`public/sw.js` listens for:
- `install`: Skip waiting, activate immediately
- `activate`: Claim clients
- `push`: Display notifications with custom actions
- `notificationclick`: Navigate to `/track` or handle custom actions

### Offline Support
Workbox caches:
- Static assets (JS, CSS, HTML, images)
- Google Fonts (1 year cache)
- Maps API responses (1 day cache, network-first strategy)

### Emergency Features
**SOS Slider** (`TrackRide.tsx`):
- Slider component with `value={sosValue}`
- Triggers SOS notification when `value[0] >= 95`
- Auto-resets to 0 after 1 second
- Shows toast + triggers `notificationService.showNotification('sos')`

## Common Tasks

### Adding a New Route
1. Create page component in `src/pages/NewPage.tsx`
2. Add route in `App.tsx`: `<Route path="/new" element={<NewPage />} />`
3. Keep `<Route path="*" element={<NotFound />} />` last

### Adding a Notification Type
1. Extend `NotificationType` in `src/lib/notifications.ts`
2. Add config to `NOTIFICATION_CONFIGS` with title, icon, vibrate pattern
3. Update service worker actions if needed
4. Test via `/notifications` page

### Customizing Theme
Edit `src/index.css` CSS variables:
```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* HSL values */
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
}
```

## References
- **Docs**: [NOTIFICATION_SETUP.md](../NOTIFICATION_SETUP.md) - Complete notification system guide
- **UI Components**: [shadcn/ui docs](https://ui.shadcn.com)
- **Styling**: Tailwind semantic tokens defined in `tailwind.config.ts`
- **Key Files**:
  - `src/lib/notifications.ts` - Notification service
  - `vite.config.ts` - PWA + dev server config
  - `public/sw.js` - Service worker logic
  - `src/components/ui/` - All shadcn components
