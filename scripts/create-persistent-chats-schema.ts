const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN env variable is required");

async function createSchema() {
  console.log("🚀 Vytváram tabuľky pre persistentné chaty...");

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
        let errText = await res.text();
        throw new Error(`Directus API Error: ${res.status} ${res.statusText} ${errText}`);
    }
    return res.json();
  };

  try {
    // 1. Vytvor kolekciu conversations
    console.log("Vytváram kolekciu conversations...");
    try {
      await fetchDirectus("/collections", "POST", {
        collection: "conversations",
        meta: {
          collection: "conversations",
          icon: "forum",
          note: "Persistent Chat Conversations",
        },
        schema: {},
      });
      console.log("✅ Kolekcia conversations vytvorená!");

      const convFields = [
        { field: "id", type: "uuid", schema: { is_primary_key: true, has_auto_increment: false } },
        { field: "user_id", type: "string", schema: { max_length: 255 } },
        { field: "title", type: "string", schema: { max_length: 255, default_value: "Nová konverzácia" } },
        { field: "created_at", type: "timestamp", schema: { default_value: "CURRENT_TIMESTAMP" }, meta: { special: ["date-created"] } },
        { field: "updated_at", type: "timestamp", schema: { default_value: "CURRENT_TIMESTAMP" }, meta: { special: ["date-updated"] } },
        { field: "message_count", type: "integer", schema: { default_value: 0 } },
        { field: "is_pinned", type: "boolean", schema: { default_value: false } },
        { field: "deleted_at", type: "timestamp", schema: { is_nullable: true } },
      ];
      for (const field of convFields) {
        await fetchDirectus("/fields/conversations", "POST", field);
        console.log(`  ✅ Pole conversations.${field.field} pridané`);
      }
    } catch (e: any) {
        console.log("⚠️ Conversations collection set up error (maybe exists):", e.message.substring(0, 100));
    }

    // 2. Vytvor kolekciu messages
    console.log("Vytváram kolekciu messages...");
    try {
      await fetchDirectus("/collections", "POST", {
        collection: "messages",
        meta: {
          collection: "messages",
          icon: "message",
          note: "Persistent Chat Messages",
        },
        schema: {},
      });
      console.log("✅ Kolekcia messages vytvorená!");

      const msgFields = [
        { field: "id", type: "uuid", schema: { is_primary_key: true, has_auto_increment: false } },
        { field: "conversation_id", type: "uuid" },
        { field: "role", type: "string", schema: { max_length: 50 } },
        { field: "content", type: "text" },
        { field: "created_at", type: "timestamp", schema: { default_value: "CURRENT_TIMESTAMP" }, meta: { special: ["date-created"] } },
        { field: "tokens_used", type: "integer", schema: { is_nullable: true } },
        { field: "tool_calls", type: "json", schema: { is_nullable: true } },
      ];
      for (const field of msgFields) {
        await fetchDirectus("/fields/messages", "POST", field);
        console.log(`  ✅ Pole messages.${field.field} pridané`);
      }

    } catch (e: any) {
        console.log("⚠️ Messages collection set up error (maybe exists):", e.message.substring(0, 100));
    }

    // Setup relationships
    try {
        await fetchDirectus("/relations", "POST", {
            collection: "messages",
            field: "conversation_id",
            related_collection: "conversations",
            schema: {
                on_update: "CASCADE",
                on_delete: "CASCADE"
            },
            meta: {
                one_collection: "conversations"
            }
        });
        console.log("✅ Vzťah messages -> conversations vytvorený!");
    } catch (e: any) {
        console.log("⚠️ Relation setup error:", e.message.substring(0, 100));
    }

    console.log("✅ Architektúra v Directuse je pripravená!");

  } catch (e) {
    console.error("❌ Celková chyba:", e);
  }
}

createSchema();
