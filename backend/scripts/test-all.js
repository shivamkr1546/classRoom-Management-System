/**
 * Comprehensive Build Test Runner
 * Runs ALL tests and reports ERRORS FIRST
 */

import chalk from 'chalk';
import { execSync } from 'child_process';

console.log(chalk.cyan.bold('\n' + '='.repeat(70)));
console.log(chalk.cyan.bold('🧪 COMPREHENSIVE BUILD VERIFICATION'));
console.log(chalk.cyan.bold('='.repeat(70) + '\n'));

const testSuites = [
    { name: 'Phase 2 - Resource Management', script: 'scripts/test-phase2-apis.js' },
    { name: 'Phase 3 - Scheduling Engine', script: 'scripts/test-phase3-apis.js' },
    { name: 'Phase 4 - Attendance & Analytics', script: 'scripts/test-phase4-apis.js' }
];

const results = [];
let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

// Run all tests
for (const suite of testSuites) {
    console.log(chalk.blue(`\n▶ Running ${suite.name}...`));
    console.log(chalk.gray('─'.repeat(70)));

    try {
        const output = execSync(`node ${suite.script}`, {
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 10 * 1024 * 1024
        });

        // Parse output for pass/fail counts
        const passMatch = output.match(/(\d+)\/(\d+) tests passed/);
        if (passMatch) {
            const passed = parseInt(passMatch[1]);
            const total = parseInt(passMatch[2]);
            totalTests += total;
            totalPassed += passed;
            totalFailed += (total - passed);

            results.push({
                name: suite.name,
                status: passed === total ? 'PASSED' : 'FAILED',
                passed,
                total,
                output
            });
        } else {
            results.push({
                name: suite.name,
                status: 'COMPLETED',
                output
            });
        }

        console.log(chalk.gray(output.substring(0, 500)));

    } catch (error) {
        totalFailed++;
        results.push({
            name: suite.name,
            status: 'ERROR',
            error: error.message,
            output: error.stdout || error.stderr || ''
        });
        console.log(chalk.red('✖ Suite failed with error'));
    }
}

// ========================================
// ERRORS FIRST
// ========================================
console.log('\n\n' + chalk.red.bold('═'.repeat(70)));
console.log(chalk.red.bold('❌ ERRORS & FAILURES'));
console.log(chalk.red.bold('═'.repeat(70)) + '\n');

const failures = results.filter(r => r.status === 'FAILED' || r.status === 'ERROR');

if (failures.length === 0) {
    console.log(chalk.green('✓ No errors found! All tests passed.\n'));
} else {
    failures.forEach(result => {
        console.log(chalk.red.bold(`\n⚠️  ${result.name}`));
        console.log(chalk.red('─'.repeat(70)));

        if (result.status === 'ERROR') {
            console.log(chalk.red(`Error: ${result.error}`));
            if (result.output) {
                console.log(chalk.gray(result.output.substring(0, 800)));
            }
        } else if (result.status === 'FAILED') {
            console.log(chalk.yellow(`Failed: ${result.total - result.passed}/${result.total} tests`));
            // Extract failed test details from output
            const failedTests = result.output.match(/❌.*$/gm);
            if (failedTests) {
                failedTests.forEach(line => console.log(chalk.red('  ' + line)));
            }
        }
    });
}

// ========================================
// SUMMARY
// ========================================
console.log('\n\n' + chalk.cyan.bold('═'.repeat(70)));
console.log(chalk.cyan.bold('📊 TEST SUMMARY'));
console.log(chalk.cyan.bold('═'.repeat(70)) + '\n');

results.forEach(result => {
    const icon = result.status === 'PASSED' || result.status === 'COMPLETED' ? chalk.green('✓') : chalk.red('✖');
    const status = result.status === 'PASSED' ? chalk.green(result.status) :
        result.status === 'FAILED' ? chalk.red(result.status) :
            result.status === 'ERROR' ? chalk.red(result.status) :
                chalk.blue(result.status);

    if (result.passed !== undefined) {
        console.log(`${icon} ${result.name}: ${status} (${result.passed}/${result.total})`);
    } else {
        console.log(`${icon} ${result.name}: ${status}`);
    }
});

console.log('\n' + chalk.cyan('─'.repeat(70)));
console.log(chalk.cyan(`Total Tests: ${totalTests}`));
console.log(chalk.green(`Passed: ${totalPassed}`));
console.log(chalk.red(`Failed: ${totalFailed}`));

const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
console.log(chalk.cyan(`Success Rate: ${successRate}%`));

// ========================================
// FINAL VERDICT
// ========================================
console.log('\n' + chalk.cyan.bold('═'.repeat(70)));
if (totalFailed === 0 && results.every(r => r.status !== 'ERROR')) {
    console.log(chalk.green.bold('🎉 BUILD VERIFICATION: PASSED'));
    console.log(chalk.green.bold('All systems operational!'));
} else {
    console.log(chalk.red.bold('⚠️  BUILD VERIFICATION: FAILED'));
    console.log(chalk.yellow.bold('Review errors above and fix issues.'));
}
console.log(chalk.cyan.bold('═'.repeat(70)) + '\n');

process.exit(totalFailed === 0 && results.every(r => r.status !== 'ERROR') ? 0 : 1);
