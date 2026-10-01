# Companion compatibility and documentation impact

Tested code pair:

- Framework: `0460693a9322c2e2b1e66ff39ff2b894ffc207b7`
- Integration staging and verification: `bfe6c4fa0a942ccc3cdd93a4b56d7b3f83da8119`
- Portable contract: `digital-card@0.1`, runtime contract version `0.1.0`.

The two existing external card packages remain unchanged:

| Card | Digest | Layers | Assets |
| --- | --- | ---: | ---: |
| Under the Same Sky | `sha256:8627eb074c823e8a69415841cf0366bf89909865f832c94f8351d47af65753f6` | 21 | 15 |
| Thinking of You | `sha256:3a2b20571d9ce0ff63b7b083fe5b59fbbfb0ad12338752677ffb9b51c4eef661` | 60 | 20 |

Run `node tools/verify-companions.mjs ../PortableCardAssets`. This imports and validates the packages through the public framework API and checks the relevant layer effects, independent subjects, feathered bloom, irregular glittery petals, Kino pose frames, cloud parallax, water shimmer and angle-only motion. It does not generate artwork or interact with a game server.

The staging script consumes framework modules and excludes Node-only services and the unbundled GIF decoder. The bounded layered-import worker includes the decoder; the updated Studio offers GIF layers, custom-colored glitter and clickable mobile-performance warnings. All assets and QA screenshots stay outside both code repositories.

## Documentation impact

Affected integration guidance: staging instructions, artist import capabilities, performance diagnostics and companion regression procedure. README now names the executable regression command. Proposed future example: show the existing day/night scene at fixed tilt positions, display an advisory layer report, and explain why a complex card can remain accepted under the default warning policy.

Related unchanged guidance: art references, card compositions, generated art versions, ownership, game currency mapping and live-game data were not modified. The generic framework's settlement gateway is available to future host wiring; this integration has no live external currency provider configured and does not claim live game verification.

Evidence: both package checks pass; framework has 170 passing Node tests and 26 checks each in Edge, Firefox and WebKit; actual-art Studio and layered imports pass. A 60-second active / 5-second idle mobile-viewport run retained 31 textures and 40,744,924 estimated GPU bytes, with no idle frames. Physical iPhone qualification remains outstanding.

Wiki status: planning only. No wiki was authored or published. This impact record preserves the compatibility pair and limitations for future authoring; independent editorial review and human reader trials have not occurred.
