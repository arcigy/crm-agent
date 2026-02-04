import requests
import json
import time
import os

TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
DIRECTUS_URL = "https://directus-buk1-production.up.railway.app/items/cold_leads"
GEMINI_KEY = "AIzaSyDuvw6K2dq2wNAaEVhjvtXABN-eFUFXNWI"

directus_headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def get_ai_name(title, website):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    
    prompt = f"""
    Task: Extract the Clean, Short Company Name from the Title and Website.
    
    Rules:
    1. Prioritize the Website domain name if it looks like a brand name (e.g. 'parkety-vrable.sk' -> 'Parkety Vráble').
    2. Remove 's.r.o.', 'a.s.', locations, slogans, and unnecessary words.
    3. If the Website is generic (e.g. gmail, facebook), rely on the Title.
    4. Return ONLY the Company Name. No quotes, no explanation.
    
    Input:
    Title: {title}
    Website: {website}
    
    Company Name:
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and result['candidates']:
                return result['candidates'][0]['content']['parts'][0]['text'].strip()
    except Exception as e:
        print(f"AI Error: {e}")
    return None

def process_batch():
    # Fetch leads (adjust limit as needed, sorting by ID to keep order)
    # We filter where website is not null
    print("Fetching leads...")
    response = requests.get(f"{DIRECTUS_URL}?limit=-1&sort=id&filter[website][_nnull]=true", headers=directus_headers)
    leads = response.json()['data']
    
    print(f"Found {len(leads)} leads with websites.")
    
    # We can process a subset or all. Let's do a safe subset of high IDs (where we might have messed up?)
    # Or just all of them. The user wants "Domains are nice... use them". 
    # Let's iterate and if the AI result is different/better, update.
    
    updated_count = 0
    
    for lead in leads:
        # Skip if we already used this script (maybe check a flag? No flag available).
        # We will just verify if the current name is strikingly different.
        
        current_name = lead.get('company_name_reworked')
        title = lead.get('title')
        website = lead.get('website')
        
        # Rate limit safety
        time.sleep(0.5) 
        
        ai_name = get_ai_name(title, website)
        
        if ai_name and ai_name != current_name:
            print(f"ID {lead['id']}: '{current_name}' -> '{ai_name}' ({website})")
            
            # Construct new sentence
            current_sentence = lead.get('ai_first_sentence', '')
            new_sentence = current_sentence
            if current_name and current_name in current_sentence:
                 new_sentence = current_sentence.replace(current_name, ai_name)
            elif not current_sentence:
                 new_sentence = f"Dobrý deň. Páči sa mi, že v {ai_name} sa venujete poskytovaniu kvalitných služieb."
            
            # Update Directus
            patch_data = {
                "company_name_reworked": ai_name,
                "ai_first_sentence": new_sentence
            }
            
            res = requests.patch(f"{DIRECTUS_URL}/{lead['id']}", headers=directus_headers, json=patch_data)
            if res.status_code == 200:
                updated_count += 1
            else:
                print(f"Failed to update ID {lead['id']}")
        
    print(f"Updated {updated_count} leads.")

if __name__ == "__main__":
    process_batch()
