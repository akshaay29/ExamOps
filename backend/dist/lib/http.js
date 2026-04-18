"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleValue = getSingleValue;
function getSingleValue(value) {
    if (Array.isArray(value))
        return value[0];
    return value;
}
//# sourceMappingURL=http.js.map