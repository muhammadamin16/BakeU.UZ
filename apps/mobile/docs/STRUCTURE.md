# Структура BakeU Mobile

Только исходники и настройки. Кэш, web-сборки и файлы подписи здесь не перечислены.

```text
apps/mobile/
├── android/
│   ├── app/
│   │   ├── src/
│   │   │   ├── androidTest/
│   │   │   │   └── .gitkeep
│   │   │   ├── main/
│   │   │   │   ├── java/
│   │   │   │   │   └── uz/
│   │   │   │   │       └── bakeu/
│   │   │   │   │           └── mobile/
│   │   │   │   │               └── MainActivity.java
│   │   │   │   ├── res/
│   │   │   │   │   ├── drawable/
│   │   │   │   │   │   ├── ic_launcher_background.xml
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-hdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-mdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xxhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xxxhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-hdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-mdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xxhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xxxhdpi/
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-v24/
│   │   │   │   │   │   └── ic_launcher_foreground.xml
│   │   │   │   │   ├── layout/
│   │   │   │   │   │   └── activity_main.xml
│   │   │   │   │   ├── mipmap-anydpi-v26/
│   │   │   │   │   │   ├── ic_launcher.xml
│   │   │   │   │   │   └── ic_launcher_round.xml
│   │   │   │   │   ├── mipmap-hdpi/
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-mdpi/
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xhdpi/
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xxhdpi/
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xxxhdpi/
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── values/
│   │   │   │   │   │   ├── ic_launcher_background.xml
│   │   │   │   │   │   ├── strings.xml
│   │   │   │   │   │   └── styles.xml
│   │   │   │   │   └── xml/
│   │   │   │   │       └── file_paths.xml
│   │   │   │   └── AndroidManifest.xml
│   │   │   └── test/
│   │   │       └── .gitkeep
│   │   ├── .gitignore
│   │   ├── build.gradle
│   │   ├── capacitor.build.gradle
│   │   └── proguard-rules.pro
│   ├── gradle/
│   │   └── wrapper/
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── .gitignore
│   ├── build.gradle
│   ├── capacitor.settings.gradle
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── settings.gradle
│   └── variables.gradle
├── docs/
│   ├── ARCHITECTURE.md
│   └── STRUCTURE.md
├── ios/
│   ├── App/
│   │   ├── App/
│   │   │   ├── Assets.xcassets/
│   │   │   │   ├── AppIcon.appiconset/
│   │   │   │   │   ├── AppIcon-512@2x.png
│   │   │   │   │   └── Contents.json
│   │   │   │   ├── Splash.imageset/
│   │   │   │   │   ├── Contents.json
│   │   │   │   │   ├── splash-2732x2732-1.png
│   │   │   │   │   ├── splash-2732x2732-2.png
│   │   │   │   │   └── splash-2732x2732.png
│   │   │   │   └── Contents.json
│   │   │   ├── Base.lproj/
│   │   │   │   ├── LaunchScreen.storyboard
│   │   │   │   └── Main.storyboard
│   │   │   ├── AppDelegate.swift
│   │   │   ├── Info.plist
│   │   │   └── SceneDelegate.swift
│   │   ├── App.xcodeproj/
│   │   │   ├── project.xcworkspace/
│   │   │   │   └── xcshareddata/
│   │   │   │       └── IDEWorkspaceChecks.plist
│   │   │   └── project.pbxproj
│   │   └── CapApp-SPM/
│   │       ├── Sources/
│   │       │   └── CapApp-SPM/
│   │       │       └── CapApp-SPM.swift
│   │       ├── .gitignore
│   │       ├── Package.swift
│   │       └── README.md
│   ├── .gitignore
│   └── debug.xcconfig
├── public/
│   └── images/
│       └── .gitkeep
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx
│   │   └── router.tsx
│   ├── assets/
│   │   ├── fonts/
│   │   │   └── .gitkeep
│   │   ├── icons/
│   │   │   └── .gitkeep
│   │   └── images/
│   │       └── .gitkeep
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx
│   │   └── ui/
│   │       └── FeaturePlaceholder.tsx
│   ├── config/
│   │   └── navigation.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── cart/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── CartPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── catalog/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── CatalogPage.tsx
│   │   │   │   └── ProductPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── checkout/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── CheckoutPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── favorites/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── FavoritesPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── home/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── HomePage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── messages/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── ChatPage.tsx
│   │   │   │   └── MessagesPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── notifications/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── NotificationsPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── orders/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── OrderPage.tsx
│   │   │   │   └── OrdersPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── profile/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── SettingsPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── search/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   └── SearchPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   ├── seller/
│   │   │   ├── api/
│   │   │   │   └── .gitkeep
│   │   │   ├── components/
│   │   │   │   └── .gitkeep
│   │   │   ├── hooks/
│   │   │   │   └── .gitkeep
│   │   │   ├── pages/
│   │   │   │   ├── SellerOrdersPage.tsx
│   │   │   │   ├── SellerPage.tsx
│   │   │   │   ├── SellerProductsPage.tsx
│   │   │   │   └── SellerShopPage.tsx
│   │   │   └── types/
│   │   │       └── .gitkeep
│   │   └── shops/
│   │       ├── api/
│   │       │   └── .gitkeep
│   │       ├── components/
│   │       │   └── .gitkeep
│   │       ├── hooks/
│   │       │   └── .gitkeep
│   │       ├── pages/
│   │       │   ├── ShopPage.tsx
│   │       │   └── ShopsPage.tsx
│   │       └── types/
│   │           └── .gitkeep
│   ├── lib/
│   │   └── capacitor/
│   │       └── platform.ts
│   ├── locales/
│   │   ├── ru/
│   │   │   └── .gitkeep
│   │   └── uz/
│   │       └── .gitkeep
│   ├── services/
│   │   ├── api/
│   │   │   └── .gitkeep
│   │   ├── notifications/
│   │   │   └── .gitkeep
│   │   ├── payments/
│   │   │   └── .gitkeep
│   │   └── storage/
│   │       └── .gitkeep
│   ├── shared/
│   │   ├── hooks/
│   │   │   └── .gitkeep
│   │   ├── types/
│   │   │   └── .gitkeep
│   │   └── utils/
│   │       └── .gitkeep
│   ├── store/
│   │   └── .gitkeep
│   ├── styles/
│   │   ├── index.css
│   │   └── tokens.css
│   └── main.tsx
├── .env.example
├── .gitattributes
├── .gitignore
├── .nvmrc
├── capacitor.config.ts
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
