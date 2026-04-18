<div align="center">
  <img src="frontend/src/assets/hero.png" alt="ExamOps Logo" width="120" />
  <h1>🚀 ExamOps</h1>
  <p><strong>Next-Generation Smart Exam Management & Seating Platform</strong></p>
  
  <p>
    <a href="#features">Features</a> • 
    <a href="#tech-stack">Tech Stack</a> • 
    <a href="#getting-started">Getting Started</a> • 
    <a href="#architecture">Modules</a>
  </p>
</div>

<br/>

## ✨ Introduction

**ExamOps** is an end-to-end digital infrastructure designed for modern educational institutions to completely automate and elevate the examination lifecycle. From wiping out examination chaos through algorithmically generated, anti-copy seating layouts, to deploying real-time QR-based attendance tracking, ExamOps puts exams on autopilot.

## 🎯 Core Features

- 🪑 **Automated Anti-Copy Seating:** An intelligent algorithm dynamically allocates students to specific seats/benches while ensuring students from the exact same branch or subject never sit adjacent to each other.
- 📱 **QR-Based Digital Attendance:** Staff can securely mark student attendance natively within the Invigilator dashboard strictly via QR code scans or manual overrides.
- 🔑 **Passwordless Authentication:** Features enterprise-grade Magic Link delivery for Administrative/Staff portals and a fast OTP engine for remote Student access.
- 📊 **Real-time Analytics & Exports:** Live streaming attendance tracking and native 1-click PDF/CSV report exports.
- 🗄️ **Seamless Data Imports:** Instantly onboard entire colleges via rapid CSV parsing for Students, Subjects, and Room dimensions.
- 🎨 **Sleek UI/UX:** A stunning, bleeding-edge design relying on glassmorphism, responsive shaders, and fluid micro-interactions.

## 💻 Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS + custom Glassmorphism UI
- **Routing & State:** React Router DOM, React Context 
- **Graphics:** Three.js (WebGL Shaders), Lucide-React Icons

### Backend
- **Runtime & Server:** Node.js, Express.js (TypeScript)
- **Database Architecture:** PostgreSQL 
- **ORM:** Prisma
- **Auth & Secure Delivery:** JSON Web Tokens (JWT), Nodemailer (SMTP), Bcrypt
- **Algorithms:** Custom graph-coloring/cycle-based spatial layout algorithms

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally
- Git

### 1. Clone & Install
```bash
git clone https://github.com/akshaay29/ExamOps.git
cd ExamOps

# Install Backend
cd backend
npm install

# Install Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables
You will need `.env` files configured in both folders.
**`backend/.env`**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/examops"
JWT_SECRET="your_highly_secure_jwt_secret"
PORT=8000
FRONTEND_URL="http://localhost:5173"

# For OTP / Magic Links
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:8000
```

### 3. Database Sync & Seeding
Prepare the local PostgreSQL instance and apply the Prisma schema.
```bash
cd backend
npx prisma db push
npm run seed  # Wipes existing records and injects core Staff configurations
```

### 4. Ignite the Engines
Fire up the local dev environment in two separate terminals:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to experience the platform. 

## Deployment

This project is easiest to deploy as:

- `frontend/` on Vercel or Netlify
- `backend/` on Render, Railway, or a VPS
- PostgreSQL on Neon, Supabase, Render Postgres, or Railway

### Recommended Production Setup

1. Deploy a PostgreSQL database and copy its connection string into `backend/.env`.
2. Deploy the backend as a Node service from the `backend/` folder.
3. Set backend environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT`
   - `FRONTEND_URL`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
4. Use these backend service commands:
   - Build: `npm run build`
   - Start: `npm start`
5. Run database migrations before first use:
   - `npx prisma migrate deploy`
   - If you are not using migrations yet, `npx prisma db push` also works, but `migrate deploy` is safer for production.
6. Deploy the frontend from the `frontend/` folder.
7. Set `VITE_API_URL` in the frontend environment to your live backend URL, for example `https://api.yourdomain.com`.

### Hosting Notes

- `FRONTEND_URL` on the backend must exactly match your deployed frontend origin, otherwise CORS and magic-link redirects will fail.
- OTP and magic-link login require working SMTP credentials in production.
- The frontend is a static build, so the output of `npm run build` in `frontend/` can be served by any CDN/static host.
- The backend exposes a health endpoint at `/health`, which is useful for uptime checks and deployment verification.

## 🛡️ License

Built with ❤️ by [Akshay Gupta](https://www.linkedin.com/in/akshaygupta2905/).
