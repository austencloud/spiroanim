# Application Icons

`public/images/app-icons/pwa-source.svg` is the authoritative, editable application-icon source. It
intentionally has a transparent background; the generator adds a dark background only to
platform-specific icons that require one. All source and generated application icons live together
under `public/images/app-icons`; future image categories should use their own purpose-based
directory under `public/images`.

Regenerate the favicon, Apple touch icon, standard PWA icons, and maskable icon after changing the
source:

```sh
npm run generate:pwa-assets
```

The generation settings are in `pwa-assets.config.ts`. Keep important maskable artwork inside the
central safe zone.

## Icon design brief

Treat these constraints as part of the icon's design contract when modifying it manually or with
an LLM:

- Edit `public/images/app-icons/pwa-source.svg`, not the generated PNG or ICO files. Keep it as an
  understandable, editable vector with named gradients, grouped elements, and no embedded raster
  image.
- Keep the SVG canvas transparent. Do not add a full-canvas dark rectangle, vignette, or baked-in
  border. `pwa-assets.config.ts` supplies the dark background for maskable and Apple icons.
- Preserve the basic concept: three rounded orbital loops at different apparent 3D orientations.
  The tiny spherical center accent is optional and must remain subordinate to the paths. The mark
  should suggest a spirographic animation path and remain legible at 48-64 pixels.
- Preserve a violet-to-blue-to-cyan/teal palette and luminous technical character. The high-level
  inspiration is Vulcan Tech Gospel's dark, neon, flow-art mood; do not copy its skull, lettering,
  diagram, or any other specific artwork.
- Avoid four-way rotational symmetry, hooked or right-angled arms, bent arrows, pinwheels, crosses,
  and any silhouette that could resemble a swastika or another religious or political symbol.
- Keep the emblem visually large on the transparent standard icon while retaining enough central
  safe-zone clearance for circular and maskable crops.
- After every source change, run `npm run generate:pwa-assets` and inspect at least the 64-pixel,
  512-pixel, maskable, and Apple outputs. Do not hand-edit those generated derivatives.

## Validation

After changing the source:

1. Run `npm run generate:pwa-assets`.
2. Inspect the 64-pixel and 512-pixel standard icons.
3. Inspect the maskable icon for safe-zone clipping.
4. Inspect the Apple icon for its generated background and legibility.
5. Run `npm run test:pwa` to validate the manifest and generated assets.

See [`PWA.md`](./PWA.md) for installation, offline, and update behavior.
