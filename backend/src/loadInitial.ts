import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Lazy singleton \u2014 created once on first import, AFTER dotenv has loaded
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function loadData() {
  console.log('Loading students...');
  const studentsCsv = fs.readFileSync(path.join(__dirname, '../../students.csv'), 'utf-8');
  const studentsRecords = parse(studentsCsv, { columns: true, trim: true, skip_empty_lines: true });

  let studentsCreated = 0;
  for (const row of studentsRecords) {
    const rRollNo = row.rollno || row.roll_no || row.roll_num || '';
    const rName   = row.nameid || row.name || row.student_name || 'Unknown';
    const rBranch = row.branch || row.department || 'Unknown';
    const rDob    = row.dob || '2004-01-01';
    const rEmail  = row.email || null;

    if (!rRollNo || !rName) continue;

    try {
      const hash = await bcrypt.hash(rRollNo, 10);
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
    } catch (err: any) {
      if (err.code !== 'P2002') console.error('Error importing student:', rRollNo, err.message);
    }
  }
  console.log(`Loaded ${studentsCreated} students.`);

  console.log('Loading rooms...');
  const roomsCsv = fs.readFileSync(path.join(__dirname, '../../room.csv'), 'utf-8');
  const roomsRecords = parse(roomsCsv, { columns: true, trim: true, skip_empty_lines: true });

  let roomsCreated = 0;
  for (const row of roomsRecords) {
    const name = row.room_no || row.room_name || row.name;
    const building = row.floor || row.building || 'Main';
    const rows = Number(row.rows || 10);
    const seatsPerRow = Number(row.cols || row.seats_per_row || 10);

    if (!name) continue;

    try {
      await prisma.room.upsert({
        where: { name },
        update: { building, rows, seatsPerRow, capacity: rows * seatsPerRow },
        create: { name, building, rows, seatsPerRow, capacity: rows * seatsPerRow }
      });
      roomsCreated++;
    } catch (err: any) {
      console.error('Error importing room:', name, err.message);
    }
  }
  console.log(`Loaded ${roomsCreated} rooms.`);
}

loadData().catch(console.error).finally(() => prisma.$disconnect());
