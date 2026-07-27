# Progressive Web App

SpiroAnim emits its production and development web manifests from Vite configuration. After
prerendering completes, `workbox-build` generates the single final service worker from the finished
build. The service worker precaches the static application shell, routed Vue chunks, and animation
worker so the editor can reopen without a network connection after its first successful load.
`workbox-window` owns registration and the update prompt in the client.

## Product behavior

- Installed launches open the landing page. Manifest shortcuts open the SpiroAnim application or
  the About page.
- Pages loaded from `dev.spiroanim.com` select a second web manifest that labels installed apps as
  "SpiroAnim Dev". Every other hostname uses the production manifest and "SpiroAnim" launcher
  label. Both manifests are emitted by the Vite build, so this behavior does not depend on the
  hosting provider or deployment branch metadata.
- Browser installation is offered on the landing page only when the browser exposes an install
  prompt. Safari on iOS receives numbered Add to Home Screen instructions that identify the Share
  control and account for the More and Open as Web App steps shown by current iPadOS versions.
- Service-worker updates require user confirmation. Do not switch to automatic reload without
  accounting for active editor work.
- While the application is open, it checks for an updated service worker hourly, when the browser
  comes back online, and when the page becomes visible. Checks are throttled and remain
  opportunistic so an update failure never interrupts editing.
- After an update is accepted, every page already controlled by the previous service worker reloads
  when the replacement takes control. This prevents an old page from requesting fingerprinted
  assets after the replacement worker removes the previous precache.
- If a routed chunk still becomes unavailable during a deployment transition, the client handles
  Vite's `vite:preloadError` event and reloads. A session-scoped cooldown prevents a tight reload
  loop while allowing a long-lived Safari tab to recover if the first attempt occurred before the
  deployment finished.
- Offline support is available in production builds served over HTTPS (and in `npm run preview`),
  not from `npm run dev`; the development service worker is intentionally disabled.
- A device must finish one online production launch and register the service worker before it can
  relaunch offline. The "SpiroAnim is ready offline" notice confirms that precaching completed.
- A browser shortcut created from a development or otherwise uncontrolled page is only a shortcut;
  it is not an offline-capable installed app.
- Installed desktop and Android apps retain the fullscreen control. It remains hidden on iOS and
  iPadOS until their fullscreen behavior is tested and intentionally supported.
- The service worker uses the client-only `app-shell.html` as its offline navigation fallback,
  including route aliases and URLs containing animation query data.
- The final service worker is generated after prerendering, so Workbox revisions the actual emitted
  HTML and cannot reuse documents that reference outdated hashed assets.
- The preload recovery hook cannot run when the initial entry script itself is unavailable because
  application code has not started yet. Correct HTML revalidation, real asset 404 responses, and a
  consistent deployment are therefore required parts of startup reliability.

## Icons

`public/images/app-icons/pwa-source.svg` is the authoritative, editable icon source. It
intentionally has a transparent background; the generator adds a dark background only to
platform-specific icons that require one. All source and generated application icons live together
under `public/images/app-icons`; future image categories should use their own purpose-based
directory under `public/images`. Regenerate the favicon, Apple touch icon, standard PWA icons, and
maskable icon after changing it:

```sh
npm run generate:pwa-assets
```

The generation settings are in `pwa-assets.config.ts`. Keep important maskable artwork inside the
central safe zone.

### Icon design brief

Treat these constraints as part of the icon's design contract when modifying it manually or with an
LLM:

- Edit `public/images/app-icons/pwa-source.svg`, not the generated PNG or ICO files. Keep it as an
  understandable, editable vector with named gradients, grouped elements, and no embedded raster
  image.
- Keep the SVG canvas transparent. Do not add a full-canvas dark rectangle, vignette, or baked-in
  border. `pwa-assets.config.ts` supplies the dark background for maskable and Apple icons.
- Preserve the basic concept: three rounded orbital loops at different apparent 3D orientations.
  The tiny spherical center accent is optional and must remain subordinate to the paths. The mark
  should suggest a spirographic animation path and remain legible at 48-64 pixels.
- Preserve a violet-to-blue-to-cyan/teal palette and luminous technical character. The high-level
  inspiration is Vulkan Tech Gospel's dark, neon, flow-art mood; do not copy its skull, lettering,
  diagram, or any other specific artwork.
- Avoid four-way rotational symmetry, hooked or right-angled arms, bent arrows, pinwheels, crosses,
  and any silhouette that could resemble a swastika or another religious or political symbol.
- Keep the emblem visually large on the transparent standard icon while retaining enough central
  safe-zone clearance for circular and maskable crops.
- After every source change, run `npm run generate:pwa-assets` and inspect at least the 64-pixel,
  512-pixel, maskable, and Apple outputs. Do not hand-edit those generated derivatives.

## Validation

The PWA test builds the production application, starts Vite preview, validates the generated
manifest and icons, installs the service worker, performs an offline routed navigation, and stages
a second generated build to verify that an already-open client can accept an update and load the
new fingerprinted assets:

```sh
npm run test:pwa
```

Use Chrome DevTools Application panels to inspect the manifest, service worker, and cache contents
when diagnosing an installed build.

## Hosting requirements

Production hosting must:

- serve the site over HTTPS and redirect HTTP to HTTPS;
- serve the generated directory index files so `/`, `/index`, and `/about` return their prerendered
  HTML;
- serve the generated client-only directory index files for `/app`, `/player`, `/editor`,
  `/timeline`, and the pane-layout aliases. A blanket rewrite to `/index.html` would replace this
  separation and should not be used;
- serve both web manifests as `application/manifest+json`;
- revalidate HTML files, `/manifest.webmanifest`, `/manifest-dev.webmanifest`, and `/sw.js` rather
  than caching them as immutable;
- do not apply an immutable browser-cache rule to the blanket `/assets/*` URL pattern unless the
  host guarantees missing assets cannot fall back to HTML with the same cache policy.

### Cloudflare Pages cache configuration

The production site is hosted by Cloudflare Pages. Cloudflare reads `public/_headers` during
deployment and applies those response-header rules to the generated files. Keep that file in the
repository even though it is not used by Vite's local development or preview servers.

The current rules require:

- `/sw.js` to use `no-cache, no-store, must-revalidate` so browsers can discover a new service
  worker immediately;
- `/manifest.webmanifest` and `/manifest-dev.webmanifest` to use `no-cache, must-revalidate` so
  installation metadata stays current;
- missing assets to return a real not-found response instead of successful HTML. The build emits a
  standard `404.html` alongside explicit HTML shells for every supported application route.

Cloudflare Pages' default immediate-revalidation behavior is retained for HTML and assets. Do not
apply a long immutable cache to HTML, the manifest, the service worker, or a wildcard that can also
match an HTML fallback. A stale document or cached fallback can reference or replace fingerprinted
assets and leave the application unable to start.

If hosting moves away from Cloudflare Pages, `public/_headers` may not be recognized. Configure the
new platform to provide the same effective cache behavior using its headers, redirects, or server
configuration. The deployment must also publish each build consistently so its HTML, service
worker, and fingerprinted assets come from the same build.

After changing hosts or cache rules, inspect the deployed response headers for `/`, `/sw.js`, both
web manifests, and one `/assets/*` file. Local preview confirms application behavior but cannot
validate CDN response headers.

Vite emits production files to `build/`. The directory is ignored because deployment should build
from source. If a hosting workflow intentionally commits generated output, document that exception
and ensure every deployment regenerates the service worker and precache manifest.
