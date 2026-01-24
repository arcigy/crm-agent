const OpenAI = require('openai');
console.log('OpenAI module loaded successfully');
try {
    const client = new OpenAI({ apiKey: 'test' });
    console.log('Client created');
} catch (e) {
    console.log(e.message);
}
