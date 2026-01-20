require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log("📋 Fetching available Gemini models...\n");
    
    // Try to list models via the API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    const data = await response.json();
    
    if (data.models) {
      console.log("✅ Available models:");
      data.models.forEach(model => {
        console.log(`   - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
      
      // Try the first model that supports generateContent
      const workingModel = data.models.find(m => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      if (workingModel) {
        console.log(`\n📤 Testing with: ${workingModel.name}...`);
        const model = genAI.getGenerativeModel({ model: workingModel.name });
        const result = await model.generateContent("Say hello in one sentence.");
        const text = await result.response.text();
        console.log(`✅ SUCCESS! Response: ${text}`);
        console.log(`\n💡 Use this model name in your code: "${workingModel.name}"`);
      }
    } else {
      console.error("❌ Could not fetch models:", data);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    // Fallback: try common model names directly
    console.log("\n📤 Trying common model names directly...");
    const modelsToTry = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest", 
      "gemini-1.0-pro-latest",
      "gemini-pro-latest"
    ];
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`   Trying: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Test");
        const text = await result.response.text();
        console.log(`   ✅ ${modelName} WORKS! Response: ${text.substring(0, 50)}...`);
        console.log(`\n💡 Use this model name: "${modelName}"`);
        return;
      } catch (e) {
        console.log(`   ❌ ${modelName} failed`);
      }
    }
  }
}

listModels();
