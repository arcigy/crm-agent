param (
    [Parameter(Mandatory = $true)]
    [string]$Prompt
)

$apiUrl = "http://localhost:3000/api/ai/agent"

$body = @{
    messages = @(
        @{
            role    = "user"
            content = $Prompt
        }
    )
    debug    = $true
} | ConvertTo-Json -Depth 5

Write-Host "🚀 Testing Agent with Prompt: '$Prompt'" -ForegroundColor Cyan
Write-Host "--------------------------------------------------"

try {
    # Use -Stream to get real-time feedback if possible, or just the full output
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json" -Headers @{"host" = "localhost:3000" }
    
    # Process the stream
    $lines = $response -split "`n"
    foreach ($line in $lines) {
        if ($line.StartsWith("LOG:")) {
            $logData = $line.Substring(4) | ConvertFrom-Json
            $stage = $logData.stage
            $msg = $logData.message
            $data = $logData.data | ConvertTo-Json -Depth 3
            
            $color = switch ($stage) {
                "ROUTER" { "Yellow" }
                "ORCHESTRATOR" { "Magenta" }
                "PREPARER" { "Blue" }
                "EXECUTOR" { "Green" }
                "VERIFIER" { "Cyan" }
                "ERROR" { "Red" }
                default { "White" }
            }
            
            Write-Host "[$stage] $msg" -ForegroundColor $color
            if ($logData.data) {
                Write-Host $data -ForegroundColor DarkGray
            }
        }
        else {
            if ($line.Trim()) {
                Write-Host ">> $line" -ForegroundColor White
            }
        }
    }
}
catch {
    Write-Host "❌ API Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "--------------------------------------------------"
Write-Host "✅ Test Finished." -ForegroundColor Cyan
