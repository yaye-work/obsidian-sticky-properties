import esbuild from "esbuild";

const prod = process.argv.includes("production");

const banner = `/*
This file is bundled by esbuild. Do not edit directly.
Source: https://github.com/yaye-work/obsidian-sticky-properties
*/`;

const context = await esbuild.context({
  entryPoints: ["src/main.js"],
  bundle: true,
  // Provided by Obsidian's runtime — never bundle these.
  external: [
    "obsidian",
    "electron",
    "@codemirror/*",
    "@lezer/*",
    "node:*",
  ],
  format: "cjs",
  target: "es2018",
  platform: "browser",
  treeShaking: true,
  sourcemap: prod ? false : "inline",
  minify: false,
  banner: { js: banner },
  outfile: "main.js",
  logLevel: "info",
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
