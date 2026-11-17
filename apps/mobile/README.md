# BakeU App

Android/iOS ilovasi saytning **aynan o‘sha `src/main.jsx` kirish nuqtasini** yig‘adi.
Bosh sahifa, pushti qishki dizayn, qor, snowman, mahsulotlar, savat, profil,
buyurtmalar, chat, xarita, yordamchi, tarjimalar va admin bo‘limlari umumiy
koddan ishlaydi. Bu iframe yoki masofadagi Vercel sahifasini ochadigan qobiq emas:
web kod, rasmlar, musiqa va shriftlar ilova ichiga joylanadi.

## Ishga tushirish

Node.js 24+ kerak. Repozitoriy ildizidan:

```sh
npm ci
npm run app:install
npm run app:dev
```

App web ko‘rinishi 4300-portda ishlaydi. Saytning `npm run dev` buyrug‘i alohida.

```sh
npm run app:check
npm run app:parity
npm run app:sync
```

`app:parity` sayt va app yig‘ilishlaridagi har bir umumiy modul hamda `public/`
faylini SHA-256 orqali solishtiradi. Natijalar `dist/migration-manifest.json`da.
Saytdagi sahifalarni alohida ko‘chirib, eskiradigan ikkinchi nusxa yaratilmaydi.

## Android / iPhone

```sh
npm run app:android
npm run app:ios
```

Android uchun to‘liq JDK 21, Android Studio, Android SDK 36 va tegishli SDK
litsenziyalari kerak. SDK yo‘li Android Studio yaratadigan
`apps/mobile/android/local.properties` orqali yoki `ANDROID_HOME` bilan beriladi.
`local.properties` Git’ga kiritilmaydi.

```sh
cd apps/mobile/android
./gradlew assembleDebug
```

iOS uchun Mac va Xcode kerak. `apps/mobile/ios/App/App.xcodeproj`ni ochib,
Signing & Capabilities’da o‘zingizning Apple Team’ingizni tanlang. Native
loyihalar Swift Package Manager’dan foydalanadi. Ilova ID: `uz.bakeu.mobile`.
Bu repo signing kalitlari yoki App Store hisobini o‘z ichiga olmaydi.

Kod o‘zgarsa, native loyiha ochilishidan oldin `npm run app:sync`ni bajaring.
Logo asosidagi ikonka va splash’larni yangilash: `npm --prefix apps/mobile run assets`.

## Native imkoniyatlar

- Android orqaga tugmasi sahifaga qaytadi; bosh sahifada ilovani minimallashtiradi.
- `bakeu://open/#/product/cake` kabi qo‘llangan deep link’lar ishlatiladi.
- Tashqi HTTP(S) havolalar native brauzerda ochiladi; telefon/SMS havolalari OS’ga uzatiladi.
- GPS faqat mavjud xarita/do‘kon joylashuvi amali chaqirilganda so‘raladi.
- Clipboard va ulashish OS pluginlari orqali ishlaydi. Ulashiladigan do‘kon
  havolasi xususiy `localhost` emas, sozlangan ochiq saytga yo‘naltiriladi.
- Klaviatura ochilganda pastki panel yashirinadi; forma ichini aylantirish mumkin.
- Ilova fonga o‘tganda musiqa pauzaga qo‘yiladi; qaytganda avtomatik yoqilmaydi.
- WKWebView’da SubtleCrypto bo‘lmasa, mavjud lokal akkauntlar uchun xuddi shu
  210000 iteratsiyali PBKDF2-SHA256 ishlatiladi. Parol ochiq matnda saqlanmaydi.

## API va ma’lumotlar

Birinchi ishga tushishda UZ tanlanadi; keyingi UZ/RU tanlovlari saqlanadi.
Sayt va native ilova turli origin’larga ega: bir brauzerdagi demo akkaunt,
savat yoki demo admin yozuvlari telefonga avtomatik ko‘chmaydi.

Haqiqiy server akkauntlari uchun `apps/mobile/.env.local`da **ochiq HTTPS API URL**
`VITE_ACCOUNT_API_URL=https://YOUR-API/api` qilib beriladi. `/api` kabi nisbiy
URL native yig‘ilishda qabul qilinmaydi. `VITE_PUBLIC_SITE_URL` ulashish uchun
haqiqiy sayt manzilidir. Namunani `.env.example`dan oling; mavjud faylni bosmang.
Backend CORS ro‘yxatiga aniq `https://localhost` va `capacitor://localhost`
origin’larini qo‘shing. Bu sozlama autentifikatsiyani chetlab o‘tmaydi.

`BOT_TOKEN`, signing kalitlari va boshqa maxfiy qiymatlar frontendga kiritilmaydi.
Serverli admin sahifasi (`/admin/telegram`) haqiqiy tekshirilgan Telegram
administrator sessiyasini talab qilishda davom etadi. Oddiy `/admin` saytning
mavjud lokal demo paneli sifatida ochiladi.

## Tekshiruv chegaralari

Ko‘chirish mavjud sayt funksiyalarining o‘zidir. Saytdagi lokal demo katalog,
buyurtmalar, chat va admin ma’lumotlari ham shu holatda qoladi. Yordamchining
mavjud demo javoblari real AI serveriga aylantirilmagan. To‘lov provayderi,
push, umumiy marketplace bazasi va real Telegram kirishi alohida xizmat/sozlama
bo‘lmasa ishlaydi deb ko‘rsatilmaydi. Xarita plitkalari va tashqi xizmatlar internet
ulanishini talab qiladi.

Web testlari, manba/resurs tengligi va `cap sync` — APK/IPA yoki haqiqiy telefon
sinovining o‘rnini bosmaydi. Platforma bo‘yicha yig‘ilish va qurilma sinovi
release oldidan tegishli SDK/Xcode muhitida bajarilishi kerak.

Papka xaritasi: [docs/STRUCTURE.md](docs/STRUCTURE.md).
