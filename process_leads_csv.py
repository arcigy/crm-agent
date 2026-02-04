import json
import csv
import re
import requests
import time

# Load data
try:
    with open('all_leads_raw.json', 'r', encoding='utf-8-sig') as f:
        leads = json.load(f)
except Exception as e:
    print(f"Error loading JSON: {e}")
    exit()

def get_domain_based_name(website):
    if not website:
        return None
    
    # Simple clean
    base = website.lower().strip()
    base = re.sub(r'^https?://', '', base)
    base = re.sub(r'^www\.', '', base)
    
    # Extract domain part (before the first slash)
    domain_full = base.split('/')[0]
    
    # Extract SLD (e.g. 'google' from 'google.com')
    # This is simplistic but works for .sk, .com, .eu mostly
    parts = domain_full.split('.')
    if len(parts) >= 2:
        # Avoid generic domains
        sld = parts[-2] if parts[-1] in ['sk', 'com', 'eu', 'net', 'org', 'cz', 'hu'] and len(parts) > 2 else parts[0]
        # Actually for 'firma.sk', parts=['firma', 'sk']. sld is parts[0].
        # For 'sub.firma.sk', parts=['sub', 'firma', 'sk'].
        
        # Let's take the part before the TLD (last part)
        # Better: use the *longest* meaningful part or just the SLD.
        # Standard approach: parts[-2]
        
        relevant_part = parts[0]
        if len(parts) > 1:
            relevant_part = parts[-2]
            
        # Filter generic email providers if they appear as websites (rare but possible)
        if relevant_part in ['gmail', 'zoznam', 'centrum', 'azet', 'yahoo', 'outlook']:
            return None
            
        # Formatting
        # 1. Replace hyphens with spaces
        name = relevant_part.replace('-', ' ').replace('_', ' ')
        
        # 2. Title Case
        name = name.title()
        
        return name
    return None

def clean_title_fallback(title):
    if not title:
        return "Firma"
    
    name = title
    # Remove standard entities
    name = re.sub(r'\s*s\.r\.o\.?.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*spol\. s r\.o\..*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*a\.s\.?.*$', '', name, flags=re.IGNORECASE)
    
    # Remove trailing stuff after separators
    name = re.sub(r'\s[|\-–]\s.*$', '', name)
    
    return name.strip()

processed_leads = []

print(f"Processing {len(leads)} leads...")

for lead in leads:
    original_title = lead.get('title', '')
    website = lead.get('website', '')
    
    # Strategy: Domain first, then Title cleanup
    final_name = get_domain_based_name(website)
    
    if not final_name:
        final_name = clean_title_fallback(original_title)
        
    # Generate Sentence
    # "Dobrý deň. Páči sa mi, že v {Name} sa venujete poskytovaniu kvalitných služieb a produktov pre Vašich zákazníkov."
    # Or simplified/varied. User seems to be okay with the template if the name is good.
    
    sentence = f"Dobrý deň. Páči sa mi, že v {final_name} sa venujete poskytovaniu kvalitných služieb a produktov pre Vašich zákazníkov."
    
    # Prepare CSV Row
    processed_leads.append({
        'id': lead.get('id'),
        'original_title': original_title,
        'website': website,
        'final_company_name': final_name,
        'ai_first_sentence': sentence,
        'email': lead.get('email', ''),
        'phone': lead.get('phone', ''),
        'city': lead.get('city', ''),
        'category': lead.get('category', '')
    })

# Write CSV
csv_filename = 'cold_leads_final_cleaned.csv'
fields = ['id', 'original_title', 'website', 'final_company_name', 'ai_first_sentence', 'email', 'phone', 'city', 'category']

try:
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        writer.writerows(processed_leads)
    print(f"Successfully created {csv_filename}")
except Exception as e:
    print(f"Error writing CSV: {e}")
