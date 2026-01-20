require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in .env file");
  process.exit(1);
}

console.log("🔑 Testing Gemini API Key...");
console.log("API Key (first 20 chars):", apiKey.substring(0, 20) + "...\n");

const genAI = new GoogleGenerativeAI(apiKey);

async function testGemini() {
  try {
    console.log("📤 Testing with model: gemini-pro...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent("Say 'Hello, this is a test' in one sentence.");
    const response = await result.response;
    const text = response.text();
    
    console.log("\n✅ SUCCESS! Gemini API is working!");
    console.log("Response:", text);
    return true;
  } catch (error) {
    console.error("\n❌ ERROR: Gemini API test failed");
    console.error("Error:", error.message);
    
    if (error.message.includes("403")) {
      console.error("\n💡 This means:");
      console.error("   - API key is invalid or expired");
      console.error("   - API key doesn't have access to Gemini API");
      console.error("   - Get a new key at: https://aistudio.google.com/app/apikey");
    } else if (error.message.includes("404")) {
      console.error("\n💡 Model not found. Trying alternative models...");
      // Try other models
      const altModels = ["gemini-1.0-pro", "models/gemini-pro"];
      for (const modelName of altModels) {
        try {
          console.log(`\n📤 Trying: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent("Test");
          const text = await result.response.text();
          console.log(`✅ ${modelName} works! Response: ${text.substring(0, 50)}...`);
          return true;
        } catch (e) {
          console.log(`   ❌ ${modelName} failed`);
        }
      }
    }
    
    return false;
  }
}

testGemini().then(success => {
  process.exit(success ? 0 : 1);
});
