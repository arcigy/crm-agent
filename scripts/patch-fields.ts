const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN env variable is required");

async function createSchema() {
  const fetchDirectus = async (url: string, method: string, body?: any) => {
    const res = await fetch(`${DIRECTUS_URL}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
    }
    return res.json();
  };

  try {
    const convFields = [
      { field: "user_id", type: "string" },
      { field: "title", type: "string" },
      { field: "created_at", type: "timestamp" },
      { field: "updated_at", type: "timestamp" },
      { field: "message_count", type: "integer" },
      { field: "is_pinned", type: "boolean" },
      { field: "deleted_at", type: "timestamp" }
    ];
    for (const field of convFields) {
      try {
        await fetchDirectus("/fields/conversations", "POST", field);
        console.log(`+ Pole conversations.${field.field}`);
      } catch (e) {}
    }

    const msgFields = [
      { field: "conversation_id", type: "uuid" },
      { field: "role", type: "string" },
      { field: "content", type: "text" },
      { field: "created_at", type: "timestamp" },
      { field: "tokens_used", type: "integer" },
      { field: "tool_calls", type: "json" }
    ];
    for (const field of msgFields) {
      try {
        await fetchDirectus("/fields/messages", "POST", field);
        console.log(`+ Pole messages.${field.field}`);
      } catch (e) {}
    }
    console.log("Hotovo fieldy");
  } catch (e) {}
}

createSchema();
