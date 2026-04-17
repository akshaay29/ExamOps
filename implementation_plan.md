# ExamOps: Exam Seating and Automated Attendance Management System

This document outlines the end-to-end technical implementation plan for ExamOps, a scalable web application for managing college exam seating allocations and QR-based automated attendance.

## User Review Required

> [!IMPORTANT]
> Please review the **Proposed Algorithm Constraints** and the **Timeline Estimates**. The timeline assumes highly experienced developers, but gives ranges factoring in part-time college student developers.
> Also, confirm whether the system needs to support multiple colleges (multi-tenant) or just a single college deployment. The current design assumes a single college.

---

## 1. PROJECT BREAKDOWN & PHASES

### Phase 1: Setup & Infrastructure
- [x] Initialize Git repository mapping (monorepo or frontend/backend separate).
- [x] Setup frontend: Vite (React), Tailwind CSS, shadcn/ui.
- [x] Setup backend: Node.js, Express.js, TypeScript.
- [x] Configure database: PostgreSQL & Prisma ORM.
- [x] Setup linting, formatting (ESLint/Prettier), and Husky pre-commit hooks.
- **Dependencies:** None. Blockers for all subsequent phases.

### Phase 2: Database & Auth Layer
- [x] Implement Prisma schema (Users, Roles, Rooms, Exams, allocs).
- [x] Scaffold JWT-based authentication for Admin, Student, and Invigilator.
- [x] Create Role-Based Access Control (RBAC) middleware for the Express backend.
- [x] Implement global protected routing logic on the React frontend.
- **Dependencies:** Phase 1.

### Phase 3: Core CRUD & Admin Features
- [x] Build Room Management API & UI (Configure dimensions).
- [x] Implement Student Data CSV Upload (parsing & validation on backend).
- [x] Build Exam Schedule Management API & UI.
- **Dependencies:** Phase 2. Blockers for Phase 4.

### Phase 4: Seat Allocation Engine (Core Algorithm)
- [x] Develop the seating algorithm script in Node.js.
- [x] Write unit tests verifying cross-branch horizontal/vertical isolation.
- [x] Build the Admin UI to trigger allocation and view the generated visual grid.
- **Dependencies:** Phase 3. Blockers for Phase 5.

### Phase 5: Student Portal & Hall Tickets
- [x] Implement secure QR Code generation for each seat allocation.
- [x] Integrate PDFKit to dynamically generate Hall Tickets on the backend.
- [x] Build the Student Login portal and Hall Ticket View/Download UI.
- **Dependencies:** Phase 4. Blockers for Phase 6.

### Phase 6: Invigilator Portal & Automated Attendance
- [x] Build Mobile-first UI for the Invigilator room selection.
- [x] Integrate `html5-qrcode` to enable camera-based scanning in the browser.
- [x] Implement real-time Web API to register scans, handle duplicate rejections, and manual toggles.
- **Dependencies:** Phase 5.

### Phase 7: Analytics, Polish & Deployment
- [x] Build Admin Attendance Reports featuring Recharts graphs.
- [x] Export features (json2csv) for post-exam reporting.
- [x] E2E testing and UX polish.
- [x] Deploy backend to Render/Railway and frontend to Vercel.
- **Dependencies:** Phase 6.

---

## 2. TIMELINE ESTIMATE

Assuming a team of 2-3 experienced developers (10+ years), or highly capable senior students putting in strong, focused hours:

| Phase | Days (Experienced Team) | Days (College Students - Part Time) | Parallelizable Tasks |
| --- | --- | --- | --- |
| 1. Setup | 1 day | 3 days | DB setup (BE) / Vite setup (FE) |
| 2. Auth & DB | 2 days | 5 days | Schema config / Auth UI screens |
| 3. Core Admin | 3 days | 7 days | UI components / API Routes |
| 4. Algorithm | 3 days | 7-10 days | *Standalone BE task* / Grid UI |
| 5. Hall Tickets | 2 days | 5 days | PDF gen (BE) / Ticket UI (FE) |
| 6. Invigilator | 3 days | 7 days | Scanner integration / API endpoints |
| 7. Analytics | 2 days | 5 days | Chart UI / Endpoint aggregation |
| **Total** | **~16 Days (3 Weeks)** | **~35-42 Days (5-6 Weeks)** | |

---

## 3. DATABASE DESIGN (Prisma ORM)

```prisma
model User {
  id           String   @id @default(uuid())
  role         Role     // Enum: ADMIN, STUDENT, INVIGILATOR
  email        String?  @unique // For Admin/Invigilator
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}

model StudentProfile {
  id        String   @id @default(uuid())
  rollNo    String   @unique
  dob       DateTime // Used for student auth combined with rollNo
  userId    String   @unique
  branch    String   // e.g. "CS", "IT"
  user      User     @relation(fields: [userId], references: [id])
}

model Room {
  id          String   @id @default(uuid())
  name        String   // e.g. "Room 101"
  building    String
  rows        Int
  seatsPerRow Int
  capacity    Int      // Derived: rows * seatsPerRow
  allocations SeatAllocation[]
}

model Exam {
  id          String   @id @default(uuid())
  subject     String
  date        DateTime
  startTime   String
  endTime     String
  branches    String[] // Array of applicable branches like ["CS", "IT"]
  allocations SeatAllocation[]
}

model SeatAllocation {
  id             String   @id @default(uuid())
  examId         String
  roomId         String
  studentId      String
  rowNo          Int
  colNo          Int
  qrToken        String   @unique // Signed JWT for secure attendance
  status         Status   @default(UNMARKED) // Enum: UNMARKED, PRESENT, ABSENT
  scannedAt      DateTime?
  scannedBy      String?  // Invigilator ID
  
  exam           Exam     @relation(fields: [examId], references: [id])
  room           Room     @relation(fields: [roomId], references: [id])
  student        StudentProfile @relation(fields: [studentId], references: [id])

  @@unique([examId, roomId, rowNo, colNo]) // Prevent double booking a physical seat
}
```

> [!TIP]
> **Tricky Relationship**: `SeatAllocation` is the central junction. To avoid massive JOIN costs when doing Admin Grids, we'll index `[examId, roomId]`. To ensure data integrity, the `@@unique` constraint guarantees a specific physical seat is never double-booked per given exam.

---

## 4. API DESIGN (REST)

**Auth**
- `POST /api/auth/login` - Validates credentials, returns JWT (Admin/Invigilator uses Email/Hash, Student uses RollNo/DOB).

**Admin: Rooms & Students**
- `GET/POST/PUT /api/admin/rooms` - Manage physical infrastructure.
- `POST /api/admin/students/upload` - Multipart CSV upload. Returns array of parse errors/successes.

**Admin: Exams & Allocations**
- `GET/POST/PUT /api/admin/exams` - Manage exam metadata.
- `POST /api/admin/allocations/generate/:examId` - Invokes core algorithm.
- `GET /api/admin/allocations/grid/:examId/:roomId` - Fetches the 2D populated matrix.

**Student Portal**
- `GET /api/student/hall-ticket/:examId` - Returns metadata and QR Token.
- `GET /api/student/hall-ticket/:examId/pdf` - Returns binary PDFKit blob.

**Invigilator & Attendance**
- `GET /api/invigilator/assignments` - Gets exams assigned for to the requesting invigilator today.
- `GET /api/invigilator/room/:roomId/:examId` - Gets full list of students.
- `POST /api/invigilator/attendance/scan` - Body: `{ qrToken }`. Validates token against exam context and updates status.
- `POST /api/invigilator/attendance/toggle` - Manual fallback toggle.

---

## 5. COMPONENT TREE (React)

```
<AppRouter>
  ├── <LoginPage />
  │
  ├── <AdminLayout>  (Context: AdminAuth)
  │    ├── <Sidebar />
  │    ├── <DashboardPage /> 
  │    ├── <RoomsPage>
  │    │    ├── <RoomListTable />
  │    │    └── <RoomConfigModal />
  │    ├── <ExamSchedulePage />
  │    ├── <AllocationPage>
  │    │    ├── <BranchDistributionStats />
  │    │    └── <SeatGridVisualizer /> (Dynamic 2D Array Visualizer)
  │    └── <ReportsPage>
  │         ├── <RechartsBarGraph />
  │         └── <ExportCSVButton />
  │
  ├── <StudentLayout> (Context: StudentAuth)
  │    └── <HallTicketDashboard>
  │         ├── <ExamMetadataCard />
  │         ├── <QRCodeDisplay />
  │         └── <DownloadPDFButton />
  │
  └── <InvigilatorLayout> (Context: InvigilatorAuth)
       └── <AttendanceScannerPage>
            ├── <html5-qrcode-ScannerWidget />
            ├── <ScanSuccessIndicator />
            └── <StudentListBottomSheet>
                 └── <ManualPresentToggle />
```

---

## 6. ALGORITHM PLAN (Pseudocode)

```javascript
function generateSeatAllocation(examId, students, availableRooms) {
  // 1. Group students by branch and sort by highest headcount
  const branches = groupBy(students, "branch"); 
  const sortedBranchKeys = Object.keys(branches).sort((a,b) => branches[b].length - branches[a].length);
  
  let allocations = [];
  let studentCount = students.length;

  // 2. Iterate through rooms
  for (let room of availableRooms) {
    let grid = create2DArray(room.rows, room.seatsPerRow);

    for (let r = 0; r < room.rows; r++) {
      for (let c = 0; c < room.seatsPerRow; c++) {
        if (studentCount === 0) return allocations; // Base Exit Case
        
        // 3. Find valid branch preventing adjacent clones
        let validBranch = null;
        for (let branchCode of sortedBranchKeys) {
           if (branches[branchCode].length === 0) continue;

           const leftNeighbor = c > 0 ? grid[r][c-1]?.branch : null;
           const topNeighbor = r > 0 ? grid[r-1][c]?.branch : null;

           if (branchCode !== leftNeighbor && branchCode !== topNeighbor) {
               validBranch = branchCode;
               break;
           }
        }

        // 4. Edge Cases: If no valid branch (e.g. only 1 branch left or single-branch exam)
        if (!validBranch) {
           // Relax constraint: Pick biggest remaining branch
           validBranch = sortedBranchKeys.find(b => branches[b].length > 0);
        }

        const student = branches[validBranch].pop();
        grid[r][c] = student;
        studentCount--;

        const qrToken = generateSignedJWT({ studentId: student.id, examId });
        
        allocations.push({
           roomId: room.id, studentId: student.id, examId, rowNo: r, colNo: c, qrToken 
        });
      }
    }
  }
  
  if (studentCount > 0) throw new Error("Insufficient Capacity constraints hit.");
  return allocations;
}
```

> [!WARNING]
> **Algorithm Edge Cases**:
> - Re-running allocation **drops existing rows** for that specific `examId` and generates a fresh set, effectively invalidating previously downloaded hall tickets.
> - Odd capacities are handled cleanly because the 2D matrix maps physical grid points. Blank spots at the end of a room simply have no assignment records.

---

## 7. RISK & CHALLENGES

- **QR Scanner Reliability**: The browser's camera API (`getUserMedia`) works best in good lighting and requires HTTPS. *Solution*: We are using `html5-qrcode` handling different device capability curves, explicitly providing a robust manual fallback list to unblock invigilators.
- **Server Load on PDF Generation**: If 1000 students hit `/hall-ticket/pdf` at identical times, generation blocking could stall the Express Loop. *Shortcut/College workaround*: Compute them sync or lightly clustered, as 1000 users is a trivial ceiling for a standard Node server. For prod, use a queuing service or pre-generate on S3.
- **Overwriting Allocations**: An admin accidentally re-runs allocation on exam day. *Fix*: Lock the allocation endpoint 24 hours prior to the exam unless an override flag is strictly provided.

---

## 8. SUGGESTED BUILD ORDER (MVP FIRST)

**Phase 1: Minimum Viable Product (The "Core Idea")**
Do this first. If you stop here, you have a solid demonstration.
1. Database Schema and Admin Auth.
2. Room Management.
3. Exam and generic Student Data insertion (skipping CSV, pure API seed).
4. **The Allocation Engine (Most critical)**.
5. Admin Visualization of the Seat Grid.

**Phase 2: Adding the Actor Journeys**
1. Student Auth (RollNo + DOB).
2. Hall Ticket visualization and QR Generation (just UI, wait on PDF).
3. Invigilator Auth and Attendance toggle list.

**Phase 3: The "Wow" Features (Final Polish)**
1. In-browser QR Code Mobile Scanning.
2. PDF automatic dynamic render.
3. CSV Exports.
4. Analytics & UI Dashboard Dashboards.

---

## Open Questions
1. Do you have a specific Tailwind CSS component structure in mind (we suggested `shadcn/ui` since it is professional grade)?
2. Do we require QR token encryption or is a standard JWT with signature sufficient?
3. What happens if an invigilator checks out a student by mistake (can they toggle "Absent" again without overriding logs)?

## Verification Plan
1. **Algorithm Visual Check**: Create an intensive mock test using 5 branches with highly skewed numbers (e.g., 200 CS, 10 IT). Run algorithm and ensure the output React Grid successfully renders red/green warning squares if any adjacent borders fail the criteria.
2. **Attendance Mobile Test**: Open the application locally hooked to localhost IP, scan a generated PDF ticket with a mobile device, and ensure WebSockets/API instantly marks the UI as green for the correct row/col.
