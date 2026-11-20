# Validation results

Checked in the isolated `codex/telegram-orders` checkout on 2026-11-20.

| Check | Result |
| --- | --- |
| `npm run bot:test` | 46 passed, 0 failed; includes existing auth/admin/support/Mini App regressions and 13 new Telegram-order test groups |
| Scoped ESLint command in README | Passed for new modules and touched bot integration files |
| `git diff --check` | Passed |
| `npm run build` | Passed; existing Vite warning about an application chunk over 500 kB |
| Separate Vite library build of all five new JSX components | Passed, including Leaflet dependencies; the normal app build does not yet import the isolated components |
| Headless Chromium runtime with a test-only Go transport | Passed the cases listed below |

Browser checks exercised a seller's status mutation and authoritative reload, persisted-inbox rendering, previous-user data disappearing while a new session request is pending, GPS not requested on load, explicit map opening, delayed GPS preserving newly typed address, delayed GPS ignored after switching to pickup, and link confirmation remaining pending until the backend response confirms it. No real tile requests were sent: map tiles were intercepted in this test.

The temporary browser harness used the environment's Playwright/Chromium, was removed after the check, and is not a production/demo route. The repeatable unit/HTTP tests are committed in `src/bot/tests/telegramOrders.test.js`; their fake data/transports are confined to tests.

No real bot token, live Telegram send, authenticated shared Go backend, Mongo transaction/restart persistence or production end-to-end checkout was tested. Those checks require the backend contracts and website mounting listed in the handoff. Simulated handler recreation and ACK retries do not prove Mongo durability. The Go checkout was read-only, and the separate original website checkout's pre-existing winter edits were preserved.
