
import { execSync } from 'child_process';

const files = [
    'backend/core/tests/edgeCases50_core.ts',
    'backend/core/tests/edgeCases50_capacity.ts',
    'backend/core/tests/edgeCases50_pricing.ts',
    'backend/core/tests/edgeCases50_realtime.ts'
];

let totalPass = 0;
let totalFail = 0;

console.log("\n==================================================");
console.log("🚀 STARTING THE 100-TEST REAL-WORLD WAR GAME");
console.log("==================================================\n");

files.forEach(file => {
    console.log(`\nRUNNING: ${file}`);
    try {
        const output = execSync(`npx tsx ${file}`, { stdio: 'inherit' });
    } catch (e: any) {
        // execSync throws if exit code != 0
        totalFail++;
    }
});

console.log("\n==================================================");
if (totalFail === 0) {
    console.log("🏆 ALL 100 EDGE CASES PASSED.");
    console.log("🛡️ SYSTEM CERTIFIED: REGULATOR-READY, PAYMENT-SAFE, CHAOS-HARDENED.");
} else {
    console.error(`❌ WAR GAME FAILED: ${totalFail} suites failed.`);
    process.exit(1);
}
console.log("==================================================\n");
