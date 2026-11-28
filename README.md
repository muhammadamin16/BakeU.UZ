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

**Backend ulanmaguncha** haqiqiy katalog, ro‘yxatdan o‘tish, chat, buyurtmalar
va Admin ma’lumotlari ishlamaydi. Sayt ulanish yo‘qligini ko‘rsatadi; demo
ma’lumotlar haqiqiy hisob sifatida chiqarilmaydi. Admin ruxsati keyinchalik
Backend orqali tekshiriladi.

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
VITE_API_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:38119
```

`38119` faqat namuna — Backend’ning haqiqiy portini yozing. Telegram Mini App
uchun alohida Bot API kerak bo‘lsa, `VITE_MINIAPP_PROXY_TARGET` ni ham belgilang.
Bu sozlamalar **faqat proxy manzilini tanlaydi**, Backend yoki Bot’ni ishga tushirmaydi.
Backend’da saytning aniq Origin manziliga ruxsat bering va Vite’ni qayta oching.
`preview` faqat statik interfeysni ko‘rsatadi; API bilan ishlash uchun `dev` proxy’si
yoki keyinchalik alohida hosting sozlamasi kerak.

`.env.local`, tokenlar, `node_modules/` va `dist/` ni Git’ga qo‘shmang.
