import requests
import json

TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
URL = "https://directus-buk1-production.up.railway.app/collections"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. Create Collection
payload = {
    "collection": "cold_leads_lists",
    "schema": {},
    "meta": {
        "icon": "list",
        "note": "Lists for Cold Outreach",
        "display_template": "{{name}}"
    }
}

res = requests.post(URL, headers=headers, json=payload)
print(f"Create Collection: {res.status_code}")

# 2. Add 'id' field (Primary Key) - usually auto-created if not specified? 
# Directus usually requires explicit PK if not standard. 
# Actually, creating collection with empty schema usually creates 'id' integer PK by default in Directus 9+.
# Let's check permissions by adding 'name' field.

URL_FIELDS = "https://directus-buk1-production.up.railway.app/fields/cold_leads_lists"

payload_name = {
    "field": "name",
    "type": "string",
    "meta": {
        "interface": "input",
        "width": "full"
    },
    "schema": {
        "is_nullable": False
    }
}

res2 = requests.post(URL_FIELDS, headers=headers, json=payload_name)
print(f"Add Name Field: {res2.status_code}")
