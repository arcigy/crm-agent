import requests
import json

TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
URL_LISTS = "https://directus-buk1-production.up.railway.app/items/cold_leads_lists"
URL_LEADS = "https://directus-buk1-production.up.railway.app/items/cold_leads"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. Create "Zoznam 1"
# Check if exists first
res = requests.get(URL_LISTS, headers=headers)
lists = res.json()['data']
zoznam1_id = None

for l in lists:
    if l['name'] == "Zoznam 1":
        zoznam1_id = l['id']
        break

if not zoznam1_id:
    # Create
    res = requests.post(URL_LISTS, headers=headers, json={"name": "Zoznam 1"})
    print(f"Created Zoznam 1: {res.status_code}")
else:
    print("Zoznam 1 already exists.")

# 2. Update all leads to "Zoznam 1"
# Fetch all IDs
res = requests.get(f"{URL_LEADS}?limit=-1&fields=id", headers=headers)
ids = [item['id'] for item in res.json()['data']]
print(f"Updating {len(ids)} leads...")

# Batch update
# Directus supports batch update via PATCH with array of keys
payload = {
    "keys": ids,
    "data": {
        "list_name": "Zoznam 1"
    }
}

res = requests.patch(URL_LEADS, headers=headers, json=payload)
print(f"Batch Update: {res.status_code}")
