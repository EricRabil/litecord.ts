let INCREMENT: number = 0;
const EPOCH: number = 1514764800;

import * as Long from "long";

function pad(v: any, n: any, c: any = "0") {
    return String(v).length >= n ? String(v) : (String(c).repeat(n) + v).slice(-n);
}

export function generate(time = Date.now()) {
    if (INCREMENT >= 4095) {
        INCREMENT = 0;
    }
    if (isNaN((new Date(time)).getTime()) && typeof time === "number") {
        throw new Error(`Invalid timestamp`);
    }
    const BINARY = `${pad((time - EPOCH).toString(2), 42)}0000100000${pad((INCREMENT++).toString(2), 12)}`;
    return Long.fromString(BINARY, 2).toString();
}
