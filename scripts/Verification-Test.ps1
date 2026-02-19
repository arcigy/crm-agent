param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    "Vytvor novy kontakt: Jan Holy, email jan.holy@example.com", # Should see existing one and skip creation
    "Uprav poznamku" # Should fetch notes, see many, and ask which one
)

Write-Host "Verifying Fixes (Redundancy & Ambiguity)..." -ForegroundColor Cyan

foreach ($msg in $testCases) {
    Write-Host "`nTesting: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 120
    Write-Host "Verdict: $($response.verdict)" -ForegroundColor Gray
    Write-Host "Response: $($response.response)" -ForegroundColor Green
    
    Write-Host "Debug Logs:" -ForegroundColor DarkGray
    foreach ($log in $response.logs) {
        if ($log.stage -eq "ROUTER" -or $log.stage -eq "LOOP" -or $log.stage -eq "ERROR") {
            Write-Host "  [$($log.stage)] $($log.message)"
        }
    }
}
