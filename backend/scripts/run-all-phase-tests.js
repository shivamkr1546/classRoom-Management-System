import { execSync } from 'child_process';
import fs from 'fs';

console.log('\n========================================');
console.log('🧪 COMPREHENSIVE BUILD TESTING');
console.log('========================================\n');

const tests = [
    { name: 'Phase 2', script: 'scripts/test-phase2-apis.js' },
    { name: 'Phase 3', script: 'scripts/test-phase3-apis.js' },
    { name: 'Phase 4', script: 'scripts/test-phase4-apis.js' }
];

const results = [];

for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running ${test.name} Tests...`);
    console.log('='.repeat(60));

    try {
        const output = execSync(`node ${test.script}`, {
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 10 * 1024 * 1024
        });
        console.log(output);
        results.push({ name: test.name, status: 'PASSED', output });
    } catch (error) {
        console.log(error.stdout || '');
        console.log(error.stderr || '');
        results.push({ name: test.name, status: 'FAILED', error: error.message });
    }
}

console.log('\n\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
});

const allPassed = results.every(r => r.status === 'PASSED');
console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));

// Write summary to file
const summary = {
    timestamp: new Date().toISOString(),
    results,
    allPassed
};

fs.writeFileSync('test-summary.json', JSON.stringify(summary, null, 2));
console.log('\n📝 Test summary saved to test-summary.json\n');

process.exit(allPassed ? 0 : 1);
