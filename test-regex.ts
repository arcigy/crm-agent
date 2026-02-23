const fs = require('fs');

const rawText = `
{
  "intent": "Create a contact named Peter Maličký, create a project and a deal for him related to a website, add a comment to his profile, and schedule a follow-up call task.",
  "thought": "I will use db_create_contact to create Peter Maličký. I need to output JSON.",
  "steps": [
    {
      "tool": "db_create_contact",
      "args": {
        "first_name": "Peter",
        "last_name": "Maličký",
        "phone": "+421741852963"
      }
    },
    {
      "tool": "db_create_project",
      "args": {
        "name": "webstránka pre Peter Maličký",
        "contact_id": "???",
        "budget": 5000
      }
    }
  ]
}
`;

const startIdx = rawText.indexOf("{");
const endIdx = rawText.lastIndexOf("}");
let clean = rawText.substring(startIdx, endIdx + 1);

console.log("Starting regex replacement...");
const startTime = Date.now();
// Escape control chars inside strings only
clean = clean.replace(/\"((?:[^\"\\]|\\.)*)\"/g, (match, p1) => {
return (
    '"' +
    p1
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, " ") +
    '"'
);
});
console.log("Finished in", Date.now() - startTime, "ms");
