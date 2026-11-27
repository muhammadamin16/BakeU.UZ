# BakeU LOCAL TEST — Windows PowerShell

## 1. Тайёрлаш

Windows’да **Node.js 24 LTS**, Git ва **Docker Desktop** керак. Docker Desktop’ни ишга туширинг ва Linux containers / WSL 2 режимидан фойдаланинг. Chrome ёки Edge’да сайтни `localhost` орқали очинг. PowerShell’да `npm.cmd` Windows script execution policy’сини ўзгартиришни талаб қилмайди.

```powershell
node --version
docker info
docker compose version
```

Иккала репозиторий битта папка ичида ёнма-ён туриши керак. Янги checkout учун ушбу командаларни танланган иш папкасидан бажаринг. Мавжуд checkout бўлса, ўша папкалардан фойдаланинг ва уларда `codex/node-marketplace-full-20261127` веткасини текширинг.

```powershell
git clone --branch codex/node-marketplace-full-20261127 https://github.com/muhammadamin16/BakeU-Backend.git
git clone --branch codex/node-marketplace-full-20261127 https://github.com/muhammadamin16/BakeU.UZ.git
Set-Location .\BakeU-Backend
npm.cmd ci
Set-Location ..\BakeU.UZ
npm.cmd ci
```

## 2. Локал запуск

`BakeU.UZ` root’идан:

```powershell
npm.cmd run local:start -- --seed
```

Биринчи запуск Docker image’ни олиши мумкин. Охирида терминалда `LOCAL TEST` ва адреслар чиқади. Бу терминални очиқ қолдиринг.

| Нима | Манзил |
| --- | --- |
| Website | `http://localhost:38118/` |
| Admin | `http://localhost:38118/#/admin` |
| Login | `http://localhost:38118/#/login` |
| Website health | `http://localhost:38118/healthz` |
| Backend readiness | `http://127.0.0.1:38119/readyz` |

Website браузернинг `/api` сўровларини локал Backend’га узатади. Шу proxy оддий HTTP, multipart фото upload ва Socket.IO polling’ни ташийди. Сақланувчи сессия cookie’си учун браузерда ҳужжатдаги **localhost** манзилини ишлатинг. Backend ва MongoDB loopback’га боғланган. Уланиш параметрлари launcher’да маҳаллий муҳит учун белгиланган.

`--seed` алоҳида `bakeu_laptop_test` базасида 1 admin, 2 buyer, 2 seller, 2 дўкон, 3 тадан фотоли 2 товар ва 5 хил статусдаги буюртмани тайёрлайди. Admin тариф, pending обуна, шикоят ва билдиришнома ёзувларини ҳам кўради. Seed мавжуд fixture’лардан фойдаланади ва фақат етишмаган ёзувларни қўшади. Локал таҳрирлар сақланади.

## 3. Admin’га кириш

1. `http://localhost:38118/#/login` ни очинг ва `+998000000001` ни киритинг.
2. Код сўраш тугмасини босинг. **LOCAL TEST · Challenge ID** майдонидан ID’ни нусхаланг.
3. Иккинчи PowerShell ойнасида `BakeU.UZ` папкасига ўтиб, ID’ни қўйинг:

   ```powershell
   npm.cmd run local:proof -- PASTE_CHALLENGE_ID_HERE
   ```

4. Чиққан бир марталик кодни браузерга киритинг ва тасдиқланг. Сўнг `http://localhost:38118/#/admin` ни очинг. Reload сессияни сақлайди.

| Локал fixture | Телефон |
| --- | --- |
| Admin | `+998000000001` |
| Buyer One / Two | `+998000000002`, `+998000000003` |
| Seller One / Two | `+998000000004`, `+998000000005` |

Proof helper локал fixture актёри номидан одатдаги ҳимояланган contact API’га мурожаат қилади. Backend кодни яратади ва одатдаги verify API орқали текширади. Бу **Telegram proof симуляцияси**. Ҳақиқий Bot, токен ёки Telegram хабарлари ишлатилмайди. Пароль йўқ. Кодни фақат шу браузер сеансида ишлатинг.

## 4. Тўхтатиш ва давом этиш

1. Запуск терминалида **Ctrl+C** Website ва Backend’ни тўхтатади.
2. `BakeU.UZ` root’идан MongoDB контейнерини тўхтатинг:

   ```powershell
   npm.cmd run local:stop
   ```

3. Кейин `BakeU.UZ` root’идан сақланган маълумотлар билан давом этинг:

   ```powershell
   npm.cmd run local:start
   ```

`local:stop` Docker volume’ларни сақлайди. Сессияларни тиклаш учун браузер cookie’сини ва `BakeU.UZ/.bakeu-local/keys.json` файлини сақланг. Бу файл ҳар бир checkout учун тасодифий яратилади ва Git’га кирмайди. Етишмаган fixture’ларни қўшиш учун запускни тўхтатиб, `--seed` билан қайта ишга туширинг.

Агар порт банд бўлса, `37117`, `38118` ёки `38119` ни қайси жараён ишлатаётганини текширинг. MongoDB контейнер ҳолатини `BakeU.UZ` root’идан `docker compose -f compose.local.yaml ps` орқали кўринг.
