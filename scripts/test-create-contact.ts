/**
 * Testovací skript pre overenie vytvorenia a vyhľadania kontaktu
 *
 * Spustiť: npx ts-node scripts/test-create-contact.ts
 */

const {
  createDirectus,
  rest,
  staticToken,
  createItem,
  readItems,
  deleteItem,
} = require("@directus/sdk");

const DIRECTUS_URL = "http://directus-buk1-production.up.railway.app";
const DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE";

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
  console.error("❌ Chýbajú ENV premenné DIRECTUS_URL alebo DIRECTUS_TOKEN");
  process.exit(1);
}

const directus = createDirectus(DIRECTUS_URL)
  .with(staticToken(DIRECTUS_TOKEN))
  .with(rest());

async function testContactLifecycle() {
  const testEmail = `test.user.${Date.now()}@example.com`;
  console.log(`🚀 Začínam test pre email: ${testEmail}`);

  try {
    // 1. VYTVORENIE KONTAKTU
    console.log("📝 Pokus o vytvorenie kontaktu...");
    const newContact = await directus.request(
      createItem("contacts", {
        first_name: "Test",
        last_name: "User",
        email: testEmail,
        phone: "0900123456",
        company: "Test Corp",
        status: "new",
        date_created: new Date().toISOString(),
      }),
    );
    console.log(`✅ Kontakt vytvorený! ID: ${newContact.id}`);

    // 2. OVERENIE EXISTENCIE
    console.log("🔍 Overujem či kontakt existuje v DB...");
    const searchRes = await directus.request(
      readItems("contacts", {
        filter: { email: { _eq: testEmail } },
      }),
    );

    if (searchRes.length > 0) {
      console.log(
        `✅ Kontakt nájdený v DB: ${searchRes[0].first_name} ${searchRes[0].last_name} (${searchRes[0].email})`,
      );
    } else {
      console.error(
        "❌ CHYBA: Kontakt bol vytvorený ale nenašiel sa pri vyhľadávaní!",
      );
    }

    // 3. CLEANUP (voliteľné - zatiaľ necháme pre manuálnu kontrolu)
    // console.log("🧹 Mažem testovací kontakt...");
    // await directus.request(deleteItem("contacts", newContact.id));
    // console.log("✅ Kontakt vymazaný.");
  } catch (error: any) {
    console.error("❌ CRITICAL ERROR:", error.message);
    if (error.errors) {
      console.error("Detaily chyby:", JSON.stringify(error.errors, null, 2));
    }
  }
}

testContactLifecycle();
