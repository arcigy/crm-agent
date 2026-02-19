param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    "Ahoj, co vsetko vies robit?",
    "Vies mi najst info o nejakej firme na webe?",
    "Mozes pracovat s Gmailom?",
    "Ako sa volam?",
    "Najdi mi kontakt menom Martin Novak",
    "Mas v databaze nejaku firmu Telekom?",
    "Najdi mi vsetky projekty ktore koncia tento mesiac",
    "Ake su najnovsie poznamky v CRM?",
    "Vytvor novy kontakt: Jan Holy, email jan.holy@example.com",
    "Pridaj poznamku k Martinovi Novakovi o tom ze sme dnes dohodli zmluvu",
    "Vytvor novu ulohu: Kupit kvety pre sekretarku na zajtra",
    "Zaloz novy projekt: CRM Update pre klienta ArciGy s hodnotou 5000 eur",
    "Vyhlada firmu ESET na webe a uloz ich hlavny email do CRM ako novy kontakt",
    "Najdi najnovsi email od Martina a sprav z neho poznamku v CRM",
    "Pozri sa na projekt WebDev a zisti ci sme uz dostali zaplatene faktury v Gmaily",
    "Uprav poznamku",
    "Zmaz kontakt Martin",
    "Zmen status projektu na 'Done'",
    "Analyzuj moje posledne emaily a napis mi summary co musim dnes surne vyriesit",
    "Najdi firmu Orange, zisti kto je ich CEO a pridaj to ako novy kontakt",
    "Pozri sa na vsetky dnesne ulohy a ak nejaka chyba, vytvor ju z info v Gmaile",
    "Napis velmi profesionalnu poznamku o strategickom planovani pre rok 2026",
    "Zhrn vsetky info o Martinovi do jednej prehladnej poznamky",
    "...", 
    "12345",
    "asdfghjkl",
    "mozes mi urobit kavu?",
    "kedy mam narodeniny?",
    "vies mi povedat vtip?",
    "priprav mi report o vsetkych kontaktoch co nemaju telefonne cislo"
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
