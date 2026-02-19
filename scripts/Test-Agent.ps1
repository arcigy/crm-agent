param(
    [string]$Message = "",
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose = $false
)

$API_KEY = $env:TEST_API_KEY
if (-not $API_KEY) {
    $API_KEY = "dev-test-key-arcigy-2025"
}

$ENDPOINT = "$BaseUrl/api/test/agent"

function Write-Stage($stage, $msg, $data = $null) {
    $color = switch ($stage) {
        "ROUTER" { "Cyan" }
        "LOOP" { "Yellow" }
        "ORCHESTRATOR" { "Magenta" }
        "PREPARER" { "Blue" }
        "EXECUTOR" { "Green" }
        "VERIFIER" { "White" }
        "COST" { "DarkGray" }
        "ERROR" { "Red" }
        default { "Gray" }
    }
    $line = "[$stage] $msg"
    if ($data -and $Verbose) {
        $line += " | " + ($data | ConvertTo-Json -Compress -Depth 3)
    }
    elseif ($data -and ($stage -eq "VERIFIER" -or $stage -eq "ROUTER" -or $stage -eq "ERROR")) {
        if ($data -is [string]) { $line += ": $data" }
        elseif ($data.type) { $line += " -> $($data.type)" }
    }
    Write-Host $line -ForegroundColor $color
}

function Invoke-AgentTest($testMessage, $label = "") {
    $label = if ($label) { $label } else { $testMessage }
    Write-Host "`n---------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  TEST: $label" -ForegroundColor White
    Write-Host "---------------------------------------------------" -ForegroundColor DarkGray

    $body = @{ message = $testMessage } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod `
            -Uri $ENDPOINT `
            -Method Post `
            -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } `
            -Body $body `
            -ErrorAction Stop

        foreach ($log in $response.logs) {
            Write-Stage $log.stage $log.message $log.data
        }
    }
    catch {
        Write-Host "[ERROR] HTTP $_" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host ($_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 5) -ForegroundColor Red
        }
    }
}

if ($Message -ne "") {
    Invoke-AgentTest $Message "Custom: $Message"
    exit
}

Write-Host "`nArciGy Agent Test Suite" -ForegroundColor Cyan
Write-Host "Endpoint: $ENDPOINT`n" -ForegroundColor DarkGray

Write-Host "`n[ INFO_ONLY TESTS ]" -ForegroundColor Yellow
Invoke-AgentTest "Vies vyhladavat na webe?"
Invoke-AgentTest "Co vsetko dokazes?"
Invoke-AgentTest "Mozes pracovat s emailami?"
Invoke-AgentTest "Ahoj, ako sa mas?"
Invoke-AgentTest "Co je CRM system?"

Write-Host "`n[ ACTION via QUESTION TESTS ]" -ForegroundColor Green
Invoke-AgentTest "Mozes mi poslat email Martinovi?"
Invoke-AgentTest "Vies mi najst kontakt Petra Novaka?"
Invoke-AgentTest "Mozes vytvorit poznamku o stretnuti s ArciGy?"

Write-Host "`n[ DIRECT ACTION TESTS ]" -ForegroundColor Green
Invoke-AgentTest "Vytvor poznamku o stretnuti s Martinom"
Invoke-AgentTest "Najdi kontakt Jana Novaka"
Invoke-AgentTest "Vyhladaj firmu Telekom na webe"

Write-Host "`nTest suite finished." -ForegroundColor Cyan
