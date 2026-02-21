param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$missions = @(
    "Vyhladaj na webe 5 najvacsich IT firiem na Slovensku, pre kazdu zisti ich web a scrapni z ich uvodnej stranky co robia. Potom v CRM pre kazdu firmu vytvor novy kontakt (ako firmu), pridaj k nim poznamku s tvojim zistenim a nakoniec mi napis sAohrnny report o tychto firmach do novej samostatnej poznamky v CRM.",
    "Najdi v mojich emailoch vsetko o 'faktura' alebo 'platba' za posledny mesiac, zisti od koho su tie maily, skontroluj ci ti ludia su v CRM, ak nie tak ich tam pridaj, ku kazdemu z nich vytvor projekt 'Fakturacia 2026' a do poznamky k projektu vypis sumy ktore spominaju v mailoch.",
    "Precitaj si subory src/app/actions/agent-orchestrator.ts a src/app/actions/agent-helpers.ts, porovnaj ich logiku, najdi kde su duplicity v kode a uloz tuto technicku analyzu ako 1000-slovny dokument do CRM poznamok pre developera."
)

Write-Host ">>> STARTING CONTINUOUS HEAVY MISSION RUN (EST. 5-10 MINS) <<<" -ForegroundColor Cyan

foreach ($msg in $missions) {
    Write-Host "`nLAUNCHING MISSION: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 600
        $stopwatch.Stop()
        
        Write-Host "MISSION ACCOMPLISHED in $($stopwatch.Elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Green
        Write-Host "  Verdict: $($response.verdict)" -ForegroundColor Gray
        $planLog = $response.logs | Where-Object { $_.stage -eq "LOOP" -and $_.message -like "Plan:*" }
        if ($planLog) {
            Write-Host "  Plan: $($planLog.message)" -ForegroundColor Yellow
            Write-Host "  Thought: $($planLog.data.thought)" -ForegroundColor DarkYellow
        }
        Write-Host "  Response Summary: $($response.response.Substring(0, [Math]::Min(200, $response.response.Length)))..."
    }
    catch {
        $stopwatch.Stop()
        Write-Host "MISSION FAILED after $($stopwatch.Elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Red
        Write-Host "Error: $_"
    }
    Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
}

Write-Host "`n>>> ALL MISSIONS COMPLETED <<<" -ForegroundColor Cyan
