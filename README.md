# 🐟 Fishon.my — Malaysia's First Fishing Charter Marketplace

Fishon.my is an **e-commerce marketplace for recreational fishing charters**, connecting **anglers** with **licensed boat captains** across Malaysia.  
It's built with **Next.js 15**, **React 19**, **Prisma ORM**, and **PostgreSQL**, featuring a modern UI, secure booking workflows, and future-ready integrations like chat, reviews, and payments.

---

## 🚀 Features

- 🎣 **Charter Bookings** — real-time listings, trip availability, dual booking flow (MANUAL/AUTO)
- 👤 **User Accounts** — anglers (frontend) + captains (backend) with distinct dashboards
- 🌐 **Multi-lingual Support** — Malay (my) and English (en) with next-intl
- 💬 **Chat System** — instant communication between anglers & captains with Pusher real-time
- 💳 **Secure Payments** — SenangPay integration (Card, FPX, E-Wallet) with refund support
- ⭐ **Reviews & Ratings** — transparent feedback after completed trips
- 📰 **Blog Platform** — CMS-style dashboard, comments, newsletter, and social sharing
- 📱 **PWA Ready** — add-to-home-screen support on mobile
- ☁️ **Deployed on Vercel** — auto-scaling, serverless functions, and CI/CD built-in

---

## 🧱 Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| **Framework**    | Next.js 15 (App Router)                           |
| **Language**     | TypeScript / React 19                             |
| **Database**     | PostgreSQL (via Prisma ORM)                       |
| **UI & Styling** | Tailwind CSS, Geist Font                          |
| **Payments**     | SenangPay (Card, FPX, E-Wallet)                   |
| **Real-time**    | Pusher (WebSocket)                                |
| **Email**        | Zoho SMTP + @fishon/email (React Email templates) |
| **SMS**          | Exabytes Bulk SMS                                 |
| **Deployment**   | Vercel + Neon Postgres                            |
| **CI/CD**        | GitHub Actions                                    |

---

## 🧩 Project Architecture

### High-Level Structure

```text
fishon-market/
├── src/
│   ├── app/                    # Next.js 15 App Router (Route Groups)
│   │   ├── (auth)/            # Authentication pages (no layout)
│   │   ├── (account)/         # User dashboard (with sidebar)
│   │   ├── (marketplace)/     # Public charter browsing
│   │   ├── (marketing)/       # Static/info pages
│   │   ├── api/               # API routes
│   │   └── blog/              # Blog platform
│   ├── components/            # React components (feature-based)
│   ├── lib/                   # Business logic (service-based)
│   ├── data/                  # Static data & mock fixtures
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Pure utility functions
│   └── i18n/                  # Internationalization config
├── prisma/                    # Database schema & migrations
├── scripts/                   # Utility scripts (backup, testing)
├── public/                    # Static assets
├── messages/                  # Translation files (en.json, my.json)
└── docs/                      # Technical documentation
```

### Related Services

| Service          | Repo                 | Responsibility                              |
| ---------------- | -------------------- | ------------------------------------------- |
| `fishon-captain` | Backend API          | Captain registration, management, analytics |
| `fishon-market`  | Frontend marketplace | Angler experience, bookings, payments       |
| `fishon-schemas` | Shared package       | Zod schemas for event validation            |
| `fishon-email`   | Shared package       | React Email templates                       |
| `fishon-ui`      | Shared package       | Shared UI components and types              |

---

## 📚 System Configuration

All feature configuration is documented in [`docs/config/`](docs/config/):

| Document                                                                 | Feature               | Description                                                  |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------ |
| [BOOKING_FLOW.md](docs/config/BOOKING_FLOW.md)                           | Booking System        | Dual flow (MANUAL/AUTO), guest checkout, payment integration |
| [PAYMENT_SYSTEM.md](docs/config/PAYMENT_SYSTEM.md)                       | Payment               | SenangPay integration, TOKENIZED/DIRECT flows, refunds       |
| [CHAT_SYSTEM_CONFIGURATION.md](docs/config/CHAT_SYSTEM_CONFIGURATION.md) | Chat/Messaging        | Angler-captain communication, Pusher real-time               |
| [EMAIL_NOTIFICATION_SYSTEM.md](docs/config/EMAIL_NOTIFICATION_SYSTEM.md) | Email & Notifications | Zoho SMTP, Pusher notifications, webhooks                    |
| [SMS_SYSTEM.md](docs/config/SMS_SYSTEM.md)                               | SMS Notifications     | Exabytes SMS integration                                     |
| [I18N_SYSTEM.md](docs/config/I18N_SYSTEM.md)                             | Internationalization  | next-intl, Malay/English support                             |
| [ANALYTICS_SYSTEM.md](docs/config/ANALYTICS_SYSTEM.md)                   | Analytics             | Event tracking, captain dashboard                            |
| [TIME_BASED_SCHEDULING.md](docs/config/TIME_BASED_SCHEDULING.md)         | Scheduling            | Partial availability, advance notice                         |
| [PROMOTIONAL_BANNER_SYSTEM.md](docs/config/PROMOTIONAL_BANNER_SYSTEM.md) | Promotions            | Campaign banners, tracking                                   |

---

## ⚙️ Environment Configuration

Create an `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

### Required Variables

| Key                    | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string (fishon-market)     |
| `CAPTAIN_DATABASE_URL` | PostgreSQL connection (fishon-captain read-only) |
| `USE_CAPTAIN_DB`       | Enable direct DB connection (`1` = enabled)      |
| `NEXT_PUBLIC_SITE_URL` | Base site URL                                    |
| `NEXTAUTH_SECRET`      | NextAuth session secret                          |

### Payment (SenangPay)

| Key                     | Description                    |
| ----------------------- | ------------------------------ |
| `SENANGPAY_MERCHANT_ID` | SenangPay merchant ID          |
| `SENANGPAY_SECRET_KEY`  | SenangPay secret key           |
| `SENANGPAY_MODE`        | `sandbox` or `production`      |
| `NEXT_PUBLIC_BASE_URL`  | Base URL for payment callbacks |

### Communication

| Key                     | Description           |
| ----------------------- | --------------------- |
| `SMTP_HOST`             | Zoho SMTP host        |
| `SMTP_USER`             | Zoho SMTP username    |
| `SMTP_PASSWORD`         | Zoho SMTP password    |
| `PUSHER_APP_ID`         | Pusher app ID         |
| `PUSHER_KEY`            | Pusher key            |
| `PUSHER_SECRET`         | Pusher secret         |
| `EXABYTES_SMS_USERNAME` | Exabytes SMS username |
| `EXABYTES_SMS_PASSWORD` | Exabytes SMS password |

### Optional

| Key                               | Description                       |
| --------------------------------- | --------------------------------- |
| `FISHON_CAPTAIN_API_URL`          | Fallback API URL for captain data |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps integration           |
| `SENTRY_DSN`                      | Error tracking via Sentry         |

---

## 🗄️ Database Setup (Prisma)

This project uses Prisma ORM for schema management and migrations.

### Local setup

```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```

### Safe Migration (Recommended)

Always use the safe migration script with automatic backup:

```bash
npm run db:migrate:safe migration-name
```

See [`scripts/README.md`](scripts/README.md) for complete backup and restore documentation.

---

## 🧠 Development Workflow

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the dev server

   ```bash
   npm run dev
   ```

3. Visit <http://localhost:3000>.

### Scripts

| Command                   | Description                  |
| ------------------------- | ---------------------------- |
| `npm run dev`             | Start local dev server       |
| `npm run build`           | Build for production         |
| `npm run start`           | Run production build locally |
| `npm run lint`            | Lint code                    |
| `npm run typecheck`       | TypeScript type checking     |
| `npm run prisma:migrate`  | Run local migrations         |
| `npm run prisma:generate` | Regenerate Prisma client     |
| `npm run db:backup`       | Create database backup       |
| `npm run db:migrate:safe` | Safe migration with backup   |

---

## 🌐 Deployment

### Vercel + Neon Postgres

1. Provision a Neon Postgres database.
2. Add environment variables in Vercel dashboard.
3. Set Build Command → `npm run prisma:migrate-deploy && npm run build`.
4. Deploy to production — Vercel handles the rest.

### CI/CD (GitHub Actions)

Every push/PR triggers:

- Lint → Typecheck → Build → Prisma Validate → Test

Workflow file: `.github/workflows/ci.yml`

---

## 🧪 Testing

Testing uses Vitest:

```bash
npm test
```

Integration tests cover:

- Booking lifecycle (MANUAL/AUTO flows)
- Payment webhooks (SenangPay callbacks)
- Chat event flow

---

## 🔐 Security & Compliance

- All sensitive data in .env (never committed)
- Webhook signature verification for payments
- Rate limiting on payment and tracking endpoints
- IP hashing for analytics (no PII stored)
- PDPA-ready: data export & deletion endpoints planned

---

## 🧰 Tooling & Automation

- Dependabot — weekly dependency updates
- ESLint + Prettier — code style enforcement
- Sentry (optional) — runtime error monitoring
- GitHub Actions — CI validation and migrations
- PWA manifest — offline & installable experience

---

## 👥 Contributing

We welcome contributions!

> See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and contribution guidelines.

Quick summary:

```bash
git checkout -b feat/new-feature
git commit -m "feat(blog): add search filters"
git push origin feat/new-feature
```

Then open a Pull Request on GitHub.

---

## 📄 License

© 2025 Kartel Motion Ventures.
All rights reserved.
Unauthorized copying or redistribution is prohibited without permission.

---

## 🧩 Contact

| Role                | Contact                     |
| ------------------- | --------------------------- |
| **Support**         | <support@fishon.my>         |
| **Website**         | <https://www.fishon.my>     |
| **Captains Portal** | <https://captain.fishon.my> |
