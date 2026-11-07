# titaniun_finance_frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Vercel deployment

Use this project directory as the Vercel Root Directory, with the Vite preset,
`npm run build` as the build command, and `dist` as the output directory.

Leave `VITE_API_BASE_URL` unset (it defaults to `/api/v1`) or set it to `/api/v1`
in the Vercel environment settings. `vercel.json` forwards `/api/*` requests to
`https://tfc-bizapi.titaniumfinancialconsultancy.com/api/*` before the Vue router
fallback. For example, `/api/v1/login` is forwarded to the backend's
`/api/v1/login`. The browser's Network tab will still show the frontend domain
because the forwarding happens on Vercel.

The local `.env` is ignored by Git, and `VITE_BACKEND_URL` controls only Vite's
development server proxy. It does not configure production routing. Change
the API destination in `vercel.json` when changing the deployed backend.
Redeploy after changing this configuration or Vercel environment variables.
