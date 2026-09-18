# NovaCalc — Mathematics Workstation

Offline professional mathematics workstation. Pure HTML/CSS/JS, no backend, installable as a PWA.

**Built by moboapps** — Mohammad Azam · [m.azam7@gmail.com](mailto:m.azam7@gmail.com)

License: [MIT](LICENSE)

## What's new in this redesign
- Clean rail navigation on desktop, bottom tab bar on mobile — both with real icons instead of mixed emoji/glyphs.
- Every `prompt()` dialog (GCD/LCM, permutations, percentage, compound interest, quadratic solver, polynomial evaluation, CAS limit/Taylor) replaced with proper inline input fields, so nothing blocks the page or looks out of place.
- New visual system: IBM Plex Sans for UI text, IBM Plex Mono for numbers/expressions, consistent spacing, light and dark themes via CSS variables, visible focus states for keyboard use.
- Small toast notifications for actions like "History cleared" / "Note saved" instead of silent no-feedback clicks.
- Graph/plot colors now theme-aware; service worker cache bumped and self-cleans old caches.
- All original calculation logic (arithmetic engine, CAS helpers, matrix ops, stats/regression, numerical methods, vectors, probability) is unchanged — only the interaction layer was rebuilt.

## Run
```
python -m http.server 8080
```
then open `http://localhost:8080`.

## Visual redesign (this pass)
Rebuilt the entire visual language from scratch — the interaction layer and calculation logic are untouched, only `style.css` and a few button classes in `index.html` changed:
- **New design language**: an "instrument panel" feel instead of a generic SaaS-card look — the calculator display now reads like a real device bezel (inset shadow, tabular-figure mono digits), and a single amber "signal" accent is spent only where it matters (the `=` key, primary actions, active nav) rather than painted across every element.
- **Three-tier keypad**: digits, operators (÷ × − + ^ mod %) and functions (sin/cos/ln/π…) now have distinct visual weight, so the grid reads at a glance instead of 30 identical buttons — a pattern borrowed from well-considered calculator hardware.
- **Fluid, `rem`-based typography** (was fixed `px`): text now respects the OS-level text-size setting (iOS Dynamic Type / Android font scaling), and the result display scales smoothly with `clamp()` instead of jumping at breakpoints.
- **Safe-area aware**: the rail, bottom tab bar and toast stack now pad around device notches and the home-indicator area via `env(safe-area-inset-*)`.
- **Every accent color re-verified against WCAG AA** (4.5:1+) in both light and dark mode before being used — see the values in `style.css`'s `:root`.
- Dropped three unused CSS classes (`.divider`, `.icon-btn`, `.grid3`) that had no matching markup.

## Bug & security fixes (previous pass)
- **Critical: all trig functions were broken.** `sin`, `cos`, `tan`, `asin`, `acos`, `atan` threw a silent syntax error and always returned `NaN` (a paren-mismatch in the text-substitution engine, plus `asin`/`acos`/`atan` getting mangled by the plain `sin`/`cos`/`tan` substring match before their own turn ran). This affected the calculator keypad, the Graph tab's default `sin(x)` plot, the Lab's default numerical-integration example, and any CAS Limit/Taylor call on a trig expression. Replaced the substitution with dedicated angle-aware wrapper functions (`sinD`, `asinD`, etc.) so parenthesis counts stay correct; verified against DEG, RAD and GRAD modes.
- **Stored XSS in History / Notes.** Both rendered raw user text via `innerHTML` with no escaping; since a JS comment can carry arbitrary characters through a valid expression, crafted input could persist markup into the history list. Added an `esc()` helper and used it everywhere user-typed text is rendered.
- **Removed the "2nd" button.** It only toggled its own label between "2nd"/"1st" and never affected any other control — dead UI, now removed (the keypad already has explicit `sin⁻¹`/`cos⁻¹`/`tan⁻¹` buttons instead of a shift-state).
- **`%` key now means percent, not modulo.** It used to insert a literal `%`, which is JS's modulo operator — identical in effect to the separate `mod` key and easy to misread as "divide by 100" (which is what the standalone Percentage tool in Toolbox does). It now inserts `/100` directly, matching common calculator convention; `mod` still gives true modulo.

## Known limitations (carried over, not fixed in this pass)
- The CAS "derivative" and "Taylor" tools use a simple regex-based symbolic differentiator — it handles single terms in `x`, `sin(...)`, `cos(...)` but not products/chain rule, so results on compound expressions will be incomplete.
- Polynomial root finding in CAS only handles quadratics; use the Numerical Root Finder (Lab tab) for higher-degree polynomials.
- All math still runs through JavaScript's `Function()` on the typed expression — fine for a local, offline personal tool, but do not embed this calculator inside a page that also handles untrusted user input.

## Compatibility note
Layout uses flexbox everywhere (not CSS Grid) for the keypad, form rows, matrix inputs and button groups, so it renders correctly on older or embedded WebViews (e.g. lower-end Android browsers) in addition to current desktop/mobile browsers.
