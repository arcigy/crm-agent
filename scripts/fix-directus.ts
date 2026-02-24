import { createDirectus, rest, staticToken } from '@directus/sdk';

const DIRECTUS_URL = "https://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

const directus = createDirectus(DIRECTUS_URL).with(staticToken(DIRECTUS_TOKEN)).with(rest());

async function fix() {
  try {
    // Delete the uuid field
    try {
        await fetch(`${DIRECTUS_URL}/fields/messages/conversation_id`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
        });
        console.log("Deleted old conversation_id field");
    } catch (e) {
        console.log("Could not delete field, maybe doesn't exist", e);
    }

    // Recreate as integer
    const res = await fetch(`${DIRECTUS_URL}/fields/messages`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DIRECTUS_TOKEN}` 
        },
        body: JSON.stringify({
            field: "conversation_id",
            type: "integer",
            meta: {
                interface: "list",
            },
            schema: {
                is_nullable: true
            }
        })
    });
    console.log("Creation status:", res.status, await res.text());

    // Create foreign key relation
    const resRel = await fetch(`${DIRECTUS_URL}/relations`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DIRECTUS_TOKEN}` 
        },
        body: JSON.stringify({
            collection: "messages",
            field: "conversation_id",
            related_collection: "conversations",
            schema: {
                on_delete: "CASCADE"
            }
        })
    });
    console.log("Relation status:", resRel.status, await resRel.text());

  } catch (e: any) {
    console.error("Failed:", e);
  }
}
fix();
