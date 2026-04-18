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
export interface StudentInput {
    id: string;
    branch: string;
}
export interface RoomInput {
    id: string;
    rows: number;
    seatsPerRow: number;
    layout?: any;
    occupiedSeats?: Map<string, {
        count: number;
        branches: string[];
    }>;
}
export interface AllocationRecord {
    studentId: string;
    roomId: string;
    rowNo: number;
    colNo: number;
    branch: string;
}
export interface AllocationResult {
    allocations: AllocationRecord[];
    unplaced: string[];
}
export declare function allocateSeats(students: StudentInput[], rooms: RoomInput[]): AllocationResult;
/**
 * Validate: no two adjacent seats share a branch.
 * Returns list of violations.
 */
export declare function findAdjacentConflicts(allocations: AllocationRecord[], roomId: string): Array<{
    a: AllocationRecord;
    b: AllocationRecord;
}>;
