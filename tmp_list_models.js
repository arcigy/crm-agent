const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // Note: The public SDK might not have a direct listModels, 
    // but the REST API does. I'll use a fetch call to the models endpoint.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("=== DOSTUPNÉ MODELY GEMINI ===");
    data.models.forEach(m => {
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${m.name.replace('models/', '')} (Input: ${m.inputTokenLimit}, Methods: ${m.supportedGenerationMethods.join(', ')})`);
      }
    });
  } catch (error) {
    console.error("Chyba pri získavaní modelov:", error);
  }
}

listModels();
