import json
import csv
import re
import requests
import concurrent.futures
import time
import os

GEMINI_KEY = "AIzaSyDuvw6K2dq2wNAaEVhjvtXABN-eFUFXNWI"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"

def get_domain_based_name(website):
    if not website:
        return None
    base = website.lower().strip()
    base = re.sub(r'^https?://', '', base)
    base = re.sub(r'^www\.', '', base)
    domain_full = base.split('/')[0]
    parts = domain_full.split('.')
    if len(parts) >= 2:
        # Heuristic for subdomains or crazy tlds
        relevant = parts[0]
        # if 'firma.sk', parts=['firma', 'sk'] -> relevant='firma'
        # if 'nieco.firma.sk', parts=['nieco', 'firma', 'sk'] -> relevant='nieco' ?? better take parts[-2]
        # Standard approach for .sk/.com is parts[-2].
        # But if parts[-1] is long (e.g. '.local'), maybe logic differs. keeping it simple.
        relevant = parts[-2] if len(parts) >= 2 else parts[0]
        
        # Filter generic
        if relevant in ['gmail', 'zoznam', 'centrum', 'azet', 'yahoo', 'outlook', 'facebook', 'instagram']:
            return None
            
        name = relevant.replace('-', ' ').replace('_', ' ').title()
        return name
    return None

def clean_title_fallback(title):
    if not title:
        return "Firma"
    name = title
    name = re.sub(r'\s*s\.r\.o\.?.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*spol\. s r\.o\..*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*a\.s\.?.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s[|\-–]\s.*$', '', name)
    return name.strip()

def generate_sentence(lead):
    # Prepare inputs
    website = lead.get('website', '')
    title = lead.get('title', '')
    abstract = lead.get('abstract', '')
    category = lead.get('category', '')
    city = lead.get('city', '')
    
    # Determined Name
    name = get_domain_based_name(website)
    if not name:
        name = clean_title_fallback(title)
        
    # Context for AI
    # We prefer Abstract > Title > Category
    description = abstract if abstract and len(abstract) > 5 else title
    if not description or len(description) < 3:
        description = category
        
    prompt = f"""
    Zadanie: Napíš jednu úvodnú vetu pre cold email v slovenčine.
    
    Vstupné dáta:
    Názov firmy: {name}
    Popis činnosti: {description}
    Mesto: {city}
    Kategória: {category}
    
    Inštrukcie:
    1. Veta MUSÍ začínať presne takto: "Dobrý deň. Páči sa mi, že v {name}..."
    2. Doplnok vety musí byť KONKRÉTNY podľa popisu činnosti (napr. "sa venujete inštalácii tepelných čerpadiel", "vyrábate dubové parkety", "poskytujete účtovné poradenstvo").
    3. ZAKÁZANÉ VÁGNE FRÁZY: Nepoužívaj "poskytujete kvalitné služby", "ponúkate produkty pre zákazníkov", "ste lídrom na trhu" bez kontextu. Musí to byť o tom, ČO robia.
    4. Ak je popis nedostatočný, použi kategoriu alebo mesto: "že v {name} pôsobíte v meste {city} v oblasti {category}."
    5. Maximálne 1 veta. Žiadne úvodzovky.
    
    Výsledná veta:
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3}
    }
    
    try:
        res = requests.post(API_URL, json=payload, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if 'candidates' in data:
                text = data['candidates'][0]['content']['parts'][0]['text'].strip()
                # Cleanup if AI adds quotes or prefixes
                text = text.replace('"', '').replace("'", "")
                return name, text
        else:
            print(f"API Error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Req Error: {e}")
    
    # Fallback if AI fails completely
    fallback = f"Dobrý deň. Páči sa mi, že v {name} sa venujete podnikaniu v sektore {category or 'služieb'}."
    return name, fallback

# Load Data
try:
    with open('all_leads_raw.json', 'r', encoding='utf-8-sig') as f:
        leads = json.load(f)
except:
    # Try generic utf-8 if sig fails
    with open('all_leads_raw.json', 'r', encoding='utf-8') as f:
        leads = json.load(f)

print(f"Loaded {len(leads)} leads. Starting AI processing...")

final_results = []
start_time = time.time()

# We use ThreadPoolExecutor for speed
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    # Map future to lead
    future_to_lead = {executor.submit(generate_sentence, lead): lead for lead in leads}
    
    completed = 0
    total = len(leads)
    
    for future in concurrent.futures.as_completed(future_to_lead):
        lead = future_to_lead[future]
        try:
            final_name, sentence = future.result()
            
            final_results.append({
                'id': lead.get('id'),
                'original_title': lead.get('title'),
                'website': lead.get('website'),
                'final_company_name': final_name,
                'ai_first_sentence': sentence,
                'email': lead.get('email'),
                'phone': lead.get('phone'),
                'city': lead.get('city'),
                'category': lead.get('category')
            })
            
            completed += 1
            if completed % 50 == 0:
                print(f"Processed {completed}/{total} leads...")
                
        except Exception as exc:
            print(f"Lead {lead.get('id')} generated an exception: {exc}")

# Sort by ID
final_results.sort(key=lambda x: x['id'])

# Write CSV
csv_filename = 'cold_leads_ai_personalized.csv'
fields = ['id', 'original_title', 'website', 'final_company_name', 'ai_first_sentence', 'email', 'phone', 'city', 'category']

with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fields)
    writer.writeheader()
    writer.writerows(final_results)

print(f"Done! Created {csv_filename} in {time.time() - start_time:.2f} seconds.")
