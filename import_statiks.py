import csv
import urllib.parse
import json
import http.client
import sys

# Configuration
DIRECTUS_HOST = "directus-buk1-production.up.railway.app"
DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
CSV_FILE = r"c:\Users\laube\Downloads\Agentic Workflows\CRM\leads_processed.csv"

def make_request(method, path, body=None):
    conn = http.client.HTTPSConnection(DIRECTUS_HOST)
    headers = {
        "Authorization": f"Bearer {DIRECTUS_TOKEN}",
        "Content-Type": "application/json"
    }
    if body:
        conn.request(method, path, body=json.dumps(body), headers=headers)
    else:
        conn.request(method, path, headers=headers)
    
    resp = conn.getresponse()
    data = resp.read()
    conn.close()
    return resp.status, json.loads(data.decode('utf-8'))

def import_statiks():
    print(f"Reading CSV: {CSV_FILE}")
    
    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except UnicodeDecodeError:
        with open(CSV_FILE, mode='r', encoding='latin-1') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

    statik_count = 0
    for row in rows:
        title = row.get('title', '').lower()
        category = row.get('category', '').lower()
        
        is_statik = any(term in title or term in category for term in ['stati', 'inzinier', 'nosn'])
        
        if is_statik:
            statik_count += 1
            lead_data = {
                "title": row['title'],
                "company_name_reworked": row['company_name_reworked'] or None,
                "website": row['website'] or None,
                "phone": row['phone'] or None,
                "city": row['city'] or None,
                "category": row['category'] or None,
                "abstract": row['abstract'] or None,
                "ai_first_sentence": row['ai_first_sentence'] or None,
                "list_name": "Statik",
                "status": "lead",
                "user_email": "branislav@arcigy.group"
            }
            
            # Check if exists
            filter_str = json.dumps({"title": {"_eq": row['title']}})
            status, json_data = make_request("GET", f"/items/cold_leads?filter={urllib.parse.quote(filter_str)}")
            
            if status == 200:
                existing = json_data.get('data', [])
                if existing:
                    lead_id = existing[0]['id']
                    # Update
                    print(f"Updating: {row['title']}")
                    make_request("PATCH", f"/items/cold_leads/{lead_id}", lead_data)
                else:
                    # Create
                    print(f"Creating: {row['title']}")
                    make_request("POST", f"/items/cold_leads", lead_data)
            else:
                print(f"Error querying {row['title']}: {status}")

    print(f"Processed {statik_count} statik leads.")

if __name__ == "__main__":
    import_statiks()
