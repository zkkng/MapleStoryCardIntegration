# MapleStory Card Integration

Maple-specific companion artwork migration and demo composition for [DigitalCardFramework](https://github.com/zkkng/DigitalCardFramework). Portable contract 0.1.0. This repository contains code/configuration only: no art, sprite sheets, game files or credentials.

## Tools

Keep the framework checkout as a sibling `DigitalCardFramework`, install its pinned optional presentation dependencies, and provide your own approved artwork outside Git.

1. `node tools/migrate-companions.mjs DEMO_DIST EXTERNAL_OUTPUT SHARP_MODULE_PATH` converts the approved night/day layers into portable bundles. Requires Sharp 0.35.4. This initial conversion does not replace the final renderer-captured posters.
2. `node tools/stage-presentation.mjs EXTERNAL_OUTPUT SITE_DIST` copies the generic runtime, bundles optional adapters/import workers, stages the host composition, and copies external packages selected by `cards.json`.
3. Serve the Site output locally. `node tools/finalize-companions.mjs PLAYWRIGHT_MODULE_PATH SHARP_MODULE_PATH EXTERNAL_OUTPUT PREVIEW_URL` captures the actual renderer into face posters and finalizes immutable content-addressed directories. Requires Playwright with Edge installed. Stage once more afterward.

`demo/` holds the host page shell, layout and public-player wiring. `together.html` displays the companions; `library.html` proves a different poster-grid/inspector composition; `studio.html` opens the generic editor. They use the same card bundles. Existing demo navigation expects the surrounding Maple demo routes. `stage-presentation` builds from source; do not edit generated `player/` copies.

Artwork and `.dcard` files stay in an external content directory and Site hosting. The host's original bespoke page is preserved separately when the migrated page replaces it. Game authentication, NX wallets, reward redemption and a live Maple server bridge are not implemented by these art migration tools.

## Access boundary

The published companion demo is a static playground. Local editing/export cannot publish packs or create inventory in the collector system. A production integration must connect verified host identity and server permissions using the framework's `docs/access-and-identity.md`, and mount import/publishing APIs only behind that authority.


## Audit regression workflow

The framework's `docs/complex-cards/audit-2026-10-01.md` maps requirements to verified behavior and remaining gaps. Run its standalone synthetic suite independently of this integration. After `stage-presentation.mjs`, run the real companion, Studio, layered import, advanced media, program-isolation, library and parameterized resilience scripts against the local preview. The long profile is 900 seconds active plus 300 seconds idle. Keep reports/screenshots in the external QA directory; do not commit art.

The resumed audit preserves the two existing content digests. Runtime fixes and Studio's optional two-face poster capture are delivered by staging from framework source; do not patch generated `dist/player` copies. Physical iPhone testing is still a separate qualification step.
