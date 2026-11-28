# BakeU Frontend

React + Vite: website, Admin interfeysi va Telegram Mini App interfeysi.
Hozir bu loyiha faqat frontend. Backend, Bot serveri va baza bu yerda yo‘q.

## Noutbukda ochish

Node.js 24 yoki yangirog‘ini o‘rnating. Shu papkada PowerShell oching:

```powershell
npm.cmd ci
npm.cmd run dev
```

Terminaldagi **Local** manzilni oching. Odatda `http://localhost:5173/`.
Windows portni band qilgan yoki bloklagan bo‘lsa, bo‘sh port avtomatik tanlanadi.

Admin interfeysiga to‘g‘ridan-to‘g‘ri o‘tish:

```powershell
npm.cmd run dev:admin
```

`npm.cmd start` ham frontendni Vite orqali ochadi. Docker, Railway yoki lokal
MongoDB o‘rnatish shart emas. `.env.local` yaratmasdan ham frontend ochiladi.

Standart rejim — **frontend preview**. Namunaviy mahsulotlar va do‘konlar
ko‘rinadi; katalog, qidiruv, filtr, mahsulot sahifasi, rasmlar, savat va
izbrannoye interfeyslarini tekshirish mumkin. Savat va izbrannoye shu brauzerda
saqlanadi. Yuqorida `Frontend demo` belgisi bor.

Admin’da namunaviy jadvallar va qidiruv bor. Bu faqat ko‘rinish maketi, haqiqiy
Admin huquqi emas. Login/registratsiya telefon formalarini ko‘rsatadi va
ma’lumotlarni tekshiradi, lekin kod yubormaydi, telefonni tasdiqlamaydi va
akkaunt yaratmaydi. Haqiqiy chat, buyurtma yuborish, autentifikatsiya va Admin
amallarini Backend bosqichida ulaymiz.

Preview ma’lumotlari `bakeu-preview-*` kalitlarida saqlanadi. Avvalgi savat,
izbrannoye, akkauntlar va saqlangan sessiyalar o‘chirilmaydi yoki preview’ga
ko‘chirilmaydi. Telegram ichida ham preview ishga tushadi, API chaqirilmaydi.
Eski `.env.local` da API manzili qolgan bo‘lsa ham, standart frontend rejimi
unga ulanmaydi.

## Papkalar

- `src/` — sahifalar, Admin, komponentlar, API mijozlari va brauzer holati.
- `public/` — sayt rasmlari, logotiplar va musiqa.
- `scripts/dev-port.js` — Windows’dagi `EACCES` va band portlar uchun Vite yordamchisi.
- `scripts/dev-port.test.js` — shu yordamchining testlari.
- `vite.config.js` — frontend development va build sozlamalari.

`docs/`, `.github/`, Docker/Railway hosting fayllari va static hosting skripti
kerak bo‘lmagani uchun olib tashlangan. GitHub’ga kod yuborish uchun `.github/`
papkasi talab qilinmaydi. `node_modules/` npm orqali yaratiladi va Git’ga yuborilmaydi.

## Tekshirish va build

```powershell
npm.cmd run check
```

Frontend testlari, lint va build bajariladi. Tayyor statik fayllar `dist/` ga
chiqadi. Build’ni noutbukda ko‘rish uchun `npm.cmd run preview` ishlating.

## Backend’ni keyin ulash

API mijozlari saqlangan. Backend tayyor bo‘lgach, `.env.example` dan yangi
`.env.local` yarating yoki mavjud sozlamalarni yangilang:

```dotenv
VITE_APP_MODE=server
VITE_API_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:38119
```

`38119` faqat namuna — Backend’ning haqiqiy portini yozing. Telegram Mini App
uchun alohida Bot API kerak bo‘lsa, `VITE_MINIAPP_PROXY_TARGET` ni ham belgilang.
Bu sozlamalar **faqat proxy manzilini tanlaydi**, Backend yoki Bot’ni ishga tushirmaydi.
Backend’da saytning aniq Origin manziliga ruxsat bering va Vite’ni qayta oching.
Server rejimida namuna katalog/Admin ishlatilmaydi: Backend javob bermasa
xato ko‘rsatiladi, demo ma’lumotlarga avtomatik qaytmaydi. Preview’ga qaytish
uchun `VITE_APP_MODE=frontend` belgilang va Vite’ni qayta oching.
`preview` faqat statik interfeysni ko‘rsatadi; API bilan ishlash uchun `dev` proxy’si
yoki keyinchalik alohida hosting sozlamasi kerak.

`.env.local`, tokenlar, `node_modules/` va `dist/` ni Git’ga qo‘shmang.
