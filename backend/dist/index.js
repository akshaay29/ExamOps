"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const students_1 = __importDefault(require("./routes/students"));
const exams_1 = __importDefault(require("./routes/exams"));
const allocation_1 = __importDefault(require("./routes/allocation"));
const hallTicket_1 = __importDefault(require("./routes/hallTicket"));
const student_1 = __importDefault(require("./routes/student"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const reports_1 = __importDefault(require("./routes/reports"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json());
// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ExamOps API' }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/admin/rooms', rooms_1.default);
app.use('/api/admin/students', students_1.default);
app.use('/api/admin/exams', exams_1.default);
app.use('/api/admin/allocations', allocation_1.default);
app.use('/api/student', student_1.default);
app.use('/api/student/hall-ticket', hallTicket_1.default);
app.use('/api/invigilator/attendance', attendance_1.default);
app.use('/api/admin/reports', reports_1.default);
app.listen(PORT, () => console.log(`🚀 ExamOps API running on port ${PORT}`));
//# sourceMappingURL=index.js.map