param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    "Vytvor novu ulohu: Kupit kvety pre sekretarku na zajtra",
    "Vyhlada firmu ESET na webe a uloz ich hlavny email do CRM ako novy kontakt",
    "Mozes mi urobit kavu?"
)

Write-Host "Starting Stress Test (30 cases)..." -ForegroundColor Cyan

foreach ($msg in $testCases) {
    Write-Host "Testing: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 60
        $verdict = $response.verdict
        $output = $response.response
        
        $vColor = "Yellow"
        if ($verdict -eq "ACTION") { $vColor = "Green" }
        
        Write-Host "  Verdict: $verdict" -ForegroundColor $vColor
        Write-Host "  Response: $output"
    }
    catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
    }
    Write-Host "----------------" -ForegroundColor DarkGray
}
