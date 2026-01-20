require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing with API key:", apiKey ? apiKey.substring(0, 20) + "..." : "NOT FOUND");

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

model.generateContent("Say hello")
  .then(result => {
    console.log("✅ SUCCESS:", result.response.text());
  })
  .catch(err => {
    console.error("❌ ERROR:", err.message);
  });
