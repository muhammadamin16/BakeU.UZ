# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Local development port

Run `npm install` and `npm run dev`, then open the **Local** address printed by
Vite. The usual port is **5173** again: `http://127.0.0.1:5173/`.
The demo admin is at the same address followed by `#/admin`.

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
