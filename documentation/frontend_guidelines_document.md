# Chartwarden Frontend Guideline Document

This document describes how the Chartwarden frontend is built, organized, and maintained. It covers architecture, design principles, styling, components, state management, routing, performance, testing, and a summary of key takeaways.

## 1. Frontend Architecture

**Frameworks and Libraries**
- **Next.js**: Provides React-based server-side rendering (SSR), static site generation (SSG), and file-system routing. We use the App Router (`/src/app`) to define pages and layouts.
- **React**: Core UI library for building components.
- **Material-UI (MUI)**: Supplies a robust set of accessible, themeable UI components following Material Design guidelines.
- **TypeScript**: Ensures end-to-end type safety—from shared types in `packages/types` to UI props—catching errors at compile time.
- **Zustand**: Lightweight state management for global stores (e.g., authentication, socket status).
- **SWR**: Handles data fetching, caching, and background revalidation of REST API requests.
- **Axios**: Wraps HTTP requests in our custom API client functions.
- **Socket.IO Client**: Manages real-time communication for notifications and chat.
- **CASL**: Encodes frontend authorization rules matching backend RBAC.

**Monorepo and Tooling**
- **Turborepo** + **npm workspaces**: Coordinate builds, caching, and shared dependencies across packages:
  - `apps/web`: Next.js frontend
  - `packages/types`: Shared TypeScript definitions
  - `packages/config`: ESLint/TS configurations
  - `packages/utils`: Common helper functions
- **ESLint** & **Prettier**: Enforce consistent code style.
- **GitHub Actions**: Automate linting, building, and testing.

**Scalability, Maintainability, Performance**
- **Monorepo**: Encourages reuse (shared types, config) and consistent tooling across frontend and backend.
- **Type Safety**: Reduces runtime bugs and eases refactoring.
- **MUI Theming**: Centralizes styling decisions, making global updates straightforward.
- **Next.js SSR/SSG**: Improves initial load performance and SEO.

## 2. Design Principles

1. **Usability**
   - Intuitive, task-focused layouts.
   - Clear form flows (e.g., patient admission, clinical documentation).
2. **Accessibility**
   - Leverage MUI’s built-in ARIA attributes.
   - Keyboard navigable components and focus indicators.
   - Satisfy WCAG 2.1 AA standards.
3. **Responsiveness**
   - Mobile-first design using MUI breakpoints.
   - Fluid grids and flex layouts ensure content adapts across devices.
4. **Consistency**
   - Shared theme and component library to maintain uniform look and feel.
5. **Clarity**
   - Use plain language in labels and messages.
   - Provide contextual help (tooltips, inline validation).

## 3. Styling and Theming

**Approach**
- CSS-in-JS via MUI’s Emotion integration.
- Leverage MUI’s theme object for palette, typography, spacing, and component overrides.

**CSS Methodology**
- **BEM-like class names** when writing isolated CSS modules (rare). Most styling is via theme props or `sx` prop.

**Theming Configuration**
```js
// src/themes/index.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#00796B', contrastText: '#FFFFFF' }, // teal
    secondary: { main: '#0288D1', contrastText: '#FFFFFF' }, // light blue
    success: { main: '#388E3C' },
    warning: { main: '#F57C00' },
    error: { main: '#D32F2F' },
    background: { default: '#F5F5F5', paper: '#FFFFFF' },
    text: { primary: '#212121', secondary: '#616161' },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 500 },
    body1: { fontSize: '1rem' },
  },
  shape: { borderRadius: 8 },
});
```

**Style “Flavor”**
- Material Design–inspired flat look with subtle elevation (shadows) and rounded corners.

**Color Palette**
- Primary Teal: #00796B
- Secondary Blue: #0288D1
- Success Green: #388E3C
- Warning Orange: #F57C00
- Error Red: #D32F2F
- Background Gray: #F5F5F5
- Surface White: #FFFFFF
- Text: Dark #212121, Medium #616161

**Font**
- Roboto (system-loaded via Google Fonts)

## 4. Component Structure

**Organization**
- `src/components/`: Reusable UI elements (atoms/molecules), e.g., `KPICard`, `AlertCard`, `Button`, `Modal`.
- `src/views/` (or `src/app/…`): Page-level components combining multiple child components.
- `src/hooks/`: Custom React hooks (e.g., `useSocket`, `useAuth`).
- `src/contexts/`: Context providers for cross-app state (e.g., `SocketContext`).

**Reusability and Maintainability**
- Each component:
  - Isolated folder with `index.tsx`, `styles.ts`, and `types.ts` if needed.
  - Exposes typed props interfaces.
  - Includes unit tests in `__tests__` subfolder.
- Promotes DRY (Don’t Repeat Yourself) by sharing UI patterns and logic.

## 5. State Management

**Global State**
- **Zustand** stores:
  - `useAuthStore`: Manages user session, tokens, and profile.
  - `useSocketStore`: Tracks real-time connection status.
  - Additional stores as needed (e.g., UI theme toggles).

**Server State**
- **SWR** for REST data:
  - Caches and deduplicates requests.
  - `useLocal: false` ensures cache is global in the app.
  - `revalidateOnFocus`, `refreshInterval` tuned per endpoint.

**Local Component State**
- `useState` and `useReducer` for form inputs and ephemeral UI state.

## 6. Routing and Navigation

**Next.js File-System Routing**
- Pages and nested layouts defined under `src/app`.
- Dynamic routes (e.g., `[patientId]/goals/page.tsx`).

**Linking and Navigation**
- `next/link` for client-side transitions.
- Programmatic routing via `useRouter()`.

**Route Protection**
- Higher-order components (HOCs) or middleware logic that checks `useAuthStore` and CASL permissions before rendering pages.
- Redirect to `/login` or show “Not Authorized” page as needed.

## 7. Performance Optimization

- **SSR/SSG**: Pre-renders key pages on the server for faster first load.
- **Code Splitting**: `dynamic()` imports for heavy components (charts, maps).
- **Lazy Loading**: Images via `next/image` and `loading="lazy"`.
- **Tree Shaking**: Import only needed MUI components to reduce bundle size.
- **Caching**:
  - SWR caches API responses in memory.
  - Browser caching headers for static assets.
- **Compression**: Enable Gzip/Brotli via Next.js server or hosting platform.
- **Performance Budgets**: Enforced in CI with `next build --profile` and monitoring Lighthouse scores.

## 8. Testing and Quality Assurance

**Unit & Integration Tests**
- **Jest** and **React Testing Library**:
  - Component rendering and interaction tests.
  - Mock SWR, Axios, and Zustand stores.

**End-to-End (E2E) Tests**
- **Playwright**:
  - Cover critical user flows: login, patient admission, editing clinical notes, billing actions.

**Linting and Formatting**
- **ESLint** with custom rules and TypeScript plugins.
- **Prettier** for consistent code formatting.

**Continuous Integration**
- **GitHub Actions** runs lint, type-check, unit tests, and E2E tests on each PR.

## 9. Conclusion and Overall Frontend Summary

The Chartwarden frontend is a modern, scalable, and maintainable React application built on Next.js. It embraces:

- **Monorepo Architecture**: Shared types, configs, and utilities ensure consistency.
- **Type Safety & Modular Design**: TypeScript and component isolation reduce errors and ease future enhancements.
- **Material Design**: A cohesive UI powered by MUI theming and accessible components.
- **Robust Data Handling**: SWR, Axios, and Socket.IO deliver seamless real-time and RESTful interactions.
- **Performance Best Practices**: SSR, code splitting, and caching enhance user experience.
- **Comprehensive Testing**: Jest and Playwright confirm reliability across unit, integration, and end-to-end scenarios.

By following these guidelines, developers can contribute to a consistent, efficient, and user-centered frontend that aligns with Chartwarden’s goals of improving hospice EHR workflows and patient care.