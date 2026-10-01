/** Capture real renderer posters, then publish immutable directories outside code Git. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  importPackage,
  buildPackage,
} from "../../DigitalCardFramework/src/presentation/package.js";
import {
  writeCompiled,
  buildReport,
} from "../../DigitalCardFramework/src/presentation/compiler.js";
const [
  playwrightPath,
  sharpPath,
  contentArg,
  url = "http://127.0.0.1:4173/portable.html",
] = process.argv.slice(2);
if (!contentArg)
  throw new Error(
    "Supply Playwright, Sharp, external content folder and preview URL",
  );
const content = path.resolve(contentArg),
  { chromium } = await import(pathToFileURL(path.resolve(playwrightPath)).href),
  sharp = (await import(pathToFileURL(path.resolve(sharpPath)).href)).default,
  browser = await chromium.launch({ channel: "msedge", headless: true }),
  catalog = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(url);
  await page.waitForFunction(() => window.portableCards?.ready);
  await page.evaluate(() => portableCards.turn(0.65, 0));
  await page.waitForTimeout(150);
  for (const [index, name] of ["night", "day"].entries()) {
    const png = await page.evaluate(async (index) => {
        const blob = await portableCards.views[index].snapshot(),
          bytes = new Uint8Array(await blob.arrayBuffer());
        let result = "";
        for (let i = 0; i < bytes.length; i += 8192)
          result += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return btoa(result);
      }, index),
      poster = new Uint8Array(
        await sharp(Buffer.from(png, "base64"))
          .resize(500, 750, { fit: "fill" })
          .webp({ quality: 94 })
          .toBuffer(),
      ),
      pkg = await importPackage(
        new Uint8Array(await readFile(path.join(content, name + ".dcard"))),
      );
    const assets = new Map(
      pkg.manifest.assets.map((a) => [a.path, pkg.files.get(a.path)]),
    );
    for (const id of ["poster-front", "poster-back"]) {
      const asset = pkg.manifest.assets.find((a) => a.id === id);
      assets.set(asset.path, poster);
      asset.width = 500;
      asset.height = 750;
    }
    pkg.manifest.faces.front.description =
      name === "night"
        ? "A MapleStory adventurer and a husky sit on a grassy lakeshore under stars and blooming fireworks."
        : "A MapleStory adventurer and Kino sit in a sunny flower field beside a lake and one enormous pink tree. Reflective petals float through the air.";
    pkg.manifest.credits = [
      {
        text: "MapleStory characters and referenced game designs belong to Nexon. Companion artwork is supplied by this host.",
      },
    ];
    const final = await buildPackage(pkg.manifest, pkg.scenes, assets),
      directory = final.digest.slice(7);
    await writeCompiled(final, {
      out: path.join(content, directory),
      archivePath: path.join(content, name + ".dcard"),
    });
    await writeFile(
      path.join(content, name + "-report.json"),
      JSON.stringify(buildReport(final), null, 2),
    );
    catalog.push({
      id: final.manifest.id,
      title: final.manifest.title,
      digest: final.digest,
      directory,
      archive: name + ".dcard",
      assets: final.manifest.assets.length,
      bytes: final.archive.length,
    });
  }
  await writeFile(
    path.join(content, "cards.json"),
    JSON.stringify(catalog, null, 2),
  );
  console.log(JSON.stringify(catalog, null, 2));
} finally {
  await browser.close();
}
