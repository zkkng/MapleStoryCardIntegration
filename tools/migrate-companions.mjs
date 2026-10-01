/** Maple integration only. Usage: node tools/migrate-companions.mjs demo/dist out sharp-module-path */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildPackage } from "../../DigitalCardFramework/src/presentation/package.js";
import {
  writeCompiled,
  buildReport,
} from "../../DigitalCardFramework/src/presentation/compiler.js";
import { seededRandom } from "../../DigitalCardFramework/src/presentation/data.js";
const [sourceArg, outArg, sharpPath] = process.argv.slice(2);
if (!sourceArg || !outArg || !sharpPath)
  throw new Error(
    "Supply demo/dist, external output folder and installed sharp module path",
  );
const source = path.resolve(sourceArg),
  out = path.resolve(outArg);
const { default: sharp } = await import(
  pathToFileURL(path.resolve(sharpPath)).href
);
const I = (name) => ["input", name],
  X = I("tilt.x"),
  Y = I("tilt.y"),
  A = I("angle"),
  add = (...a) => ["add", ...a],
  mul = (...a) => ["mul", ...a],
  sin = (x) => ["sin", x],
  cos = (x) => ["cos", x],
  smooth = (a, b, x) => ["smooth", a, b, x];
const palette = { night: "#081536", day: "#bce7f1" };
const nightLayers = [
  { id: "sky", src: "sky.png", depth: 0.04 },
  {
    id: "gold",
    src: "firework-gold.png",
    depth: 0.65,
    x: 51,
    y: 9,
    w: 42,
    bounds: [46, 15, 1181, 1203],
    bloom: [0.58, 0.92],
    center: [0.5, 0.36],
  },
  {
    id: "pink",
    src: "firework-pink.png",
    depth: 0.4,
    x: 24,
    y: 26,
    w: 29,
    bounds: [96, 77, 1088, 1099],
    bloom: [0.08, 0.4],
    center: [0.5, 0.45],
  },
  {
    id: "cyan",
    src: "firework-cyan.png",
    depth: 0.2,
    x: 74,
    y: 33,
    w: 20,
    bounds: [219, 242, 818, 808],
    bloom: [0.32, 0.66],
    center: [0.5, 0.48],
  },
  {
    id: "mountain",
    src: "mountain.png",
    depth: 0.21,
    brightness: 0.73,
    saturation: 0.85,
  },
  {
    id: "trees",
    src: "trees.png",
    depth: 0.35,
    brightness: 0.65,
    saturation: 0.85,
  },
  {
    id: "lake",
    src: "lake.png",
    depth: 0.48,
    brightness: 0.72,
    saturation: 0.85,
    shift: 0.07487,
  },
  { id: "grass", src: "grass.png", depth: 0.7, brightness: 0.77 },
  {
    id: "player",
    src: "player.png",
    depth: 0.87,
    groundDepth: 0.7,
    x: 22,
    y: 74,
    w: 34,
    bounds: [22, 150, 1206, 1035],
  },
  {
    id: "husky",
    src: "husky.png",
    depth: 0.97,
    groundDepth: 0.7,
    x: 71,
    y: 83.5,
    w: 11.2,
    bounds: [149, 65, 968, 1132],
  },
];

async function migrate(which) {
  const dir = path.join(source, `${which}-art`),
    day =
      which === "day"
        ? JSON.parse(await readFile(path.join(dir, "scene.json"), "utf8"))
        : null;
  const metadata = [],
    assets = new Map(),
    nodes = [],
    loaded = new Map(),
    ratios = new Map();
  async function image(
    id,
    filename,
    { crop, alphaPower, maxEdge = 1536, bytes: provided } = {},
  ) {
    if (loaded.has(id)) return id;
    let pipeline = sharp(
      provided ?? (await readFile(path.join(dir, filename))),
    );
    const info = await pipeline.metadata();
    if (crop)
      pipeline = pipeline.extract({
        left: crop[0],
        top: crop[1],
        width: crop[2],
        height: crop[3],
      });
    pipeline = pipeline.resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
    if (alphaPower) {
      const raw = await pipeline
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let p = 3; p < raw.data.length; p += 4)
        raw.data[p] = Math.round(255 * Math.pow(raw.data[p] / 255, alphaPower));
      pipeline = sharp(raw.data, { raw: raw.info });
    }
    const result = await pipeline
      .webp({ quality: 94, alphaQuality: 100 })
      .toBuffer({ resolveWithObject: true });
    const a = {
      id,
      path: `assets/${id}.webp`,
      mediaType: "image/webp",
      width: result.info.width,
      height: result.info.height,
      role: "color",
      bytes: result.data.length,
      sha256: "0".repeat(64),
    };
    metadata.push(a);
    assets.set(a.path, new Uint8Array(result.data));
    loaded.set(id, a);
    ratios.set(id, [
      a.width / (crop?.[2] ?? info.width),
      a.height / (crop?.[3] ?? info.height),
    ]);
    return id;
  }
  function base(layer) {
    const p = (((layer.depth - 0.42) * 30) / 430) * 1000,
      q =
        ((((layer.groundDepth ?? layer.depth) - 0.42) * 30) / 430) *
        1000 *
        0.65;
    return {
      id: layer.id,
      name: layer.name ?? layer.id,
      type: "image",
      asset: layer.id,
      x: layer.bounds ? layer.x * 10 : -30,
      y: layer.bounds ? layer.y * 15 : -45 + (layer.shift ?? 0) * 1590,
      width: layer.bounds ? layer.w * 10 : 1060,
      height: layer.bounds
        ? (layer.w * 10 * layer.bounds[3]) / layer.bounds[2]
        : 1590,
      parallax: [p, q],
      opacity: 1,
      ...(layer.brightness ? { brightness: layer.brightness } : {}),
      ...(layer.saturation ? { saturation: layer.saturation } : {}),
    };
  }
  const layers = day?.layers ?? nightLayers;
  for (const layer of layers) {
    if (layer.id === "petals") {
      const crops = [
        [76, 29, 82, 92],
        [219, 188, 112, 115],
        [453, 340, 60, 70],
        [660, 489, 112, 104],
        [887, 633, 92, 88],
        [935, 773, 80, 118],
        [728, 899, 111, 106],
        [823, 1030, 174, 108],
      ];
      for (let i = 0; i < crops.length; i++)
        await image(`petal-${i}`, layer.src, {
          crop: crops[i],
          alphaPower: 2.4,
          maxEdge: 128,
        });
      const random = seededRandom(84293);
      for (let i = 0; i < 48; i++) {
        const size = 0.9 + random() * 1.5;
        let x = 5 + random() * 90,
          y = 7 + random() * 81;
        if (i < 10) {
          x = 42 + random() * 45;
          y = 33 + random() * 27;
        }
        if (x > 58 && x < 84 && y > 71 && y < 84) y = 65;
        const phase = random() * Math.PI * 2,
          depth = 0.45 + random() * 0.8,
          crop = crops[i % 8];
        nodes.push({
          id: `petal-${i}`,
          type: "image",
          asset: `petal-${i % 8}`,
          x: x * 10,
          y: y * 15,
          width: size * 10,
          height: (size * 10 * crop[3]) / crop[2],
          opacity: 0.94,
          parallax: [(((layer.depth - 0.42) * 30) / 430) * 1000, 0],
          material: {
            kind: "glitter",
            size: 3,
            density: 0.6,
            seed: i + 17,
            intensity: 2.8,
            angle: 0,
          },
          bindings: {
            x: add(x * 10, mul(X, 200 * depth)),
            y: add(y * 15, mul(Y, 90 * depth), mul(X, 52.5 * Math.sin(phase))),
            rotation: add(phase * 30, mul(X, 55)),
            scaleX: add(
              0.65,
              mul(["abs", sin(add(mul(A, Math.PI * 1.5), phase))], 0.35),
            ),
            "material.angle": add(A, phase / (Math.PI * 2)),
          },
        });
      }
      continue;
    }
    const retainSource = layer.id === "husky";
    await image(layer.id, layer.src, {
      crop: retainSource ? undefined : layer.bounds,
    });
    const n = base(layer);
    if (retainSource) {
      const [sx, sy] = ratios.get(layer.id);
      n.rect = layer.bounds.map((v, i) => v * (i % 2 ? sy : sx));
    }
    if (layer.id === "player") n.scaleX = -1;
    if (layer.id === "clouds") {
      n.x = -114.8;
      n.y = -172.2;
      n.width = 1229.6;
      n.height = 1844.4;
      n.opacity = 0.94;
      n.parallax[0] += 73.776;
      n.parallax[1] += 22.1328;
    }
    if (which === "day" && layer.id === "lake") n.y += 1590 * 0.0945;
    if (which === "day" && layer.id === "flowers") n.y -= 1590 * 0.0228;
    if (which === "day" && layer.id === "trees") n.y += 1590 * 0.0052;
    if (layer.bloom) {
      const bloom = smooth(...layer.bloom, A),
        ignition = sin(mul(Math.PI, bloom));
      n.blend = "screen";
      n.material = {
        kind: "bloom",
        center: layer.center,
        feather: 0.28,
        progress: 1,
      };
      n.pivotX = n.width * layer.center[0];
      n.pivotY = n.height * layer.center[1];
      n.bindings = {
        "material.progress": bloom,
        opacity: smooth(0, 0.16, bloom),
        scaleX: add(0.18, mul(0.82, bloom)),
        scaleY: add(0.18, mul(0.82, bloom)),
        rotation: mul(X, layer.depth > 0.2 ? 2.3 : -1.8),
        brightness: add(1.05, mul(0.85, ignition)),
      };
    }
    if (layer.id === "husky") {
      const polygon = [
        [0, 0.5],
        [0.32, 0.5],
        [0.3, 0.62],
        [0.29, 0.68],
        [0.305, 0.72],
        [0.285, 0.78],
        [0.255, 0.82],
        [0, 0.82],
      ];
      const tail = {
        ...structuredClone(n),
        id: "husky-tail",
        mask: { polygon },
        pivotX: ((0.303 * 1254 - layer.bounds[0]) / layer.bounds[2]) * n.width,
        pivotY: ((0.718 * 1254 - layer.bounds[1]) / layer.bounds[3]) * n.height,
        bindings: { rotation: mul(sin(mul(A, Math.PI * 8)), 16) },
      };
      n.mask = { polygon, invert: true };
      nodes.push(tail);
    }
    if (layer.animation) {
      const poses = [
        layer,
        ...layer.animation.frames.map((f, i) => ({
          ...layer,
          ...f,
          id: `kino-pose-${i + 1}`,
        })),
      ];
      for (const pose of poses.slice(1))
        await image(pose.id, pose.src, { crop: pose.bounds, maxEdge: 512 });
      const frames = [];
      for (const step of layer.animation.steps) {
        const pose = poses[step.frame],
          asset = loaded.get(pose.id);
        frames.push({
          asset: pose.id,
          rect: [0, 0, asset.width, asset.height],
          x: pose.x * 10,
          y:
            pose.y * 15 -
            (step.lift / layer.animation.nativeWidth) * layer.w * 10,
          width: pose.w * 10,
          height: (pose.w * 10 * pose.bounds[3]) / pose.bounds[2],
          duration: step.duration,
          name: step.name,
        });
      }
      n.animation = {
        progress: mul(A, layer.animation.cycles),
        loop: true,
        frames,
      };
    }
    nodes.push(n);
    if (layer.id === "lake") {
      nodes.push({
        ...structuredClone(n),
        id: "water-highlight",
        brightness: 3,
        saturation: 1,
        blend: "screen",
        material: { kind: "water", sweep: 0.5, radius: 0.2, intensity: 0.15 },
        bindings: {
          "material.sweep": add(-0.35, mul(A, 1.7)),
          opacity: add(0.28, mul(sin(mul(A, Math.PI)), 0.22)),
        },
      });
      if (which === "night")
        for (const [i, burst] of nightLayers.filter((l) => l.bloom).entries()) {
          const [left, top, width, height] = [
            [0.58, 0.68, 0.23, 0.1],
            [0.36, 0.72, 0.19, 0.1],
            [0.77, 0.67, 0.12, 0.08],
          ][i];
          const reflection = await sharp(
            await readFile(path.join(dir, burst.src)),
          )
            .flip()
            .resize(Math.round(width * 1000), Math.round(height * 1500))
            .png()
            .toBuffer();
          const reflected = await sharp({
            create: {
              width: 1000,
              height: 1500,
              channels: 4,
              background: "#00000000",
            },
          })
            .composite([
              {
                input: reflection,
                left: Math.round(left * 1000),
                top: Math.round(top * 1500),
              },
            ])
            .png()
            .toBuffer();
          const lakeMask = await sharp(
            await readFile(path.join(dir, "lake.png")),
          )
            .resize(1000, 1500)
            .png()
            .toBuffer();
          const clipped = await sharp(reflected)
            .composite([{ input: lakeMask, blend: "dest-in" }])
            .webp({ quality: 94 })
            .toBuffer();
          await image(`reflection-${burst.id}`, "", { bytes: clipped });
          const bloom = smooth(...burst.bloom, A);
          nodes.push({
            id: `reflection-${burst.id}`,
            type: "image",
            asset: `reflection-${burst.id}`,
            x: -30,
            y: -45,
            width: 1060,
            height: 1590,
            parallax: [
              (((layer.depth - 0.42) * 30) / 430) * 1000,
              (((layer.depth - 0.42) * 30) / 430) * 1000 * 0.65,
            ],
            blend: "screen",
            bindings: {
              opacity: mul(bloom, 0.21 * 0.85),
              brightness: add(1, mul(sin(mul(Math.PI, bloom)), 0.6)),
            },
          });
        }
    }
    if (layer.id === "sky" && which === "night")
      for (const [index, star] of [
        [0.401, 0.071, 0.17],
        [0.278, 0.057, 0.39],
        [0.574, 0.098, 0.64],
        [0.846, 0.147, 0.84],
        [0.304, 0.238, 0.27],
        [0.77, 0.176, 0.52],
      ].entries()) {
        const intensity = smooth(0, 1, [
          "max",
          0,
          ["sub", 1, ["div", ["abs", ["sub", A, star[2]]], 0.105]],
        ]);
        nodes.push({
          ...structuredClone(n),
          id: `star-${index}`,
          material: {
            kind: "spot",
            center: star.slice(0, 2),
            radius: 0.022,
            intensity: 0,
          },
          bindings: { brightness: add(0.38, mul(intensity, 3.4)) },
        });
      }
    if (layer.id === "sky" && which === "day") {
      const light = [
        "exp",
        mul(-1, ["pow", ["div", ["sub", A, 0.68], 0.22], 2]),
      ];
      nodes.push({
        ...structuredClone(n),
        id: "sun-highlight",
        blend: "screen",
        material: {
          kind: "spot",
          center: day.sun.map((v) => v / 100),
          radius: 0.16,
          intensity: 1,
        },
        bindings: {
          opacity: add(0.15, mul(light, 0.75)),
          "material.intensity": add(0.2, mul(light, 2.6)),
        },
      });
    }
    if (layer.id === "girl") {
      const light = [
        "exp",
        mul(-1, ["pow", ["div", ["sub", A, 0.42], 0.08], 2]),
      ];
      nodes.push({
        ...structuredClone(n),
        id: "earring-glint",
        blend: "screen",
        material: {
          kind: "spot",
          center: day.glint.map((v) => v / 100),
          radius: 0.09,
          intensity: 1,
        },
        bindings: { opacity: light, "material.intensity": mul(light, 6) },
      });
    }
    if (layer.id === "flowers")
      nodes.push({
        ...structuredClone(n),
        id: "flower-highlight",
        blend: "screen",
        material: { kind: "water", radius: 0.13, intensity: 0.3 },
        bindings: {
          "material.sweep": add(-0.35, mul(A, 1.7)),
          opacity: add(0.15, mul(0.35, sin(mul(A, Math.PI)))),
        },
      });
  }
  const title = which === "night" ? "Under the Same Sky" : "Thinking of You";
  // Posters are a flattened composition of the approved layers, generated for fallback only.
  const composite = [];
  for (const node of nodes.filter(
    (n) =>
      n.type === "image" &&
      !n.material &&
      !n.mask &&
      !n.id.startsWith("petal-"),
  )) {
    const data = assets.get(loaded.get(node.asset).path);
    let layer = sharp(data);
    if (node.rect)
      layer = layer.extract({
        left: Math.floor(node.rect[0]),
        top: Math.floor(node.rect[1]),
        width: Math.floor(node.rect[2]),
        height: Math.floor(node.rect[3]),
      });
    if (node.scaleX === -1) layer = layer.flop();
    const width = Math.round(node.width * 0.5),
      height = Math.round(node.height * 0.5),
      left = Math.round(node.x * 0.5),
      top = Math.round(node.y * 0.5);
    layer = layer.resize(width, height);
    const clip = {
      left: Math.max(0, -left),
      top: Math.max(0, -top),
      width: Math.min(width, 500 - left) - Math.max(0, -left),
      height: Math.min(height, 750 - top) - Math.max(0, -top),
    };
    if (clip.width > 0 && clip.height > 0)
      composite.push({
        input: await layer.extract(clip).png().toBuffer(),
        left: Math.max(0, left),
        top: Math.max(0, top),
      });
  }
  const poster = await sharp({
    create: {
      width: 500,
      height: 750,
      channels: 4,
      background: palette[which],
    },
  })
    .composite(composite)
    .webp({ quality: 90 })
    .toBuffer();
  await image("poster-front", "", { bytes: poster, maxEdge: 750 });
  loaded.get("poster-front").role = "poster";
  await image("poster-back", "", { bytes: poster, maxEdge: 750 });
  loaded.get("poster-back").role = "poster";
  const manifest = {
    format: "digital-card",
    contractVersion: "0.1.0",
    id: `maple.companion.${which}`,
    revision: 1,
    title,
    summary: `A layered MapleStory companion card: ${title}.`,
    profile: "portable",
    canvas: { width: 1000, height: 1500 },
    faces: {
      front: {
        scene: "scenes/front.json",
        poster: "poster-front",
        description: title,
      },
      back: {
        scene: "scenes/back.json",
        poster: "poster-back",
        description: `${title} — card back`,
      },
    },
    assets: metadata,
    capabilities: {
      required: ["dc.scene2d@0.1", "dc.motion@0.1", "dc.materials@0.1"],
      optional: [],
    },
    quality: {
      poster: { maxEdge: 750 },
      lite: { maxEdge: 768 },
      standard: { maxEdge: 1536 },
      ultra: { maxEdge: 2048 },
    },
  };
  const front = {
      dialect: "dc.scene2d@0.1",
      background: palette[which],
      nodes,
    },
    back = {
      dialect: "dc.scene2d@0.1",
      nodes: [
        {
          id: "back",
          type: "image",
          asset: "poster-back",
          x: 0,
          y: 0,
          width: 1000,
          height: 1500,
        },
      ],
    };
  const pkg = await buildPackage(
    manifest,
    new Map([
      ["scenes/front.json", front],
      ["scenes/back.json", back],
    ]),
    assets,
  );
  await writeCompiled(pkg, {
    out: path.join(out, which),
    archivePath: path.join(out, `${which}.dcard`),
  });
  await writeFile(
    path.join(out, `${which}-report.json`),
    JSON.stringify(buildReport(pkg), null, 2),
  );
  return {
    id: manifest.id,
    title,
    digest: pkg.digest,
    assets: metadata.length,
    nodes: nodes.length,
    bytes: pkg.archive.length,
  };
}
await mkdir(out, { recursive: true });
const reports = [];
for (const which of ["night", "day"]) reports.push(await migrate(which));
await writeFile(path.join(out, "cards.json"), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
