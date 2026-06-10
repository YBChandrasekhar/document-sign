# DocSign — Digital Document Signature App

A full-stack SaaS-style document signing platform built with React, Node.js, Express, Supabase, and pdf-lib.

---

## Features

- JWT authentication (register / login)
- PDF upload & secure storage
- Drag-and-drop signature field placement
- PDF finalization with stamp-style embedded signature (Dancing Script font)
- Tokenized public signing links via email
- Accept / Reject workflow with rejection reasons
- Full audit trail (who signed, when, IP address)
- Dashboard with status filters and stats cards
- Responsive UI (desktop table + mobile cards)

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 19, Vite, Tailwind CSS      |
| Backend    | Node.js, Express                  |
| Database   | Supabase (PostgreSQL)             |
| Auth       | JWT + bcryptjs                    |
| PDF        | pdf-lib, @pdf-lib/fontkit         |
| Upload     | Multer                            |
| Email      | Nodemailer (Gmail)                |
| Drag/Drop  | @dnd-kit/core                     |
| PDF Render | react-pdf                         |

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/docsign.git
cd docsign
```

### 2. Backend setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

---

## Supabase Tables

Run these in your Supabase SQL editor:

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  created_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text,
  original_name text,
  file_path text,
  size bigint,
  status text default 'pending',
  signed_path text,
  rejection_reason text,
  created_at timestamptz default now()
);

-- Signatures
create table signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  x float,
  y float,
  page int default 1,
  width float default 200,
  height float default 60,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Signing Tokens
create table signing_tokens (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  owner_id uuid references users(id) on delete cascade,
  signer_email text,
  token text unique,
  status text default 'pending',
  rejection_reason text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Audit Logs
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  action text,
  actor_name text,
  actor_email text,
  ip_address text,
  notes text,
  created_at timestamptz default now()
);
```

---

## Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `server`
4. Build command: `npm install`
5. Start command: `node index.js`
6. Add all environment variables from `server/.env`
7. Copy the Render URL (e.g. `https://docsign-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo
3. Set **Root Directory** to `client`
4. Framework: Vite
5. Add environment variable:
   - `VITE_API_URL` = your Render backend URL
6. Deploy

### After Deployment

Update `server/.env` on Render:
```
CLIENT_URL=https://your-app.vercel.app
```

---

## API Endpoints

| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| POST   | /api/auth/register              | Register user             |
| POST   | /api/auth/login                 | Login user                |
| POST   | /api/docs/upload                | Upload PDF                |
| GET    | /api/docs                       | List user documents       |
| GET    | /api/docs/:id                   | Get single document       |
| DELETE | /api/docs/:id                   | Delete document           |
| POST   | /api/signatures                 | Create signature field    |
| GET    | /api/signatures/:id             | Get signatures for doc    |
| PUT    | /api/signatures/:id             | Update signature position |
| DELETE | /api/signatures/:id             | Delete signature field    |
| POST   | /api/docs/:id/finalize          | Generate signed PDF       |
| GET    | /api/docs/:id/download          | Download signed PDF       |
| POST   | /api/share/generate             | Generate signing link     |
| GET    | /api/share/token/:token         | Get doc by token          |
| POST   | /api/share/token/:token/sign    | Sign or reject by token   |
| GET    | /api/audit/:docId               | Get audit logs            |

---

## License

MIT
