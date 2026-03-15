/**
 * Script na vytvorenie tabuľky agent_chats v Directus
 *
 * Spustiť: npx ts-node scripts/create-agent-chats-table.ts
 */

export {};

const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;
if (!DIRECTUS_TOKEN) throw new Error("DIRECTUS_TOKEN env variable is required");

async function createAgentChatsTable() {
  console.log("🚀 Vytváram tabuľku agent_chats...");

  try {
    // Skontroluj či tabuľka existuje
    const checkRes = await fetch(`${DIRECTUS_URL}/collections/agent_chats`, {
      headers: {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
    });

    if (checkRes.ok) {
      console.log("✅ Tabuľka agent_chats už existuje!");
      return;
    }

    // Vytvor kolekciu
    const createCollectionRes = await fetch(`${DIRECTUS_URL}/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        collection: "agent_chats",
        meta: {
          collection: "agent_chats",
          icon: "chat",
          note: "AI Agent chat história",
          display_template: "{{title}}",
          archive_field: "status",
          archive_value: "archived",
          unarchive_value: "active",
        },
        schema: {},
      }),
    });

    if (!createCollectionRes.ok) {
      const err = await createCollectionRes.text();
      console.error("❌ Chyba pri vytváraní kolekcie:", err);
      return;
    }

    console.log("✅ Kolekcia vytvorená!");

    // Pridaj polia
    const fields = [
      {
        field: "id",
        type: "uuid",
        schema: { is_primary_key: true, is_nullable: false },
        meta: { special: ["uuid"], interface: "input" },
      },
      {
        field: "title",
        type: "string",
        schema: { max_length: 255 },
        meta: { interface: "input" },
      },
      {
        field: "messages",
        type: "json",
        schema: {},
        meta: { interface: "input-code", options: { language: "json" } },
      },
      {
        field: "user_email",
        type: "string",
        schema: { max_length: 255 },
        meta: { interface: "input" },
      },
      {
        field: "status",
        type: "string",
        schema: { max_length: 50, default_value: "active" },
        meta: {
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Active", value: "active" },
              { text: "Archived", value: "archived" },
            ],
          },
        },
      },
      {
        field: "date_created",
        type: "timestamp",
        schema: {},
        meta: { special: ["date-created"], interface: "datetime" },
      },
      {
        field: "date_updated",
        type: "timestamp",
        schema: {},
        meta: { special: ["date-updated"], interface: "datetime" },
      },
    ];

    for (const field of fields) {
      const fieldRes = await fetch(`${DIRECTUS_URL}/fields/agent_chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: JSON.stringify(field),
      });

      if (fieldRes.ok) {
        console.log(`  ✅ Pole ${field.field} pridané`);
      } else {
        const err = await fieldRes.text();
        console.log(`  ⚠️ Pole ${field.field}: ${err.slice(0, 100)}`);
      }
    }

    // Nastav public permissions
    await fetch(`${DIRECTUS_URL}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        collection: "agent_chats",
        action: "create",
        role: null, // public
        fields: "*",
      }),
    });

    console.log("✅ Tabuľka agent_chats vytvorená úspešne!");
  } catch (e) {
    console.error("❌ Chyba:", e instanceof Error ? e.message : String(e));
  }
}

createAgentChatsTable();
