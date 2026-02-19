param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    # --- Capability / Info ---
    "Ahoj, co vsetko vies robit?",
    "Vies mi najst info o nejakej firme na webe?",
    "Mozes pracovat s Gmailom?",
    "Ako sa volam?",
    
    # --- Search & CRM Lookups ---
    "Najdi mi kontakt menom Martin Novak",
    "Mas v databaze nejaku firmu Telekom?",
    "Najdi mi vsetky projekty ktore koncia tento mesiac",
    "Ake su najnovsie poznamky v CRM?",
    
    # --- Creations ---
    "Vytvor novy kontakt: Jan Holy, email jan.holy@example.com",
    "Pridaj poznamku k ESET-u o tom ze sme dnes dohodli zmluvu",
    "Vytvor novu ulohu: Kupit kvety pre sekretarku na zajtra",
    "Zaloz novy projekt: CRM Update pre klienta ArciGy s hodnotou 5000 eur",
    
    # --- Multi-step Research ---
    "Vyhlada firmu Telekom na webe a uloz ich hlavny email do CRM ako novy kontakt",
    "Najdi najnovsi email od branislav@arcigy.group a sprav z neho poznamku v CRM",
    
    # --- Ambiguity & Handling ---
    "Uprav poznamku",  # Should trigger Preparer question
    "Zmaz kontakt Neznamy",
    
    # --- Complex Logic ---
    "Analyzuj moje posledne emaily a napis mi summary co musim dnes surne vyriesit",
    "Najdi firmu Orange, zisti kto je ich CEO a pridaj to ako novy kontakt",
    
    # --- Slovak Language & Tone ---
    "Napis velmi profesionalnu poznamku o strategickom planovani pre rok 2026",
    "Zhrn vsetky info o ESET-e do jednej prehladnej poznamky",
    
    # --- Edge Cases ---
    "...", 
    "12345",
    "asdfghjkl",
    "mozes mi urobit kavu?",
    "kedy mam narodeniny?",
    "vies mi povedat vtip?",
    "priprav mi report o vsetkych kontaktoch co nemaju telefonne cislo"
)

Write-Host "Starting Full Stress Test (25 cases)..." -ForegroundColor Cyan

foreach ($msg in $testCases) {
    Write-Host "Testing: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 120
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
