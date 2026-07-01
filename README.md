# Gwikonge PEFA Church — Backend API

REST API powering the church website: members, sermons, events, ministries, prayer requests,
giving, prayer wall, testimonials, gallery, blog/devotionals, volunteers, newsletter, attendance,
contact form, live streaming metadata, and the admin dashboard.

## Stack
Node.js, Express, Sequelize, PostgreSQL, JWT auth, Multer (file uploads), Helmet, rate limiting.

## Setup

```bash
npm install
cp .env.example .env   # then fill in DB credentials, JWT_SECRET, etc.
```

Create a PostgreSQL database matching `DB_NAME` in `.env` (or set `DATABASE_URL` for a hosted DB
like Render/Railway/Neon).

```bash
npm run dev      # starts on PORT (default 5000), auto-creates tables via sequelize.sync()
npm run seed      # creates a super_admin user + sample ministries/announcement
```

Default seeded admin login: the email in `SITE_EMAIL`, password `ChangeMe123!` — **change this
immediately** after first login via `PUT /api/auth/change-password`.

## Project structure

```
src/
  config/db.js        Sequelize/PostgreSQL connection
  models/              One file per entity + index.js wiring associations
  routes/              One router per module (see API map below)
  middleware/          auth.js (JWT + role guard), upload.js (Multer), errorHandler.js
  utils/crudFactory.js Generic public-read/admin-write CRUD builder for simple modules
  utils/seed.js         Initial admin + sample data
  server.js             App entrypoint
```

## API map (all under `/api`)

| Module | Base path | Notes |
|---|---|---|
| Auth | `/auth` | register, login, me, change-password — covers member/leader/pastor/admin login (role-based) |
| Members | `/members` | admin directory + `/members/me/dashboard` for member portal |
| Ministries | `/ministries` | public CRUD-read, admin write |
| Sermons | `/sermons` | search by topic/preacher/date, `/:id/view`, `/:id/download` |
| Events | `/events` | calendar, registration, capacity limits, registrations list |
| Announcements | `/announcements` | news, pastor messages, bulletins |
| Prayer Requests | `/prayer-requests` | submit (anonymous supported), `/wall` public wall, admin triage |
| Donations | `/donations` | record giving, `/my-history`, `/:id/receipt`, admin reports — **payment gateway (M-Pesa/card) is stubbed, see below** |
| Testimonials | `/testimonials` | admin-approved before public display |
| Gallery | `/gallery` | photos/videos by album/event |
| Blog | `/blog` | devotionals, Bible studies, articles, testimonies |
| Live Streams | `/livestreams` | schedule + status + recording URL |
| Prayer wall, Volunteers, Newsletter, Contact | see respective routes |
| Attendance | `/attendance` | self check-in + admin/QR check-in + reports |
| Dashboard | `/dashboard/stats` | admin summary counts |
| Upload | `/upload` | generic file upload (images/audio/video/pdf), admin-only |

All admin-only routes require `Authorization: Bearer <token>` from `/auth/login` and an
appropriate `role` (`admin`, `super_admin`, `pastor`, `leader` depending on route).

## Payment integration (Giving module)

`POST /api/donations` currently **records** a donation with `status: pending` (or `completed`
immediately for cash). To go live with real payments:

- **M-Pesa**: implement Daraja STK Push in `donations.routes.js` using the `MPESA_*` env vars,
  then confirm via the callback URL hitting `POST /api/donations/:id/confirm`.
- **Card / PayPal**: create a payment intent/order and redirect/confirm similarly.
- **Bank transfer**: stays manual — admin reconciles and calls `/confirm`.

## Deployment

Works well on Render, Railway, or any Node host with a managed PostgreSQL add-on. Set all `.env`
variables in the host's dashboard (don't commit `.env`). Point the frontend's `API_BASE_URL` at
this service's public URL.
