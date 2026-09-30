# Repository instructions

- Keep this repository focused on MapleStory/Quiet Grove host integration.
- Consume the reusable framework through versioned contracts; do not copy or fork its core logic.
- Keep art, sprite sheets, original game files, credentials and production data outside Git.
- Commit and push integration work only to this repository's configured GitHub remote. Verify push success.
- Changes needed by unrelated hosts belong in the framework repository.
- During website integration, follow the framework's docs/customization-architecture.md. Keep the host page shell, routes, component placement and overrides in this integration; embed through public headless/UI contracts. Demonstrate rearrangement and replacement without patching core or relying on private DOM structure.
