# Preact Devtools

**!!! HIGHLY EXPERIMENTAL, NOT READY FOR GENERAL USE!!!**

Browser extension that allows you to inspect a Preact component hierarchy, including props and state.

Download for:

- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/preact-devtools/)
- [Chrome](https://chrome.google.com/webstore/detail/preact-developer-tools/ilcajpmogmhpliinlbcdebhbcanbghmd)

![Screenshot of Preact devtools](media/preact-chrome-light.png)

- Use `npm run dev` to start a demo page
- Use `npm run watch` to rebuild all extensions on any code changes
- Use `npm run build:firefox` or `npm run build:chrome` to create a release build

Chrome:

1. Go to extensions page
2. Enable developer mode
3. Click "Load unpacked"
4. Select `dist/chrome/` folder

Firefox:

1. Go to addons page
2. Click the settings icon
3. Select "Debug addons"
4. Click "Load temporary addon"
5. Select the `manifest.json` in `dist/firefox/`

## Embedding devtools directly into a page (highly experimental)

`preact-devtools` supports an inline build target, where the devtools
can be embedded into any page without any restrictions like rendering
it into `iframe`s. Don't forget to include the css file too.

```js
import "preact-devtools/dist/preact-devtools.css";
import { attach, createRenderer, renderDevtools } from "preact-devtools";
import { options } from "preact";

// Instantiate devtools backend and attach it to preact
// - store -> The backing store for the devtools
// - destroy -> unlisten and restore previous `preact.options`
const { store, destroy } = attach(options, createRenderer);

// Render the actual devtools into the specified DOM node
renderDevtools(store, document.getElementById("devtools"));
```
