# StockSense — Inventory Management System

Full-stack inventory management application.

**Hour 1 scope:** the foundation — FastAPI + PostgreSQL backend, authentication
(signup, login, logout, OTP-based password reset), and a React frontend with the
authenticated application shell and navigation for the inventory modules.

The inventory modules themselves (Products, Operations, Warehouse, Move History,
Stock Ledger) are navigation placeholders at this stage. They intentionally show
**no sample data** — they will render live data once their API endpoints exist.

---

## Stack

| Layer    | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| Backend  | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, psycopg 3      |
| Database | PostgreSQL                                                    |
| Auth     | JWT access tokens (HS256), bcrypt password hashing            |
| Frontend | React 19, Vite, React Router 7, Axios                         |

---

## Project layout

```
StockSense/
├── backend/
│   ├── alembic/                  # migrations
│   ├── app/
│   │   ├── api/routes/           # auth.py, users.py
│   │   ├── core/                 # config, security, dependencies
│   │   ├── db/                   # declarative base, engine/session
│   │   ├── models/               # User, PasswordResetOTP
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── services/             # auth, OTP, mailer
│   │   └── main.py               # FastAPI app
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/                  # axios client + auth endpoints
    │   ├── components/           # Field, Button, Alert, OtpInput, route guards
    │   ├── context/              # AuthContext
    │   ├── layouts/              # AuthLayout, AppLayout (sidebar shell)
    │   ├── pages/                # Login, Signup, ForgotPassword, Dashboard, …
    │   ├── styles/index.css      # design tokens + components
    │   └── navigation.jsx        # sidebar definition
    └── .env.example
```

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ running locally

---

## Backend setup

```bash
cd backend

# 1. Virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# 2. Dependencies
pip install -r requirements.txt

# 3. Environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Edit `.env` and set at minimum:

```ini
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/stocksense
SECRET_KEY=<a long random string>
```

Generate a key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Create the database and apply migrations:

```bash
createdb -U postgres stocksense     # or CREATE DATABASE stocksense; in psql
python -m alembic upgrade head
```

Run the API:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

- API root: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

---

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env        # Windows (cp on macOS / Linux)
npm run dev
```

App: http://localhost:5173

`frontend/.env` holds one value:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

## API reference (v1)

All routes are prefixed with `/api/v1`.

| Method | Path                     | Auth   | Purpose                                   |
| ------ | ------------------------ | ------ | ----------------------------------------- |
| POST   | `/auth/signup`           | –      | Register; returns a token and the user    |
| POST   | `/auth/login`            | –      | Log in; returns a token and the user      |
| GET    | `/auth/me`               | Bearer | Current authenticated user                |
| POST   | `/auth/logout`           | Bearer | Acknowledge logout (client discards token)|
| POST   | `/auth/forgot-password`  | –      | Issue a password-reset OTP                |
| POST   | `/auth/verify-otp`       | –      | Check an OTP without consuming it         |
| POST   | `/auth/reset-password`   | –      | Consume the OTP and set a new password    |
| GET    | `/users/me`              | Bearer | Read own profile                          |
| PATCH  | `/users/me`              | Bearer | Update own profile (name)                 |
| GET    | `/health`                | –      | Health check                              |

Authenticated requests send `Authorization: Bearer <access_token>`.

### User model

`name`, `email` (unique), `hashed_password`, `role` (`admin` / `manager` /
`staff`), `is_active`, `created_at`, `updated_at`.

---

## Password reset (OTP)

1. `POST /auth/forgot-password` issues a 6-digit code. The response is the same
   whether or not the email exists, so the endpoint cannot be used to discover
   registered addresses.
2. `POST /auth/verify-otp` validates the code without spending it (used by the
   UI's "Verify code" step).
3. `POST /auth/reset-password` validates **and consumes** the code, then sets the
   new password.

Guarantees:

- Only a **SHA-256 hash** of the code is stored, never the code itself.
- The code **expires** after `OTP_EXPIRE_MINUTES` (default 10).
- The code is **single-use** — a consumed code is rejected on replay.
- After `OTP_MAX_ATTEMPTS` wrong guesses (default 5) the code is burned.
- Requesting a new code invalidates any outstanding one.

**Delivery:** if `SMTP_HOST` is set the code is emailed. If it is not set (the
local default), the code is written to the backend log instead, so the flow is
fully testable without mail credentials. Look for:

```
stocksense.otp | Issued password reset OTP for user@example.com: 123456
```

---

## Database migrations

```bash
cd backend
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade head
python -m alembic downgrade -1
```

---

## Notes

- `.env` files are gitignored; only `.env.example` is committed.
- `SECRET_KEY` must be changed for any non-local deployment — rotating it
  invalidates all issued tokens.
- Allowed browser origins are configured via `BACKEND_CORS_ORIGINS`.
