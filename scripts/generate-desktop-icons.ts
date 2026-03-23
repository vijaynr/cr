#!/usr/bin/env bun
/**
 * Generate desktop icon assets from the CR brand SVG.
 * Usage: bun scripts/generate-desktop-icons.ts
 *
 * Produces packages/desktop/icon.iconset/ with all required sizes.
 * Produces packages/desktop/icon.png and packages/desktop/icon.ico for
 * Linux/Windows builds, and on macOS also runs iconutil to create icon.icns.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";
import crAppIconSvg from "../packages/web/src/assets/cr-app-icon.svg" with { type: "text" };

const ICONSET_DIR = join(import.meta.dir, "..", "packages", "desktop", "icon.iconset");
const ICNS_PATH = join(import.meta.dir, "..", "packages", "desktop", "icon.icns");
const PNG_PATH = join(import.meta.dir, "..", "packages", "desktop", "icon.png");
const ICO_PATH = join(import.meta.dir, "..", "packages", "desktop", "icon.ico");

// macOS .iconset requires these exact filenames
const SIZES: Array<{ name: string; size: number }> = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

if (!existsSync(ICONSET_DIR)) {
  mkdirSync(ICONSET_DIR, { recursive: true });
}

console.log("Generating icon PNGs...");

for (const { name, size } of SIZES) {
  const resvg = new Resvg(crAppIconSvg, {
    fitTo: { mode: "width", value: size },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  const outPath = join(ICONSET_DIR, name);
  writeFileSync(outPath, png);
  console.log(`  ${name} (${size}x${size})`);
}

// Also write a standalone 512px PNG for linux/general use
const resvg512 = new Resvg(crAppIconSvg, { fitTo: { mode: "width", value: 512 } });
const png512 = resvg512.render().asPng();
writeFileSync(PNG_PATH, png512);
console.log("  icon.png (512x512)");

// Windows expects a real .ico payload with multiple embedded sizes.
const icoSources = [
  join(ICONSET_DIR, "icon_16x16.png"),
  join(ICONSET_DIR, "icon_32x32.png"),
  join(ICONSET_DIR, "icon_128x128.png"),
  join(ICONSET_DIR, "icon_256x256.png"),
];
const ico = await pngToIco(icoSources);
writeFileSync(ICO_PATH, new Uint8Array(ico));
console.log("  icon.ico (16/32/128/256 multi-size)");

// Run iconutil on macOS to create .icns
if (process.platform === "darwin") {
  console.log("Creating icon.icns...");
  const result = Bun.spawnSync(["iconutil", "-c", "icns", ICONSET_DIR, "-o", ICNS_PATH]);
  if (result.exitCode === 0) {
    console.log("  icon.icns ✓");
  } else {
    console.error("  iconutil failed:", result.stderr.toString());
  }
}

console.log("Done.");
