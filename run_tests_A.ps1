$tests = @(
    @{ id = "A1"; prompt = "Nájdi kontakt Peter" },
    @{ id = "A2"; prompt = "Najdi kontakt Jan Novak" },
    @{ id = "A3"; prompt = "Ukáž mi pipeline" },
    @{ id = "A4"; prompt = "Aké mám dnes úlohy" }
)

$results = @()

foreach ($test in $tests) {
    Write-Host "Running Test $($test.id): $($test.prompt)..."
    $start = Get-Date
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/ai/agent" -Method Post -Body (@{ message = $test.prompt } | ConvertTo-Json) -ContentType "application/json"
        $end = Get-Date
        $duration = ($end - $start).TotalSeconds
        
        $results += [PSCustomObject]@{
            Id       = $test.id
            Prompt   = $test.prompt
            Duration = $duration
            Response = $response
            Success  = $true
        }
        Write-Host "Finished in $duration seconds."
    }
    catch {
        $results += [PSCustomObject]@{
            Id       = $test.id
            Prompt   = $test.prompt
            Duration = (($end - $start).TotalSeconds)
            Response = $_.Exception.Message
            Success  = $false
        }
        Write-Host "Failed: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 2
}

$results | Export-Clixml -Path "test_results_A.xml"
Write-Host "Batch A results saved."
