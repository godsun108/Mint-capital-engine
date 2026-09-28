import assert from "node:assert/strict";
import { parseCsvLine } from "./csv.js";
assert.deepEqual(parseCsvLine("a,b,c"),["a","b","c"]);
assert.deepEqual(parseCsvLine('2026-09-21T13:30:00Z,,web,"New York, NY"'),["2026-09-21T13:30:00Z","","web","New York, NY"]);
assert.deepEqual(parseCsvLine('a,"said ""yes""",c'),["a",'said "yes"',"c"]);
assert.throws(()=>parseCsvLine('a,"broken,c'),/Unclosed quoted CSV field/);
console.log("lead response CSV tests passed");
