import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  await prisma.studentProfile.deleteMany({})
  await prisma.user.deleteMany({ where: { role: 'STUDENT' } })
  console.log("✅ WIPED ALL STUDENTS")
}
run().catch(console.error).finally(() => prisma.$disconnect())
