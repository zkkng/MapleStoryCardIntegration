# MapleStory Card Integration

Separate host integration for the Digital Card Framework.

This repository currently records boundaries; no server bridge or runtime integration has been copied or implemented here. Consume versioned framework interfaces for authentication, eligibility, NX, optional reward delivery and deployment wiring. Do not duplicate the generic pack, ownership, album or trading implementation.

Artwork, sprites, game files, credentials and production data remain outside this repository. GitHub destination is pending the owner's account/repository selection.

Customization is required during integration. The website owns its page layout, navigation and mount locations. Consume the framework's documented headless commands, configurable UI and replacement slots; do not edit its internals to place the opener or rearrange results. Follow the framework's `docs/customization-architecture.md` and include an alternative host layout as an integration acceptance example.
