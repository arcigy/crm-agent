$token = "3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE"
$baseUrl = "https://directus-buk1-production.up.railway.app"
$headers = @{
    "Authorization" = "Bearer $token"
}

$collections = @(
    "activities", "android_logs", "ai_audit_logs", "automation_logs",
    "google_maps_scrapes", "google_tokens", "google_contacts",
    "contacts", "projects", "deals", "crm_tasks", "crm_notes",
    "ai_memories", "leads", "outreach_leads", "outreach_campaigns",
    "audit_logs", "audit_logs_archive"
)

Write-Host "📊 Fetching row counts from Directus..." -ForegroundColor Cyan

$results = foreach ($col in $collections) {
    try {
        $url = "$baseUrl/items/$col?aggregate[count]=*"
        $res = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
        $count = $res.data[0].count
        [PSCustomObject]@{
            Collection = $col
            RowCount   = $count
        }
    } catch {
        [PSCustomObject]@{
            Collection = $col
            RowCount   = "N/A (Not Found or Error)"
        }
    }
}

$results | Format-Table -AutoSize
