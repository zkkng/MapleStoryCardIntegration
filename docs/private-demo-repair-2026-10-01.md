# Private companion demo repair

The published page's card loader omitted the site's sign-in cookie, so protected `integrity.json` requests failed before controls were installed. The generic resolver fix lives in DigitalCardFramework; this integration consumes it through the existing API.

The companion page now shows loading progress and a retry action after a failed load. Rotation controls remain disabled until initialization succeeds; failure disposes the partial stage and resolver resources. Reloading through Retry recovers after the request failure clears. Artwork, composition, content digests and effects are unchanged.

## Repeatable verification

After staging, run:

```sh
node tools/test-private-demo.mjs ../CardPackDemo/dist ../DigitalCardFramework/node_modules/playwright/index.mjs ../PortableCardQA/auth-companions chromium
node tools/test-private-demo.mjs ../CardPackDemo/dist ../DigitalCardFramework/node_modules/playwright/index.mjs ../PortableCardQA/auth-companions webkit
```

Use an installed Playwright engine and its normal browser-cache setting. The test serves external artwork behind a test-only HttpOnly cookie gate, exercises the extensionless `/together` route at 390 × 844 with touch and DPR 3, verifies both active views and 31 textures, checks visible rotation/reset/touch input, then forces a metadata failure and verifies recovery through Retry. All seven checks passed in Edge 154 and Windows WebKit 26.5 with no uncaught page errors. Screenshots and JSON reports stay outside this repository. This is desktop mobile emulation, not physical-iPhone performance qualification.

The framework audit separately records a Windows WebKit cross-origin cookie-policy failure. It does not affect this same-origin demo but must not be represented as a passing security test.

## Documentation impact

The planned Layered companion cards, Connected display, Alternate website composition and Upgrade and recovery case studies must include protected-content loading and visible error recovery. Card-art creation and game-provider examples are unchanged because neither assets nor game services changed. This records implementation evidence; no wiki publication or human reader trial occurred.
