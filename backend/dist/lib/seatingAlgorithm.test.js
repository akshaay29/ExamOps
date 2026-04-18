"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const seatingAlgorithm_1 = require("./seatingAlgorithm");
let passed = 0;
let failed = 0;
function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    }
    else {
        console.error(`  ❌ FAIL: ${label}`);
        failed++;
    }
}
function makeStudents(counts) {
    const out = [];
    for (const [branch, n] of Object.entries(counts))
        for (let i = 0; i < n; i++)
            out.push({ id: `${branch}-${i}`, branch });
    return out;
}
// Room 5 rows × 6 cols = 30 seats
const ROOM = { id: 'R1', rows: 5, seatsPerRow: 6 };
// ── Test 1: Zero conflicts with branches = seatsPerRow ────────────────────────
console.log('\n📋 Test 1: No adjacent conflicts (6 branches × 5 = 30, seatsPerRow=6)');
{
    // 6 branches of 5 students → 6 seats per row → perfect alternation
    const students = makeStudents({ CS: 5, IT: 5, ME: 5, CE: 5, EC: 5, EE: 5 });
    const { allocations } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM]);
    const conflicts = (0, seatingAlgorithm_1.findAdjacentConflicts)(allocations, 'R1');
    assert(conflicts.length === 0, `Zero conflicts with seatsPerRow=branches (got ${conflicts.length})`);
    assert(allocations.length === 30, 'All 30 students placed');
}
// ── Test 1b: 3 balanced branches — near-zero conflicts ────────────────────────
console.log('\n📋 Test 1b: Near-zero conflicts (3 branches × 10, seatsPerRow=6)');
{
    const students = makeStudents({ CS: 10, IT: 10, ME: 10 });
    const { allocations } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM]);
    const conflicts = (0, seatingAlgorithm_1.findAdjacentConflicts)(allocations, 'R1');
    // 6 cols, 3 branches — greedy fills cleanly until last branch at boundary
    assert(conflicts.length <= 2, `≤2 conflicts acceptable at row boundaries (got ${conflicts.length})`);
    assert(allocations.length === 30, 'All 30 placed');
}
// ── Test 2: Single-branch ─────────────────────────────────────────────────────
console.log('\n📋 Test 2: Single-branch exam');
{
    const students = makeStudents({ CS: 12 });
    const { allocations, unplaced } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM]);
    assert(allocations.length === 12, 'All 12 placed (constraint relaxed)');
    assert(unplaced.length === 0, 'No students unplaced');
}
// ── Test 3: Skewed ────────────────────────────────────────────────────────────
console.log('\n📋 Test 3: Skewed branch sizes (CS=20, IT=3, ME=3)');
{
    const students = makeStudents({ CS: 20, IT: 3, ME: 3 });
    const { allocations } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM]);
    assert(allocations.length === 26, 'All 26 placed');
    const conflicts = (0, seatingAlgorithm_1.findAdjacentConflicts)(allocations, 'R1');
    console.log(`     Conflicts with skew: ${conflicts.length} (expected due to CS dominance)`);
}
// ── Test 4: Overflow ─────────────────────────────────────────────────────────
console.log('\n📋 Test 4: Student overflow (35 students, 30 seats)');
{
    const students = makeStudents({ CS: 12, IT: 12, ME: 11 });
    const { allocations, unplaced } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM]);
    assert(allocations.length === 30, 'Exactly 30 placed');
    assert(unplaced.length === 5, '5 unplaced');
}
// ── Test 5: Multi-room ───────────────────────────────────────────────────────
console.log('\n📋 Test 5: Overflow across 2 rooms (5×6=30 + 4×5=20 = 50)');
{
    const students = makeStudents({ CS: 18, IT: 18, ME: 14 });
    const room2 = { id: 'R2', rows: 4, seatsPerRow: 5 };
    const { allocations, unplaced } = (0, seatingAlgorithm_1.allocateSeats)(students, [ROOM, room2]);
    assert(allocations.length === 50, `All 50 placed (got ${allocations.length})`);
    assert(unplaced.length === 0, 'No unplaced');
    const c1 = (0, seatingAlgorithm_1.findAdjacentConflicts)(allocations, 'R1');
    const c2 = (0, seatingAlgorithm_1.findAdjacentConflicts)(allocations, 'R2');
    assert(c1.length === 0, `Room 1: zero conflicts (got ${c1.length})`);
    assert(c2.length === 0, `Room 2: zero conflicts (got ${c2.length})`);
}
// ── Test 6: Empty ────────────────────────────────────────────────────────────
console.log('\n📋 Test 6: Empty student list');
{
    const { allocations, unplaced } = (0, seatingAlgorithm_1.allocateSeats)([], [ROOM]);
    assert(allocations.length === 0, 'No allocations');
    assert(unplaced.length === 0, 'No unplaced');
}
// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(44)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0)
    process.exit(1);
//# sourceMappingURL=seatingAlgorithm.test.js.map