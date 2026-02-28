# EduStart — Auth prototype

This folder contains a minimal Node/Express auth prototype using PostgreSQL.

Features included:
- `users` table with secure password hashing (argon2)
- Server-side sessions stored in Postgres using `connect-pg-simple`
- API endpoints: `/api/register`, `/api/login`, `/api/logout`, `/api/me`
- Password-reset tokens (`auth_tokens`) (token hash stored in DB)

Not included: front-end integration (this is backend prototype), email sending (token is returned in response for prototyping).

Quick start
1. Install PostgreSQL and create database, set `DATABASE_URL`.
2. Copy `.env.example` to `.env` and fill values.
3. Run DB migration:

```powershell
psql "${env:DATABASE_URL}" -f migrations/create_tables.sql
```

Or using psql CLI:

```bash
p sql "${DATABASE_URL}" -f migrations/create_tables.sql
```

4. Install dependencies and start server:

```powershell
cd C:\Users\Tembulat\Desktop\online-learning-site
npm install
npm start
```

5. Test endpoints (examples):

Register:
POST /api/register
body: { "username": "ivan", "email": "ivan@example.com", "password": "secret" }

Login:
POST /api/login
body: { "identifier": "ivan@example.com", "password": "secret" }

Request password reset (dev): returns token:
POST /api/request-password-reset
body: { "email": "ivan@example.com" }

Reset password:
POST /api/reset-password
body: { "token": "...", "password": "newpass" }

Notes & security
- In production set `SECURE_COOKIES=true` and serve over HTTPS.
- Use env secret for `SESSION_SECRET` and rotate as needed.
- Replace returning tokens with sending via email and don't leak tokens in responses.
- Add monitoring/rate-limiting and CAPTCHA for registration/login if needed.
