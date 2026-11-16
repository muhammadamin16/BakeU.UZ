# BakeU applications

Общая папка для backend и мобильного приложения. Сайт остаётся в корне
репозитория. Проекты независимы: устанавливайте зависимости отдельно.
Команды ниже выполняются из корня BakeU.UZ.

## Backend

Node.js 24 + TypeScript + NestJS + PostgreSQL + Drizzle.
Подготовка базы и `.env`: [backend/README.md](backend/README.md).

```sh
npm --prefix apps/backend ci
npm --prefix apps/backend run db:migrate
npm --prefix apps/backend run dev
```

Для миграции PostgreSQL уже должен быть запущен, а `apps/backend/.env` настроен.
API по умолчанию: http://127.0.0.1:4000/api/v1/health/live.

## Mobile

React + TypeScript + Capacitor для Android и iOS.
Подробности: [mobile/README.md](mobile/README.md).

```sh
npm --prefix apps/mobile ci
npm --prefix apps/mobile run dev
```

Web-превью: http://127.0.0.1:4300/.

## Проверки

```sh
npm --prefix apps/backend run check
npm --prefix apps/mobile run check
npm --prefix apps/mobile run sync
```

`sync` передаёт web-сборку в native-проекты; сборка APK/AAB и IPA требует
Android Studio или Xcode. Перенос папок не подключает сайт и mobile к новому
backend автоматически — бизнес-API реализуется отдельными этапами.
