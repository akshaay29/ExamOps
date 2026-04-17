/**
 * seed.ts — Wipes ExamOps database and populates only Staff demo accounts
 * Run: npm run seed
 */
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function seedAdmins() {
  console.log('👤 Seeding admin & invigilator accounts...')
  const hash = (p: string) => bcrypt.hash(p, 10)

  const admins = [
    { name: 'Akshay Gupta', email: 'guptaakshay798@gmail.com', role: 'ADMIN' as const },
    { name: 'Mr. Akki', email: 'ak129gp@gmail.com', role: 'INVIGILATOR' as const },
  ]

  for (const a of admins) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: { name: a.name, email: a.email, passwordHash: await hash('magic_link_only'), role: a.role }
    })
  }
  console.log(`  ✅ ${admins.length} staff accounts seeded`)
}

async function main() {
  console.log('\n🧹 Wiping all previous demo data...')
  await prisma.seatAllocation.deleteMany()
  await prisma.exam.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.room.deleteMany()
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['guptaakshay798@gmail.com', 'ak129gp@gmail.com']
      }
    }
  })

  console.log('\n🚀 ExamOps Fresh Install Seed')
  await seedAdmins()

  console.log('\n✅ All done! Database is ready with your custom Admin and Invigilator accounts.')
  console.log('🔗 You can securely log in via Magic Links using their respective emails.\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
