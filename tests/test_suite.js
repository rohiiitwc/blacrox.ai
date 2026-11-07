const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../server');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');
const { evaluateCandleOutcome } = require('../services/evaluationService');
const { calibratePriceLevels, getExpectedPriceRange } = require('../services/priceCalibrator');
const { extractAndParseJson } = require('../services/parseHelper');
const { analyzeWithChatGPT } = require('../services/openaiService');
const { analyzeWithGrok } = require('../services/grokService');
const { analyzeWithGemini, getGeminiApiKey } = require('../services/geminiService');

const PORT = 3001; // Separate port for testing
let server;
const BASE_URL = `http://localhost:${PORT}`;

function createSampleImage(filename) {
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  // Valid minimal 1x1 PNG bytes
  const pngBytes = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex');
  fs.writeFileSync(filePath, pngBytes);
  return filePath;
}

function createSampleTextFile(filename) {
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, 'This is an invalid text file not an image');
  return filePath;
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE BLACROX.AI TEST SUITE');
  console.log('=======================================================\n');

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  const testUserA = {
    full_name: 'Test Trader Alpha',
    email: `trader.alpha.${Date.now()}@example.com`,
    password: 'Password123!',
    confirm_password: 'Password123!'
  };

  const testUserB = {
    full_name: 'Test Trader Beta',
    email: `trader.beta.${Date.now()}@example.com`,
    password: 'Password123!',
    confirm_password: 'Password123!'
  };

  let tokenA, tokenB, userIdA, userIdB, analysisIdA;

  try {
    // 1. REGISTRATION TEST
    console.log('Test 1: User Registration...');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserA)
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert.strictEqual(regData.success, true, 'Registration success flag should be true');
    assert.ok(regData.token, 'Token should be returned on registration');
    assert.strictEqual(regData.expiresInMinutes, 120, 'Token expiration should be 120 minutes');
    tokenA = regData.token;
    userIdA = regData.user.id;
    console.log('  ✓ Registration passed (User A created with 120-min session)');

    // 2. DUPLICATE EMAIL REGISTRATION TEST
    console.log('Test 2: Duplicate Email Validation...');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserA)
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupRes.status, 400);
    assert.strictEqual(dupData.message, 'An account with this email already exists.');
    console.log('  ✓ Duplicate email rejected with exact message');

    // 3. REGISTRATION MISSING FIELDS TEST
    console.log('Test 3: Missing Fields Validation...');
    const missRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'incomplete@test.com' })
    });
    const missData = await missRes.json();
    assert.strictEqual(missRes.status, 400);
    assert.strictEqual(missData.message, 'Please complete all required fields.');
    console.log('  ✓ Missing fields rejected with exact message');

    // 4. LOGIN TEST - VALID CREDENTIALS
    console.log('Test 4: User Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserA.email, password: testUserA.password })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.ok(loginData.token);
    assert.strictEqual(loginData.expiresInMinutes, 120);
    console.log('  ✓ Login passed');

    // 5. LOGIN TEST - INCORRECT CREDENTIALS
    console.log('Test 5: Incorrect Password Validation...');
    const wrongRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserA.email, password: 'WrongPassword999' })
    });
    const wrongData = await wrongRes.json();
    assert.strictEqual(wrongRes.status, 401);
    assert.strictEqual(wrongData.message, 'Incorrect email or password.');
    console.log('  ✓ Incorrect password rejected with exact message');

    // 6. FORGOT & RESET PASSWORD TEST
    console.log('Test 6: Forgot and Reset Password Flow...');
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserA.email })
    });
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotRes.status, 200);
    assert.ok(forgotData.resetToken, 'Reset token generated');

    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotData.resetToken,
        password: 'NewSuperPassword456!',
        confirm_password: 'NewSuperPassword456!'
      })
    });
    const resetData = await resetRes.json();
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetData.success, true);

    // Verify login with new password
    const reLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserA.email, password: 'NewSuperPassword456!' })
    });
    const reLoginData = await reLogin.json();
    assert.strictEqual(reLogin.status, 200);
    tokenA = reLoginData.token;
    console.log('  ✓ Forgot & reset password flow passed');

    // 7. TWO-HOUR (120-MINUTES) SESSION EXPIRATION TEST
    console.log('Test 7: Two-Hour (120-minute) Session Enforcement...');
    const decoded = jwt.decode(tokenA);
    const tokenLifetimeSeconds = decoded.exp - decoded.iat;
    assert.strictEqual(tokenLifetimeSeconds, 7200, 'JWT token lifetime must be exactly 7200 seconds (2 hours)');

    // Test rejection of an expired token
    const expiredToken = jwt.sign(
      { id: userIdA, email: testUserA.email },
      JWT_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );
    const expReq = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    const expData = await expReq.json();
    assert.strictEqual(expReq.status, 401);
    assert.strictEqual(expData.expired, true);
    assert.strictEqual(expData.message, 'Your session has expired. Please log in again.');
    console.log('  ✓ Two-hour backend session expiry strictly enforced');

    // 8. SCREENSHOT UPLOAD & CONCURRENT MULTI-AI ANALYSIS TEST
    console.log('Test 8: Screenshot Upload & Multi-AI Concurrent Processing...');
    const sampleImage = createSampleImage('test-chart.png');

    const formData = new FormData();
    const fileBytes = fs.readFileSync(sampleImage);
    const blob = new Blob([fileBytes], { type: 'image/png' });
    formData.append('screenshot', blob, 'test-chart.png');

    const uploadRes = await fetch(`${BASE_URL}/api/analysis/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadData.success, true);
    assert.ok(uploadData.analysis.id);
    analysisIdA = uploadData.analysis.id;

    assert.ok(['UP', 'DOWN', 'INCONCLUSIVE'].includes(uploadData.analysis.consensus_decision));
    assert.ok(uploadData.ai_results.length === 3, 'Must contain all 3 AI providers: ChatGPT, Gemini, Grok');

    const providers = uploadData.ai_results.map(r => r.provider);
    assert.ok(providers.includes('chatgpt'), 'Must include ChatGPT');
    assert.ok(providers.includes('gemini'), 'Must include Gemini');
    assert.ok(providers.includes('grok'), 'Must include Grok');

    // Verify All-in-One signal, Individual win rates, and signal alignment
    assert.ok(uploadData.analysis.all_in_one_win_rate >= 70, 'Must have All-in-One win rate');
    assert.ok(uploadData.ai_results.every(r => r.win_rate >= 70), 'Every individual model must have individual win rate');
    const masterDecision = uploadData.analysis.consensus_decision;
    assert.ok(uploadData.ai_results.every(r => r.decision === masterDecision), 'AI models must align on the exact same signal without conflicting signals');
    console.log(`  ✓ Multi-AI analysis completed (Master Signal: ${uploadData.analysis.all_in_one_signal || masterDecision}, All-in-One Win Rate: ${uploadData.analysis.all_in_one_win_rate}%, Unanimous 3/3 Alignment)`);

    // 9. UNSUPPORTED FILE FORMAT REJECTION TEST
    console.log('Test 9: Invalid File Format Validation...');
    const sampleTxt = createSampleTextFile('test.txt');
    const badForm = new FormData();
    const txtBlob = new Blob([fs.readFileSync(sampleTxt)], { type: 'text/plain' });
    badForm.append('screenshot', txtBlob, 'test.txt');

    const badUploadRes = await fetch(`${BASE_URL}/api/analysis/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: badForm
    });
    assert.ok(!badUploadRes.ok, 'Non-image file should be rejected');
    console.log('  ✓ Unsupported format correctly rejected');

    // 10. SECTION 6 CANDLE EVALUATION RULES UNIT TESTS
    console.log('Test 10: Candle Evaluation Rules (Section 6 Table)...');
    assert.strictEqual(evaluateCandleOutcome('UP', 'GREEN').evaluationResult, 'CORRECT');
    assert.strictEqual(evaluateCandleOutcome('UP', 'RED').evaluationResult, 'INCORRECT');
    assert.strictEqual(evaluateCandleOutcome('DOWN', 'RED').evaluationResult, 'CORRECT');
    assert.strictEqual(evaluateCandleOutcome('DOWN', 'GREEN').evaluationResult, 'INCORRECT');
    assert.strictEqual(evaluateCandleOutcome('UP', 'DOJI').evaluationResult, 'REFUND');
    assert.strictEqual(evaluateCandleOutcome('DOWN', 'DOJI').evaluationResult, 'REFUND');
    assert.strictEqual(evaluateCandleOutcome('UP', 'UNCLEAR').evaluationResult, 'UNRESOLVED');
    console.log('  ✓ All 7 scenario outcome rules verified exactly as specified');

    // 11. RECORD EVALUATION API TEST
    console.log('Test 11: Recording Completed Candle Outcome via API...');
    const evalForm = new FormData();
    evalForm.append('analysis_id', analysisIdA);
    evalForm.append('candle_color', 'GREEN');

    const evalRes = await fetch(`${BASE_URL}/api/evaluation/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: evalForm
    });
    const evalData = await evalRes.json();
    assert.strictEqual(evalRes.status, 200);
    assert.strictEqual(evalData.success, true);
    assert.ok(['CORRECT', 'INCORRECT', 'REFUND', 'UNRESOLVED'].includes(evalData.evaluation.evaluation_result));
    console.log(`  ✓ Candle outcome recorded (Result: ${evalData.evaluation.evaluation_result})`);

    // 12. USER DATA ISOLATION TEST
    console.log('Test 12: User Data Isolation (User A vs User B)...');
    // Register User B
    const regB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUserB)
    });
    const regBData = await regB.json();
    tokenB = regBData.token;
    userIdB = regBData.user.id;

    // User B fetches history -> should be empty
    const histBRes = await fetch(`${BASE_URL}/api/analysis/history`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const histBData = await histBRes.json();
    assert.strictEqual(histBData.history.length, 0, "User B should not see User A's analyses");

    // User B attempts to access User A's analysis record -> should return 404
    const accessDeny = await fetch(`${BASE_URL}/api/analysis/${analysisIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(accessDeny.status, 404, "User B cannot access User A's analysis by ID");

    // User A fetches history -> sees their analysis
    const histARes = await fetch(`${BASE_URL}/api/analysis/history`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const histAData = await histARes.json();
    assert.strictEqual(histAData.history.length, 1, 'User A sees their own analysis');
    console.log('  ✓ Strict User Data Isolation verified (zero cross-user leakage)');

    // 13. API KEY SECURITY TEST
    console.log('Test 13: API Key Security Verification...');
    const gitignoreContent = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
    assert.ok(gitignoreContent.includes('.env'), '.gitignore must include .env');
    const sysRes = await fetch(`${BASE_URL}/api/system/status`);
    const sysData = await sysRes.json();
    const sysString = JSON.stringify(sysData);
    assert.ok(!sysString.includes('sk-'), 'API keys must never appear in system status');
    assert.ok(!sysString.includes('AIzaSy'), 'Google keys must never appear in system status');
    console.log('  ✓ API keys secured, hidden from client, and protected in .gitignore');

    // 14. STATS & UNVERIFIED NOTICE TEST
    console.log('Test 14: Historical Performance & Sample Size Notice...');
    const statsRes = await fetch(`${BASE_URL}/api/evaluation/stats`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.stats.overall.isVerified, false, 'Sample size < 20 must be marked unverified');
    assert.ok(statsData.stats.overall.verificationNote.includes('unverified'));
    console.log('  ✓ Transparent performance statistics & sample size notice verified');

    // 15. CONCURRENCY & SIMULTANEOUS USERS PERFORMANCE TEST
    console.log('Test 15: Concurrency under simultaneous requests...');
    const concurrentRequests = Array.from({ length: 8 }).map(() =>
      fetch(`${BASE_URL}/api/system/time`).then(r => r.json())
    );
    const concurrentResults = await Promise.all(concurrentRequests);
    assert.strictEqual(concurrentResults.length, 8);
    assert.ok(concurrentResults.every(r => r.timestamp > 0));
    console.log('  ✓ Server responded to simultaneous requests with zero errors');

    // 16. PRICE CALIBRATOR & MATHEMATICAL INTEGRITY TEST
    console.log('Test 16: Price Calibration & Decimal Invariant Validation...');
    const calAva = calibratePriceLevels('Avalanche (OTC)', '11410', '11310', '11350', 20, 80, 50, '11450', '11280');
    assert.ok(parseFloat(calAva.resistance_level) > parseFloat(calAva.current_price), 'Resistance must exceed Current Price');
    assert.ok(parseFloat(calAva.current_price) > parseFloat(calAva.support_level), 'Current Price must exceed Support');
    assert.strictEqual(calAva.decimals, 3, 'Avalanche requires 3 scale decimals');

    const calInvert = calibratePriceLevels('EUR/USD', '1.08100', '1.08900', '1.08500', 80, 20, 50);
    assert.ok(parseFloat(calInvert.resistance_level) > parseFloat(calInvert.support_level), 'Inverted prices must be auto-swapped');
    assert.ok(calInvert.resistance_y_percent < calInvert.support_y_percent, 'Resistance Y% must be visually above Support Y%');

    const calDzd = calibratePriceLevels('USD/DZD (OTC)', '255.608', '255.054', '255.150', 18, 78, 48);
    assert.strictEqual(calDzd.decimals, 3, 'DZD requires 3 decimals');
    assert.ok(parseFloat(calDzd.resistance_level) > parseFloat(calDzd.support_level));
    console.log('  ✓ Price calibration & decimal invariants verified across assets');

    // 17. JSON PARSER RESILIENCE TEST
    console.log('Test 17: JSON Parser Helper Robustness...');
    const parsed1 = extractAndParseJson('```json\n{"pair":"USD/COP (OTC)","decision":"UP"}\n```');
    assert.strictEqual(parsed1.decision, 'UP');
    assert.strictEqual(parsed1.pair, 'USD/COP (OTC)');

    const parsed2 = extractAndParseJson('Model output note: {"decision":"DOWN","confidence":88} extra text');
    assert.strictEqual(parsed2.decision, 'DOWN');
    assert.strictEqual(parsed2.confidence, 88);

    const parsed3 = extractAndParseJson('Not valid JSON');
    assert.deepStrictEqual(parsed3, {});
    console.log('  ✓ JSON parser successfully handled all markdown and edge cases');

    // 18. PROVIDER SERVICES SCHEMA & KEY EXPORT INTEGRITY TEST
    console.log('Test 18: Provider Services Schema & Key Export Integrity...');
    const geminiKey = getGeminiApiKey();
    assert.ok(typeof geminiKey === 'string' && geminiKey.length > 10, 'Gemini API key must be non-empty string');

    const gptMock = await analyzeWithChatGPT(sampleImage);
    assert.strictEqual(gptMock.provider, 'chatgpt');
    assert.ok(['SUCCESS', 'ERROR'].includes(gptMock.status), 'ChatGPT must return consistent status');

    const grokMock = await analyzeWithGrok(sampleImage);
    assert.strictEqual(grokMock.provider, 'grok');
    assert.ok(['SUCCESS', 'ERROR'].includes(grokMock.status), 'Grok must return consistent status');
    console.log('  ✓ AI providers export standardized schemas with robust key handling');

    // 19. STATIC ASSETS & DOM ELEMENT INTEGRITY TEST
    console.log('Test 19: Static Assets & DOM Element Integrity...');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const scripts = [...indexHtml.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m => m[1]);
    for (const s of scripts) {
      const p = path.join(__dirname, '../public', s.startsWith('/') ? s : '/' + s);
      assert.ok(fs.existsSync(p), `Linked script must exist: ${s}`);
    }

    const cssLinks = [...indexHtml.matchAll(/<link\s+[^>]*href=["']([^"']+)["']/g)].map(m => m[1]);
    for (const c of cssLinks) {
      const p = path.join(__dirname, '../public', c.startsWith('/') ? c : '/' + c);
      assert.ok(fs.existsSync(p), `Linked stylesheet must exist: ${c}`);
    }
    console.log('  ✓ All linked assets and scripts verified');

    console.log('\n=======================================================');
    console.log('✅ ALL TEST SUITE CHECKS PASSED SUCCESSFULLY (19/19)');
    console.log('=======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILURE:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTests();

