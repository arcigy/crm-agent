const fs = require('fs');
const content = fs.readFileSync('src/app/actions/agent-registry.ts', 'utf8');
const names = [...content.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
console.log("Total tools:", names.length);

const DESTRUCTIVE_KEYWORDS = ['create', 'update', 'delete', 'merge', 'invoice', 'reply', 'send', 'trash', 'archive', 'convert', 'save', 'execute', 'complete', 'generate', 'schedule'];
const safeTools = [];
const unsafeTools = [];

for (const name of names) {
  let isUnsafe = false;
  for (const kw of DESTRUCTIVE_KEYWORDS) {
    if (name.includes(kw)) {
      isUnsafe = true;
      break;
    }
  }
  
  if (isUnsafe) { unsafeTools.push(name); }
  else { safeTools.push(name); }
}

console.log("UNSAFE:", unsafeTools);
