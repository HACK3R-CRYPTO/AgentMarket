require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in .env file");
  process.exit(1);
}

console.log("🔑 Testing Gemini API Key...");
console.log("API Key (first 20 chars):", apiKey.substring(0, 20) + "...");

const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  try {
    // Try different model names (current models first)
    const modelsToTry = [
      "gemini-pro",           // Most commonly available
      "gemini-2.0-flash-exp", // Newer model
      "gemini-2.5-flash",    // Latest flash model
      "gemini-1.5-pro",      // Legacy (may be deprecated)
      "gemini-1.5-flash",    // Legacy flash
    ];
    
    let lastError = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`\n📤 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'Hello, this is a test' in one sentence.");
        const response = await result.response;
        const text = response.text();
        
        console.log("\n✅ SUCCESS! Gemini API is working!");
        console.log(`✅ Working model: ${modelName}`);
        console.log("Response:", text);
        return true;
      } catch (err) {
        lastError = err;
        console.log(`   ❌ ${modelName} failed: ${err.message.split('\n')[0]}`);
        continue;
      }
    }
    
    // If all models failed, throw the last error
    throw lastError;
  } catch (error) {
    console.error("\n❌ ERROR: Gemini API test failed");
    console.error("Error message:", error.message);
    
    if (error.message.includes("403")) {
      console.error("\n💡 This usually means:");
      console.error("   - API key is invalid or expired");
      console.error("   - API key doesn't have access to Gemini API");
      console.error("   - API key needs to be enabled in Google Cloud Console");
    } else if (error.message.includes("401")) {
      console.error("\n💡 This usually means:");
      console.error("   - API key is invalid");
    }
    
    return false;
  }
}

testGemini().then(success => {
  process.exit(success ? 0 : 1);
});
