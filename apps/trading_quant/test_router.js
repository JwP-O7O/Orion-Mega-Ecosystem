const { chooseModel, ORION_Think } = require('./orion_router');

console.log("[TEST] Testing chooseModel logic...");
console.assert(chooseModel("Analyseer de markt strategie") === "gemma4:31b-cloud", "Test 1 Failed");
console.assert(chooseModel("Denk diep na en redeneer") === "kimi-k2.6:cloud", "Test 2 Failed");
console.assert(chooseModel("Hallo Orion") === "hermes3:8b", "Test 3 Failed");
console.log("[TEST] chooseModel passed 3/3 tests!");

(async () => {
    console.log("[TEST] Testing ORION_Think fallback mode...");
    const res = await ORION_Think("Test prompt", "http://127.0.0.1:9999/invalid");
    console.assert(res.model === "hermes3:8b", "Fallback Model Test Failed");
    console.assert(res.answer.includes("ORION Router Notice"), "Fallback Answer Test Failed");
    console.log("[TEST] ORION_Think fallback test passed 100%!");
})();
