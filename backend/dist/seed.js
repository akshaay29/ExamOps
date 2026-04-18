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
/**
 * seed.ts — Wipes ExamOps database and populates only Staff demo accounts
 * Run: npm run seed
 */
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function seedAdmins() {
    console.log('👤 Seeding admin & invigilator accounts...');
    const hash = (p) => bcrypt_1.default.hash(p, 10);
    const admins = [
        { name: 'Akshay Gupta', email: 'guptaakshay798@gmail.com', role: 'ADMIN' },
        { name: 'Mr. Akki', email: 'ak129gp@gmail.com', role: 'INVIGILATOR' },
    ];
    for (const a of admins) {
        await prisma.user.upsert({
            where: { email: a.email },
            update: {},
            create: { name: a.name, email: a.email, passwordHash: await hash('magic_link_only'), role: a.role }
        });
    }
    console.log(`  ✅ ${admins.length} staff accounts seeded`);
}
async function main() {
    console.log('\n🧹 Wiping all previous demo data...');
    await prisma.seatAllocation.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany({
        where: {
            email: {
                notIn: ['guptaakshay798@gmail.com', 'ak129gp@gmail.com']
            }
        }
    });
    console.log('\n🚀 ExamOps Fresh Install Seed');
    await seedAdmins();
    console.log('\n✅ All done! Database is ready with your custom Admin and Invigilator accounts.');
    console.log('🔗 You can securely log in via Magic Links using their respective emails.\n');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map