# Tudos

Aplikasi manajemen project & task ala Jira — dibangun custom, bukan turunan template. Terdiri dari backend REST API (Express + Prisma) dan frontend SPA (React + Vite).

Lihat [CHANGELOG.md](./CHANGELOG.md) untuk daftar lengkap fitur.

## Fitur Utama

- Project & task management: daftar (Tudos), papan Kanban, dan Timeline (gantt).
- Multi-assignee per task, aturan perpindahan status, riwayat status, lampiran file.
- Catatan project ala Notion (Markdown + slash command).
- Komentar task 2 level + notifikasi in-app.
- RBAC: role & permission custom (bukan cuma admin/member tetap).
- Export Excel/PDF di berbagai halaman, termasuk export **Daily Activity** (laporan kerja bulanan, otomatis handle weekend & libur nasional).
- Kalender libur nasional (manual atau sync dari API publik).
- Profil user self-service + upload foto profil (auto-crop 300x300).

## Tech Stack

| | Backend | Frontend |
|---|---|---|
| Runtime | Node.js | — |
| Framework | Express | React 19 + Vite |
| Database | MySQL/MariaDB via Prisma ORM | — |
| Styling | — | Tailwind CSS v4 + base-ui components |
| Auth | JWT (access + refresh token) | — |
| Validasi | Zod | — |
| Lain-lain | exceljs, pdfmake, sharp, multer | @tanstack/react-table, react-markdown, recharts |

## Struktur Repo

```
tudos/
├── backend/     # REST API (Express + Prisma)
├── frontend/    # SPA (React + Vite)
└── CHANGELOG.md
```

## Prasyarat

- Node.js 20+
- MySQL atau MariaDB yang jalan lokal (atau remote)

## Setup

### 1. Clone

```bash
git clone git@github.com:muhamadijlal/tudos.git
cd tudos
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # isi DATABASE_URL, JWT_SECRET, dll
npm run key:jwt:generate   # generate JWT_SECRET kalau belum ada
npx prisma migrate deploy  # jalanin semua migration
npm run dev                # nyala di http://localhost:3030 (sesuai PORT di .env)
```

Promosikan user pertama jadi Admin (role default user baru adalah Member):

```bash
npm run user:make-admin -- <email>
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # isi VITE_API_URL (default http://localhost:3030)
npm run dev             # nyala di http://localhost:5173
```

## Script yang Tersedia

**Backend** (`cd backend`)

| Script | Keterangan |
|---|---|
| `npm run dev` | Jalanin server dev (nodemon, auto-restart) |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Node test runner) |
| `npm run key:jwt:generate` | Generate `JWT_SECRET` baru |
| `npm run user:make-admin` | Promosikan user existing jadi Admin |

**Frontend** (`cd frontend`)

| Script | Keterangan |
|---|---|
| `npm run dev` | Jalanin dev server (Vite) |
| `npm run build` | Build production |
| `npm run lint` | Oxlint |
| `npm run preview` | Preview hasil build |

## Migration Database

Project ini pakai migration SQL manual (`prisma/migrations/`), diterapkan lewat:

```bash
npx prisma migrate deploy
```

Setiap ada perubahan schema, migration baru ditulis manual (bukan lewat `prisma migrate dev`) lalu di-apply dengan perintah yang sama.

## Repository

[git@github.com:muhamadijlal/tudos.git](https://github.com/muhamadijlal/tudos)
