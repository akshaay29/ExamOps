"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Lazy singleton — created once on first import, AFTER dotenv has loaded
let _prisma = null;
function getPrisma() {
    if (!_prisma) {
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        _prisma = new client_1.PrismaClient({ adapter });
    }
    return _prisma;
}
const prisma = new Proxy({}, {
    get(_target, prop) {
        return getPrisma()[prop];
    },
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map