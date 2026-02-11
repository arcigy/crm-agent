async function checkToken() {
    const url = "https://directus-buk1-production.up.railway.app/items/google_tokens?filter[user_email][_eq]=branislav@arcigy.group";
    const headers = {
        "Authorization": "Bearer 3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
    };

    try {
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log("Token for branislav@arcigy.group:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

checkToken();
