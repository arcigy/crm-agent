import requests
import json
import sys

# Force UTF-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
URL = "https://directus-buk1-production.up.railway.app/items/cold_leads"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def get_domain_name(website):
    if not website:
        return None
    
    # Remove protocol
    clean = website.lower().replace('https://', '').replace('http://', '').replace('www.', '')
    
    # Remove path
    if '/' in clean:
        clean = clean.split('/')[0]
        
    # Get main part (assuming structure like name.sk or name.com)
    # If using subdomains like 'sub.domain.com', this might be tricky, but mostly it's simple.
    parts = clean.split('.')
    if len(parts) >= 2:
        main_part = parts[0]
        # Heuristic: if main part is generic like 'web', 'pages', skip? 
        # But mostly it is 'firma.sk'.
        
        # Format: replace hyphens with spaces, title case
        nice_name = main_part.replace('-', ' ').replace('_', ' ').title()
        return nice_name
    return None

# Fetch leads with websites
response = requests.get(f"{URL}?limit=50&filter[website][_nnull]=true", headers=headers)
data = response.json()['data']

print(f"{'CURRENT NAME':<40} | {'DOMAIN NAME':<40} | {'WEBSITE'}")
print("-" * 120)

count = 0
for item in data:
    if count > 20: break
    current = item.get('company_name_reworked', '')
    website = item.get('website', '')
    domain_name = get_domain_name(website)
    
    if domain_name and domain_name != current:
        print(f"{current:<40} | {domain_name:<40} | {website}")
        count += 1
