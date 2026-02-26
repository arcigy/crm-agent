const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    const modelNames = data.models.map(m => m.name.replace('models/', ''));
    console.log(modelNames.join('\n'));
  } catch (error) {
    console.error(error);
  }
}
listModels();
