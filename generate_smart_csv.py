import json
import csv
import re

# ------------- CONFIGURATION -------------
INPUT_FILE = 'all_leads_raw.json'
OUTPUT_FILE = 'cold_leads_final_smart.csv'

VERB_MAP = {
    'špecializuje': 'sa špecializujete',
    'zameriava': 'sa zameriavate',
    'venuje': 'sa venujete',
    'zaoberá': 'sa zaoberáte',
    'ponúka': 'ponúkate',
    'poskytuje': 'poskytujete',
    'vyrába': 'vyrábate',
    'realizuje': 'realizujete',
    'zabezpečuje': 'zabezpečujete',
    'vykonáva': 'vykonávate',
    'dodáva': 'dodávate',
    'montuje': 'montujete',
    'predáva': 'predávate',
    'servisuje': 'servisujete',
    'prevádzkuje': 'prevádzkujete',
    'zaisťuje': 'zaisťujete'
}

CATEGORY_DEFAULTS = {
    'Plynoinštalatér': 'sa venujete inštaláciám a servisu plynových zariadení',
    'Kúrenárske práce': 'sa venujete kúrenárskym prácam a inštaláciám',
    'Vodoinštalatér': 'sa venujete vodoinštalatérskym prácam',
    'Stolárstvo': 'sa venujete stolárskym prácam a výrobe nábytku',
    'Kamenárstvo': 'sa venujete kamenárskym prácam',
    'Podlahy': 'sa venujete pokládke a renovácii podláh',
    'Elektrikár': 'poskytujete elektroinštalačné práce',
    'Zámočníctvo': 'sa venujete zámočníckym prácam a kovovýrobe',
    'Klimatizácie': 'sa venujete montáži a servisu klimatizácií',
    'Okná a dvere': 'sa venujete predaju a montáži okien a dverí',
    'Veľkoobchod': 'prevádzkujete veľkoobchodný predaj tovaru',
    'Maloobchod': 'prevádzkujete predajňu s tovarom',
    'Servis': 'poskytujete servisné služby',
    'Stavebná firma': 'realizujete stavebné práce a rekonštrukcie',
}

# Common Cities/Regions to strip provided they are not the ONLY part of the name
CITIES = ["Bratislava", "Košice", "Prešov", "Žilina", "Banská Bystrica", "Nitra", "Trnava", "Trenčín", "Martin", "Poprad", "Prievidza", "Zvolen", "Považská Bystrica", "Nové Zámky", "Michalovce", "Spišská Nová Ves", "Komárno", "Levice", "Humenné", "Bardejov", "Liptovský Mikuláš", "Lučenec", "Piešťany", "Ružomberok", "Topoľčany", "Trebišov", "Čadca", "Dubnica nad Váhom", "Rimavská Sobota", "Partizánske", "Vranov nad Topľou", "Dunajská Streda", "Pezinok", "Brezno", "Senica", "Snina", "Žiar nad Hronom", "Rožňava", "Dolný Kubín", "Bánovce nad Bebravou", "Púchov", "Malacky", "Handlová", "Kežmarok", "Stará Ľubovňa", "Sereď", "Kysucké Nové Mesto", "Galanta", "Detva", "Levoča", "Skalica", "Senec", "Veľký Krtíš", "Poltár", "Revúca", "Myjava", "Svidník", "Nová Baňa", "Sabinov", "Šamorín", "Štúrovo", "Bytča", "Holíč", "Stropkov", "Kolárovo", "Šurany", "Fiľakovo", "Stupava", "Veľké Kapušany", "Moldava nad Bodvou", "Vráble", "Banská Štiavnica", "Modra"]

# ------------- FUNCTIONS -------------

def clean_city_from_name(name):
    """
    Removes city names from the end of the company name if possible.
    E.g. "Plynár Bratislava" -> "Plynár"
    But "Bratislavské Noviny" -> "Bratislavské Noviny" (keep adjective)
    """
    clean = name.strip()
    
    # Check if name is JUST a city -> keep it (unlikely but safe)
    if clean in CITIES:
        return clean
        
    for city in CITIES:
        # Matches "Name City" or "Name - City" or "Name, City"
        # Case insensitive regex match at the end of string
        pattern = r'[\s\-,]+' + re.escape(city) + r'$'
        if re.search(pattern, clean, re.IGNORECASE):
            # Check length to ensure we don't leave empty string or 1-2 chars
            candidate = re.sub(pattern, '', clean, flags=re.IGNORECASE).strip()
            if len(candidate) > 2:
                clean = candidate
                break # Remove only one city (last one)
    
    return clean.strip()

def get_name_from_domain(website):
    if not website:
        return None
    
    base = website.lower().strip()
    base = re.sub(r'^https?://', '', base)
    base = re.sub(r'^www\.', '', base)
    # Remove path
    if '/' in base:
        base = base.split('/')[0]
        
    parts = base.split('.')
    name_part = None
    
    # Heuristics for domain parsing
    if len(parts) >= 2:
        # Standard: firma.sk -> firma
        # Subdomain: sub.firma.sk -> firma (usually SLD)
        # We take parts[-2] for standard TLDs.
        name_part = parts[-2]
    else:
        name_part = parts[0]
        
    if not name_part:
        return None
        
    # Filter generic
    if name_part in ['gmail', 'zoznam', 'centrum', 'azet', 'yahoo', 'outlook', 'facebook', 'instagram', 'linkedin', 'google']:
        return None
    
    # Formatting
    name = name_part.replace('-', ' ').replace('_', ' ').title()
    
    # Final cleanup of city from domain name if requested
    # e.g. plynarbratislava -> Plynarbratislava -> (City check hard here bc concatenated)
    # But if domain is 'plynar-bratislava.sk' -> 'Plynar Bratislava' -> 'Plynar'
    name = clean_city_from_name(name)
    
    return name

def format_title_fallback(title):
    if not title:
        return "Firma"
    
    name = title
    # Remove Legal stuff
    name = re.sub(r'\s*s\.r\.o\.?.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*spol\. s r\.o\..*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*a\.s\.?.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*k\.s\.?.*$', '', name, flags=re.IGNORECASE)
    
    # Remove separator + tail
    name = re.sub(r'\s[|\-–]\s.*$', '', name)
    
    # Clean City
    name = clean_city_from_name(name)
    
    return name.strip()

def generate_personalized_fragment(abstract, category):
    # Strategy: Find verb in abstract -> Transform to 2nd person -> Append context
    
    if abstract and len(abstract) > 10:
        # Look for Verb Keywords
        for key_verb, result_verb in VERB_MAP.items():
            # Regex to find verb bound by word boundaries
            # Capture verb + next 6 words
            pattern = r'\b' + re.escape(key_verb) + r'\b(.*?)(?:[.,;]|$)'
            match = re.search(pattern, abstract, re.IGNORECASE)
            
            if match:
                # We found a match!
                context = match.group(1).strip()
                # Limit context length to avoid super long sentences
                words = context.split()
                if len(words) > 8:
                    context = " ".join(words[:8])
                
                # If context is empty, skip
                if not context:
                    continue
                    
                return f"{result_verb} {context}"
    
    # Fallback to Category Logic
    for cat_key, sentence_part in CATEGORY_DEFAULTS.items():
        if category and cat_key.lower() in category.lower():
            return sentence_part
            
    # Ultimate Fallback
    cat_clean = category if category else "oblasti služieb"
    return f"pôsobíte v sektore {cat_clean}"


# ------------- MAIN EXECUTION -------------

processed_rows = []

print("Loading JSON...")
try:
    with open(INPUT_FILE, 'r', encoding='utf-8-sig') as f:
        leads = json.load(f)
except:
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        leads = json.load(f)

print(f"Processing {len(leads)} leads...")

for lead in leads:
    website = lead.get('website', '')
    title = lead.get('title', '')
    abstract = lead.get('abstract', '')
    category = lead.get('category', '')
    city = lead.get('city', '')
    
    # 1. Determine Name
    final_name = get_name_from_domain(website)
    if not final_name:
        final_name = format_title_fallback(title)
        
    # 2. Determine Sentence Fragment
    fragment = generate_personalized_fragment(abstract, category)
    
    # 3. Construct Full Sentence
    # Cleanup fragment leading/trailing punctuation just in case
    fragment = fragment.strip(" .,")
    
    sentence = f"Dobrý deň. Páči sa mi, že v {final_name} {fragment}."
    
    processed_rows.append({
        'id': lead.get('id'),
        'original_title': title,
        'website': website,
        'final_company_name': final_name,
        'ai_first_sentence': sentence,
        'email': lead.get('email', ''),
        'phone': lead.get('phone', ''),
        'city': city,
        'category': category
    })

# Write CSV
fields = ['id', 'original_title', 'website', 'final_company_name', 'ai_first_sentence', 'email', 'phone', 'city', 'category']

try:
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(processed_rows)
    print(f"Success! Output saved to: {OUTPUT_FILE}")
    print(f"Sample 1: {processed_rows[0]['final_company_name']} -> {processed_rows[0]['ai_first_sentence']}")
    print(f"Sample 2: {processed_rows[1]['final_company_name']} -> {processed_rows[1]['ai_first_sentence']}")
except Exception as e:
    print(f"Error writing CSV: {e}")
