"use strict";
/**
 * ExamOps Seat Allocation Algorithm
 * -----------------------------------
 * Round-robin interleaving ensures no two adjacent seats (horizontal OR vertical)
 * share the same branch code.
 *
 * Strategy (greedy with per-seat re-evaluation):
 *  1. Group students by branch.
 *  2. For each seat (row-major), pick the branch with the most remaining students
 *     that does NOT conflict with left OR top neighbour.
 *  3. If no non-conflicting branch exists (fully constrained), relax and pick
 *     the largest remaining group regardless.
 *  4. Continue across multiple rooms until all students placed or rooms exhausted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateSeats = allocateSeats;
exports.findAdjacentConflicts = findAdjacentConflicts;
/** Pick best branch for a seat: avoids left+top neighbours, prefers most remaining */
function pickBranch(pool, leftBranch, topBranch) {
    // Sort branches by descending pool size for greedy choice
    const sorted = [...pool.keys()]
        .filter(b => pool.get(b).length > 0)
        .sort((a, b) => pool.get(b).length - pool.get(a).length);
    if (sorted.length === 0)
        return null;
    // Try to find one that doesn't conflict
    const nonConflicting = sorted.find(b => b !== leftBranch && b !== topBranch);
    if (nonConflicting)
        return nonConflicting;
    // Relax: just pick the biggest pool
    return sorted[0] ?? null;
}
function allocateSeats(students, rooms) {
    // Build pool map: branch → [studentId, ...]
    const pool = new Map();
    for (const s of students) {
        if (!pool.has(s.branch))
            pool.set(s.branch, []);
        pool.get(s.branch).push(s.id);
    }
    const allocations = [];
    const totalRemaining = () => [...pool.values()].reduce((n, arr) => n + arr.length, 0);
    for (const room of rooms) {
        if (totalRemaining() === 0)
            break;
        // Parse layout for broken capacities
        const layoutCaps = Array.from({ length: room.rows }, () => Array(room.seatsPerRow).fill(1));
        if (Array.isArray(room.layout)) {
            for (const item of room.layout) {
                if (item.row < room.rows && item.col < room.seatsPerRow)
                    layoutCaps[item.row][item.col] = item.cap;
            }
        }
        const grid = Array.from({ length: room.rows }, () => Array(room.seatsPerRow).fill(null));
        if (room.occupiedSeats) {
            for (const [key, stats] of room.occupiedSeats.entries()) {
                const [rStr, cStr] = key.split('-');
                const r = parseInt(rStr, 10);
                const c = parseInt(cStr, 10);
                if (r < room.rows && c < room.seatsPerRow && stats.branches.length > 0) {
                    grid[r][c] = stats.branches[stats.branches.length - 1];
                }
            }
        }
        for (let r = 0; r < room.rows; r++) {
            for (let c = 0; c < room.seatsPerRow; c++) {
                if (totalRemaining() === 0)
                    break;
                const currentOccupancy = room.occupiedSeats?.get(`${r}-${c}`)?.count || 0;
                if (layoutCaps[r][c] === 0 || currentOccupancy >= layoutCaps[r][c])
                    continue;
                const leftBranch = c > 0 ? grid[r][c - 1] ?? null : null;
                const topBranch = r > 0 ? grid[r - 1][c] ?? null : null;
                let assignedInSeat = currentOccupancy;
                while (assignedInSeat < layoutCaps[r][c] && totalRemaining() > 0) {
                    const chosen = pickBranch(pool, leftBranch, topBranch);
                    if (!chosen)
                        break;
                    const studentId = pool.get(chosen).shift();
                    grid[r][c] = chosen;
                    allocations.push({ studentId, roomId: room.id, rowNo: r, colNo: c, branch: chosen });
                    assignedInSeat++;
                }
            }
        }
    }
    // Collect unplaced
    const unplaced = [];
    for (const arr of pool.values())
        unplaced.push(...arr);
    return { allocations, unplaced };
}
/**
 * Validate: no two adjacent seats share a branch.
 * Returns list of violations.
 */
function findAdjacentConflicts(allocations, roomId) {
    const byRoom = allocations.filter(a => a.roomId === roomId);
    const grid = new Map();
    for (const a of byRoom)
        grid.set(`${a.rowNo},${a.colNo}`, a);
    const conflicts = [];
    for (const a of byRoom) {
        const right = grid.get(`${a.rowNo},${a.colNo + 1}`);
        const below = grid.get(`${a.rowNo + 1},${a.colNo}`);
        if (right && right.branch === a.branch)
            conflicts.push({ a, b: right });
        if (below && below.branch === a.branch)
            conflicts.push({ a, b: below });
    }
    return conflicts;
}
//# sourceMappingURL=seatingAlgorithm.js.map