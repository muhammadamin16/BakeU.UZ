# Papkalar va barcha sahifalar

```text
BakeU.UZ/
├── package.json                 # sayt va app:* ishga tushirish buyruqlari
├── public/                      # aynan shu rasmlar, logolar, musiqa
├── src/
│   ├── App.jsx                  # umumiy ilova
│   ├── main.jsx                 # sayt/app uchun umumiy React kirish nuqtasi
│   ├── routes/AppRoutes.jsx     # barcha asosiy sahifalar
│   ├── pages/                   # Home, Auth, Product, Cart, Checkout, Orders,
│   │                            # Favorites, Map, AiAssistant, Messages,
│   │                            # Profile (xaridor/sotuvchi), Seller
│   ├── components/              # header, nav, footer, qor, audio va boshqalar
│   ├── admin/                   # dashboard, xaridor/sotuvchi, do‘kon/ariza,
│   │                            # mahsulot/buyurtma/obuna, tarix/sozlamalar
│   ├── miniapp/                 # Mini App, Telegram server admin himoyasi
│   ├── store/                   # mavjud savat, profil, chat, buyurtma holati
│   ├── locales/                 # UZ/RU
│   ├── platform/device.js       # brauzer/native API adapteri
│   └── bot/                     # server + frontend client; server kod app’ga kirmaydi
└── apps/mobile/
    ├── package.json + package-lock.json
    ├── index.html               # umumiy sayt HTML’i build’da ulanadi
    ├── vite.config.js           # umumiy src/public; native HTTPS API tekshiruvi
    ├── capacitor.config.json    # app ID, webDir, native sozlamalar
    ├── src/main.js              # native bootstrap → umumiy src/main.jsx
    ├── src/native.js            # Android back, deep link, keyboard, OS servislar
    ├── src/navigation.js        # URL cheklovlari, ochiq ulashish havolalari
    ├── src/security.js          # native lokal hash/UUID fallback
    ├── src/native.css + fonts.css
    ├── src/*.test.js            # adapter, ruxsat, navigatsiya, kripto tekshiruvlari
    ├── scripts/                 # build/parity va brand asset tekshiruvlari
    ├── android/                 # to‘liq Gradle/Android Studio loyihasi
    ├── ios/                     # to‘liq Xcode/Swift Package Manager loyihasi
    └── dist/                    # generatsiya qilinadi, Git’da saqlanmaydi
```

`src/admin/routes/AdminRoutes.jsx`dagi barcha yo‘llar app’da ham mavjud:
`/admin`, `customers`, `sellers`, `shops`, `applications`, `products`, `orders`,
`subscriptions`, `notifications`, `history`, `settings`, ularning mavjud detail
sahifalari va himoyalangan `telegram` bo‘limi.

Android `assets/public` va iOS `App/public` fayllari `cap sync`dan keladi.
Ular Git’da nusxalanmaydi; `npm run app:sync` bilan qayta hosil bo‘ladi.
`dist/migration-manifest.json` aynan qaysi umumiy modullar/resurslar kirganini
ularning hash’lari bilan ko‘rsatadi.
