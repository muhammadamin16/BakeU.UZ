# BakeU botni ishga tushirish

Node.js 24 LTS kerak. Bot tokenini chatga yoki GitHub kodiga yozmang.

## 1. Fayllarni olish

BakeU.UZ loyihasining PowerShell terminalida:

```powershell
git switch Amin
git pull origin Amin
npm install
```

## 2. Sozlamalar

Quyidagi nusxa olish buyruqlarini faqat fayllar hali yo'q bo'lsa bajaring. Oldindan mavjud sozlamalarni ustidan yozmang.

```powershell
Copy-Item src/bot/.env.example src/bot/.env
Copy-Item .env.example .env.local
notepad src/bot/.env
```

`src/bot/.env` ichida to'ldiring:

- `BOT_TOKEN`: BotFather bergan token.
- `ADMIN_IDS`: shaxsiy Telegram raqamli ID. `@username` emas. Bir nechta admin bo'lsa vergul bilan yoziladi.
- `SITE_URL`: foydalanuvchilar ochadigan haqiqiy sayt havolasi.
- `TELEGRAM_URL`: kanal havolasi.
- `INSTAGRAM_URL`: Instagram sahifasi.
- `SUPPORT_EMAIL`: haqiqiy pochta manzili.

Root `.env.local` ichida `VITE_ACCOUNT_API_URL=/api` bo'lsin. Sayt registratsiyasi shunda serverga ulanadi. API portini dastlab `3001` holida qoldiring.

## 3. Bot va saytni yoqish

Birinchi terminal:

```powershell
npm run bot:check
npm run bot
```

Ikkinchi terminal:

```powershell
npm run dev
```

Telegram'da botingizga `/start`, keyin `/admin` yuboring. Barcha adminlar avval `/start` yuborishi shart.

Saytda `http://localhost:5173/#/register` orqali yangi akkaunt oching. Bot adminiga xabar keladi. Sotuvchi ro'yxatdan o'tsa, do'kon arizasi ham keladi. Uni tasdiqlash yoki sabab yozib rad etish mumkin. Natija sotuvchining sayt profilida ko'rinadi.

Botdagi foydalanuvchi tugmalari: sayt, Telegram, Instagram, email, yordam va BakeU haqida. Yordamga yozilgan xabarga admin botning o'zida javob bera oladi.

## Muhim chegaralar

- Token va server ishlamasdan haqiqiy Telegram xabarini tekshirib bo'lmaydi.
- Oldingi lokal demo akkauntlar serverga ko'chirilmaydi. Tekshirish uchun yangi server akkaunt yarating.
- Bot bazasi haqiqiy server akkauntlari va arizalarni saqlaydi. Saytdagi mavjud admin, mahsulot, to'lov, buyurtma va chatning lokal bazalari bilan to'liq sinxronlashtirish bu o'zgarishga kirmaydi.
- Saytni Telegram foydalanuvchilari ochishi uchun u haqiqiy HTTPS manzilda joylashtirilgan bo'lishi kerak. `localhost` boshqa foydalanuvchilarda ochilmaydi.
- Bot noutbuk o'chsa to'xtaydi. Doimiy ishlashi uchun VPS kerak. VPS uchun yo'riqnoma `README.md` va `deploy/` ichida.
- Bir tokenni bir vaqtning o'zida ikki joyda ishga tushirmang.

## Bot ishga tushmasa

```powershell
git pull origin Amin
npm run bot:check
npm run bot
```

- `bot:check` Telegram'ga ulanmasdan sozlamalar va SQLite'ni tekshiradi.
- `TELEGRAM_URL` / `INSTAGRAM_URL`: `@username` emas, to'liq `https://...` havola yozing yoki hozircha bo'sh qoldiring.
- `SUPPORT_EMAIL`: haqiqiy email yozing yoki bo'sh qoldiring.
- `ETIMEDOUT` / `ENETUNREACH`: kompyuterdan Telegram API'ga ulanish muammosi.
- `ENOTFOUND`: DNS muammosi.
- `401` / `404`: BotFather tokenini tekshiring.
- `409`: shu token bilan boshqa bot nusxasi ishlayapti.
- Port bandligi: oldingi bot jarayonini to'xtating.

Yordam so'raganda faqat terminaldagi xato xabarini yuboring. `.env` faylini yoki tokenni yubormang.

## Telegram Mini App

Yangi kodni saytga ham deploy qilish kerak — faqat kompyuterda `git pull` yetarli emas.

Bot `.env` faylida:

```dotenv
SITE_URL=https://www.bakeu.uz
USE_WEB_APP=true
```

Botni qayta yoqing va `/start` bosing. Telegram menyusida ham «BakeU · Магазин» tugmasi paydo bo'ladi. Birinchi ekranda qishki BakeU logotipi va «Magazinga kirish» bor. Kompyuterdagi ko'rinish: `http://localhost:5173/#/miniapp`. Mini App ichidan katalog, savat, profil va qolgan mavjud sahifalar ochiladi. Admin kirishi faqat server tasdiqlagan `ADMIN_IDS` egalariga ko'rinadi. `/admin/telegram` haqiqiy server akkauntlari va arizalarini ko'rsatadi.

Vercel + VPS uchun to'liq yo'riqnoma: `src/miniapp/README.md`. Oddiy Vercel static deploy Node.js bot yoki SQLite serverini ishga tushirmaydi. API doimiy HTTPS serverda ishlashi shart. Telegram hisobi tasdiqlanishi saytning email/telefon akkaunti avtomatik yaratilganini anglatmaydi; sayt akkauntini odatdagi registratsiya orqali ochish mumkin.
