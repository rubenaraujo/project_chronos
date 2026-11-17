# Project Chronos

Project Chronos is a simple web page that displays the next trains arriving into specific stations.

## Technologies

This project was built using HTML, CSS, and JavaScript.

## Usage

Serve the repo root with any static server (ES modules don't load from `file://`), e.g. `npx serve .`.

### Development

Source lives in `src/` (JS modules, `index.html`, `sw.js`) and `css/` (tokens, base, layout, list, states, sheet, mobile, motion). The deployed files (`index.html`, `sw.js`, `script.min.js`, `style.min.css`) are generated; don't edit them.

```
npm install
npm run check   # lint + tests + build
```

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run format`. The build bundles and minifies JS/CSS, minifies the HTML and generates the service worker with a content hash, so each release invalidates the cache automatically. CI runs the same steps and commits the generated files.

### Styling

This project uses a modern, minimalist design with a black and white color scheme. The table is fully responsive and will adapt to different screen sizes.

## Try it

https://rubenaraujo.github.io/project_chronos

## Credits

This project was created by Ruben Araujo for personal use. It uses the infraestruturasdeportugal.pt API.
