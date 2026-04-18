"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sync_1 = require("csv-parse/sync");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Lazy singleton \u2014 created once on first import, AFTER dotenv has loaded
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function loadData() {
    console.log('Loading students...');
    const studentsCsv = fs.readFileSync(path.join(__dirname, '../../students.csv'), 'utf-8');
    const studentsRecords = (0, sync_1.parse)(studentsCsv, { columns: true, trim: true, skip_empty_lines: true });
    let studentsCreated = 0;
    for (const row of studentsRecords) {
        const rRollNo = row.rollno || row.roll_no || row.roll_num || '';
        const rName = row.nameid || row.name || row.student_name || 'Unknown';
        const rBranch = row.branch || row.department || 'Unknown';
        const rDob = row.dob || '2004-01-01';
        const rEmail = row.email || null;
        if (!rRollNo || !rName)
            continue;
        try {
            const hash = await bcrypt_1.default.hash(rRollNo, 10);
            await prisma.user.create({
                data: {
                    name: rName,
                    email: rEmail,
                    passwordHash: hash,
                    role: 'STUDENT',
                    student: {
                        create: {
                            rollNo: rRollNo,
                            dob: new Date(rDob),
                            branch: rBranch,
                        }
                    }
                }
            });
            studentsCreated++;
        }
        catch (err) {
            if (err.code !== 'P2002')
                console.error('Error importing student:', rRollNo, err.message);
        }
    }
    console.log(`Loaded ${studentsCreated} students.`);
    console.log('Loading rooms...');
    const roomsCsv = fs.readFileSync(path.join(__dirname, '../../room.csv'), 'utf-8');
    const roomsRecords = (0, sync_1.parse)(roomsCsv, { columns: true, trim: true, skip_empty_lines: true });
    let roomsCreated = 0;
    for (const row of roomsRecords) {
        const name = row.room_no || row.room_name || row.name;
        const building = row.floor || row.building || 'Main';
        const rows = Number(row.rows || 10);
        const seatsPerRow = Number(row.cols || row.seats_per_row || 10);
        if (!name)
            continue;
        try {
            await prisma.room.upsert({
                where: { name },
                update: { building, rows, seatsPerRow, capacity: rows * seatsPerRow },
                create: { name, building, rows, seatsPerRow, capacity: rows * seatsPerRow }
            });
            roomsCreated++;
        }
        catch (err) {
            console.error('Error importing room:', name, err.message);
        }
    }
    console.log(`Loaded ${roomsCreated} rooms.`);
}
loadData().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=loadInitial.js.map