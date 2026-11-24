# React + Vite

Marketplace P0: [changes, API contract, tests and manual Railway staging steps](docs/production/MARKETPLACE_P0.md).
Use the matching `codex/marketplace-p0-20261124` branch in BakeU.UZ and BakeU-Backend;
no merge or deploy is automatic.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Local development port

Run `npm install` and `npm run dev`, then open the **Local** address printed by
Vite. The usual port is **5173** again: `http://127.0.0.1:5173/`.
The demo admin is at the same address followed by `#/admin`.
Vite also prints a separate **Admin** link with the actual selected port.
To start directly in the admin instead of the storefront, use:

```sh
npm run dev:admin
```

This opens the demo admin in the default browser. `npm run dev` continues to
serve the storefront. Plain `/admin` and `/admin/products/...` URLs are converted
to their `/#/admin...` equivalents before routing when the host serves the SPA
entry point (as the Vite development server does). Explicit hash routes and
Telegram launch parameters are preserved. `/#/admin/telegram` still requires
verified server admin access.

To choose your own port on Windows or Mac, create or edit **`.env.local`** in the
repository root (beside `package.json`) and add:

```dotenv
VITE_DEV_PORT=8080
```

Keep any existing lines in that file. Stop the dev server with Ctrl+C and run
`npm run dev` again. The example opens `http://127.0.0.1:8080/#/admin` when 8080
is available. `.env.local` is personal and is not committed to Git.

For a one-time override:

```sh
npm run dev -- --port 5173
```

If Windows reserves the requested port, or another server occupies it, the dev
server reports the reason and chooses an available port, starting with 3000.
Automatic fallback skips 3001 because the bot/account API uses it. Always use
the actual **Local** address printed by the terminal. To require an exact port
and fail instead of falling back, add `--strictPort`.

Changing the frontend port does not change the API port, public Vercel address
or Telegram configuration. If you test server accounts locally, add the selected
frontend origin to `ALLOWED_ORIGINS` in your private `src/bot/.env`, preserving
existing origins, and restart the API. The independent browser demo needs no API.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## BakeU App — Android / iOS

The complete website is also bundled as a Capacitor application in
[apps/mobile/](apps/mobile/README.md). It uses the same `src/main.jsx`, pages,
admin routes, translations, state, CSS and `public/` assets. There are no separate
placeholder screens to keep in sync. Server-only bot code stays outside the app.

From the repository root, with Node.js 24+:

```sh
npm ci
npm run app:install
npm run app:dev
```

The app development server uses port 4300; the website keeps its existing port.

```sh
npm run app:check
npm run app:parity
npm run app:sync
npm run app:android
npm run app:ios
```

`app:parity` compares every bundled website module and public asset by SHA-256.
Android requires a full JDK 21, Android Studio and Android SDK 36. iOS requires
macOS and Xcode. Native builds and phone tests are separate from the web build
and Capacitor sync. See the mobile README for API origins, existing demo-mode
limits, secure configuration and the complete folder map.

## Phone-only Go accounts

The coordinated buyer/seller registration, Telegram own-contact proof, required seller map point and staging verification are documented in [PHONE_ONLY_AUTH.md](docs/production/PHONE_ONLY_AUTH.md). Enable flags only with the matching backend/index plan after review; no deployment is automatic.
