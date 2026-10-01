/** Assemble deployment output from the reusable source. Never edit bundled copies. */
import { cp, mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const here = path.dirname(fileURLToPath(import.meta.url));
const [contentArg, distArg] = process.argv.slice(2);
if (!contentArg || !distArg)
  throw new Error("Supply compiled card folder and Site dist");
const framework = path.resolve(
    here,
    "../../DigitalCardFramework/src/presentation",
  ),
  dist = path.resolve(distArg);
await mkdir(path.join(dist, "player"), { recursive: true });
const files = [];
for (const name of await readdir(framework)) {
  if (
    (name.endsWith(".js") &&
      ![
        "compiler.js",
        "service.js",
        "node-http.js",
        "import-worker.js",
        "identity.js",
        "adapters.js",
        "layered-source.js",
        "gif-source.js",
        "layered-worker.js",
      ].includes(name)) ||
    name.endsWith(".css")
  ) {
    await cp(path.join(framework, name), path.join(dist, "player", name));
    const bytes = await readFile(path.join(framework, name));
    files.push({
      name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
const content = path.resolve(contentArg),
  catalog = JSON.parse(
    await readFile(path.join(content, "cards.json"), "utf8"),
  );
await mkdir(path.join(dist, "cards"), { recursive: true });
await cp(
  path.join(content, "cards.json"),
  path.join(dist, "cards", "cards.json"),
);
for (const card of catalog) {
  await cp(
    path.join(
      content,
      card.directory ?? (card.id.endsWith("night") ? "night" : "day"),
    ),
    path.join(
      dist,
      "cards",
      card.directory ?? (card.id.endsWith("night") ? "night" : "day"),
    ),
    { recursive: true },
  );
  if (card.archive)
    await cp(
      path.join(content, card.archive),
      path.join(dist, "cards", card.archive),
    );
}
await writeFile(
  path.join(dist, "player", "build-source.json"),
  JSON.stringify(
    {
      source: "DigitalCardFramework/src/presentation",
      contractVersion: "0.1.0",
      files,
    },
    null,
    2,
  ),
);
console.log(
  `Staged ${files.length} runtime modules and external card packages.`,
);

const { build } = await import(
  new URL(
    "./node_modules/esbuild/lib/main.js",
    new URL("file:///" + framework.replaceAll("\\", "/") + "/package.json"),
  )
);
await build({
  entryPoints: [path.join(framework, "adapters.js")],
  outfile: path.join(dist, "player", "adapters-bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  external: ["node:zlib"],
});
await mkdir(path.join(dist, "player", "wasm"), { recursive: true });
for (const [source, name] of [
  ["@rive-app/canvas/rive.wasm", "rive.wasm"],
  ["@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm", "dotlottie.wasm"],
])
  await cp(
    path.join(framework, "node_modules", source),
    path.join(dist, "player", "wasm", name),
  );

await build({
  entryPoints: [path.join(framework, "layered-worker.js")],
  outfile: path.join(dist, "player", "layered-worker-bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  external: ["node:zlib"],
});

for (const name of await readdir(path.join(here, "../demo")))
  await cp(path.join(here, "../demo", name), path.join(dist, name));
