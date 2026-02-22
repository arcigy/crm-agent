import { createDirectus, rest, updateField, readField } from "@directus/sdk";

// We use the public URL and token provided in the rules
const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const client = createDirectus(DIRECTUS_URL).with(rest({
  onRequest: (options) => {
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
    return options;
  }
}));

async function fixSchema() {
  try {
    console.log("Fixing projects.value field...");
    const pField = await client.request(readField('projects', 'value'));
    console.log("Current projects.value:", JSON.stringify(pField.schema, null, 2));

    await client.request(updateField('projects', 'value', {
      schema: {
        numeric_precision: 15,
        numeric_scale: 2
      }
    }));
    console.log("✅ projects.value fixed!");

    console.log("Fixing deals.value field...");
    const dField = await client.request(readField('deals', 'value'));
    console.log("Current deals.value:", JSON.stringify(dField.schema, null, 2));
    
    await client.request(updateField('deals', 'value', {
      schema: {
        numeric_precision: 15,
        numeric_scale: 2
      }
    }));
    console.log("✅ deals.value fixed!");

  } catch (error: any) {
    console.error("❌ Error fixing schema:", error?.errors || error.message);
  }
}

fixSchema();
