# Tenant Issue Reporting Portal

Full-stack property management web app — tenants report maintenance issues, admins manage and resolve them with real-time chat and email notifications.

## Stack

- Frontend: React + Vite + Tailwind CSS + Socket.io-client + Recharts
- Backend: Node.js + Express + MongoDB (Mongoose) + Socket.io + Nodemailer

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables in `.env`:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Any long random string |
| `EMAIL_HOST` | SMTP host (e.g. smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (587 for TLS) |
| `EMAIL_USER` | SMTP username / Gmail address |
| `EMAIL_PASS` | App password (not your Gmail password) |
| `ADMIN_EMAIL` | Where new issue emails are sent |
| `FRONTEND_URL` | Frontend URL for email links |

**Gmail setup:** Enable 2FA → generate an App Password at myaccount.google.com/apppasswords

#### Seed the admin user

```bash
npm run seed
# Creates admin: sameer@superstay.no / admin123
```

#### Start backend

```bash
npm run dev      # development (nodemon)
npm start        # production
```

Backend runs on http://localhost:5000

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

---

## Default Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Admin | sameer@superstay.no | admin123 |
| Tenant | Register via /register | (your choice) |

**Change the admin password after first login.**

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Tenant registration |
| POST | /api/auth/login | — | Login (returns JWT) |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/issues | JWT | List issues (filtered by role) |
| POST | /api/issues | JWT | Create issue (tenant) |
| GET | /api/issues/:id | JWT | Issue details |
| PUT | /api/issues/:id | Admin | Update status/notes |
| DELETE | /api/issues/:id | Admin | Delete issue |
| GET | /api/messages/:issueId | JWT | Get chat messages |
| POST | /api/messages | JWT | Send message (REST) |
| GET | /api/dashboard/stats | JWT | Summary stats |
| GET | /api/dashboard/issues-by-priority | JWT | Analytics |
| GET | /api/dashboard/issues-by-status | JWT | Analytics |
| GET | /api/dashboard/issues-by-category | JWT | Analytics |
| GET | /api/users/profile | JWT | Own profile |
| PUT | /api/users/profile | JWT | Update profile |

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `join_issue` | Client → Server | Join issue chat room |
| `send_message` | Client → Server | Send chat message |
| `new_message` | Server → Client | Broadcast new message |
| `typing_start/stop` | Client → Server | Typing indicator |
| `user_typing` | Server → Client | Show typing indicator |
| `new_issue` | Server → Client | Notify admins of new issue |
| `issue_updated` | Server → Client | Status change broadcast |

---

## Project Structure

```
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routers
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth + error handling
│   ├── services/        # Email service
│   ├── socket/          # Socket.io handler
│   ├── scripts/         # Seed script
│   └── server.js
└── frontend/
    └── src/
        ├── pages/       # Route-level components
        ├── components/  # Reusable UI
        ├── services/    # API + Socket clients
        └── context/     # Auth context
```
