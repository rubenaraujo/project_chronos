import { build } from 'esbuild';
import { minify } from 'html-minifier-terser';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const write = (path, data) => writeFile(new URL(`../${path}`, import.meta.url), data);

await build({
    entryPoints: ['src/main.js'],
    outfile: 'script.min.js',
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
});
await build({
    entryPoints: ['css/main.css'],
    outfile: 'style.min.css',
    bundle: true,
    minify: true,
});

const hash = async (paths) =>
    createHash('sha256')
        .update(
            Buffer.concat(await Promise.all(paths.map((p) => readFile(new URL(`../${p}`, import.meta.url))))),
        )
        .digest('hex')
        .slice(0, 10);

const version = await hash(['script.min.js', 'style.min.css', 'src/index.html', 'manifest.json']);

let html = await read('src/index.html');
html = html
    .replace('href="style.min.css"', `href="style.min.css?v=${version}"`)
    .replace('src="script.min.js"', `src="script.min.js?v=${version}"`);
html = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    minifyCSS: true,
});
await write('index.html', html);

const assets = [
    './',
    './index.html',
    `./style.min.css?v=${version}`,
    `./script.min.js?v=${version}`,
    './manifest.json',
    './favicon-16x16.png',
    './favicon-24x24.png',
    './apple-touch-icon.png',
    './android-chrome-128x128.png',
    './android-chrome-256x256.png',
    './maskable-icon-192.png',
    './maskable-icon-512.png',
    './website-icons/mark.png',
    './website-icons/logo-with-text-no-bg-24.png',
];
const sw = (await read('src/sw.js'))
    .replaceAll('__VERSION__', version)
    .replace('__ASSETS__', JSON.stringify(assets, null, 4));
await write('sw.js', sw);

console.log(`built version ${version}`);
