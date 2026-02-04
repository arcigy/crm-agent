import requests
import json

TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
URL = "https://directus-buk1-production.up.railway.app/fields/cold_leads"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "field": "list_name",
    "type": "string",
    "meta": {
        "interface": "input",
        "display": "raw",
        "readonly": False,
        "hidden": False,
        "width": "full"
    },
    "schema": {
        "default_value": "Všeobecný zoznam",
        "is_nullable": True
    }
}

response = requests.post(URL, headers=headers, json=payload)
print(response.status_code)
print(response.text)
