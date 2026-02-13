import http.client
import json
import urllib.parse

# Configuration
DIRECTUS_HOST = "directus-buk1-production.up.railway.app"
DIRECTUS_TOKEN = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"

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

def move_jobs_to_statik(job_ids):
    for job_id in job_ids:
        print(f"Processing job ID: {job_id}")
        
        # Get all leads from this job
        filter_str = json.dumps({"google_maps_job_id": {"_eq": str(job_id)}})
        status, json_data = make_request("GET", f"/items/cold_leads?filter={urllib.parse.quote(filter_str)}&limit=-1")
        
        if status == 200:
            leads = json_data.get('data', [])
            print(f"Found {len(leads)} leads for job {job_id}")
            
            for lead in leads:
                if lead.get('list_name') != "Statik":
                    print(f"Moving {lead['title']} to Statik list")
                    make_request("PATCH", f"/items/cold_leads/{lead['id']}", {"list_name": "Statik"})
        else:
            print(f"Error fetching leads for job {job_id}: {status}")

if __name__ == "__main__":
    move_jobs_to_statik([26, 33])
