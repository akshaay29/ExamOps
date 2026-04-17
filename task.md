# ExamOps Task List

## Phase 1: Setup & Infrastructure
- [x] Initialize Git repository mapping (monorepo or frontend/backend separate).
- [x] Setup frontend: Vite (React), Tailwind CSS, shadcn/ui.
- [x] Setup backend: Node.js, Express.js, TypeScript.
- [x] Configure database: PostgreSQL & Prisma ORM (schema written).
- [x] Setup linting, formatting (ESLint/Prettier), and Husky pre-commit hooks.

## Phase 2: Database & Auth Layer
- [x] Implement Prisma schema.
- [x] Scaffold JWT-based auth for Admin, Student, Invigilator.
- [x] Create RBAC middleware for Express backend.
- [x] Implement global protected routing logic on frontend.

## Phase 3: Core CRUD & Admin Features
- [x] Build Room Management UI (with CSV import dropzone + seat capacity grid).
- [x] Implement Student Data CSV Upload UI.
- [x] Build Exam Schedule Management UI.

## Phase 4: Seat Allocation Engine (Core Algorithm)
- [x] Develop the seating algorithm script in Node.js.
- [x] Write unit tests verifying cross-branch horizontal/vertical isolation.
- [x] Build the Admin UI to trigger allocation and view the generated visual grid.

## Phase 5: Student Portal & Hall Tickets
- [x] Implement QR Code generation (qrcode.react).
- [x] Integrate PDFKit to dynamically generate Hall Tickets on the backend.
- [x] Build the Student Login portal and Hall Ticket View/Download UI.

## Phase 6: Invigilator Portal & Automated Attendance
- [x] Build Mobile-first UI for the Invigilator room selection.
- [x] Integrate camera-based QR scanning (getUserMedia) in the browser.
- [x] Implement real-time attendance tracking with manual toggles (frontend UI).
- [x] Connect attendance to backend API (backend integration).

## Phase 7: Analytics, Polish & Deployment
- [x] Build Admin Attendance Reports featuring Recharts graphs.
- [x] Export features (json2csv) for post-exam reporting.
- [x] E2E testing and UX polish.
- [x] Deploy backend to Render/Railway and frontend to Vercel.
