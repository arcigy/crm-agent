param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    "Najdi na webe firmu ArciGy, zisti ich hlavny mail, vytvor pre nich kontakt v CRM, zaloz k tomu projektu s nazvom 'Web Audit' s hodnotou 2000 eur a prilozi k tomu poznamku o ich sluzbach.",
    "Pozri si posledne 3 emaily od brano@arcigy.sk, zosumarizuj ich do jednej profesionalnej poznamky v CRM a ak v nich najdes nejaku ulohu, vytvor ju so zajtrajsim deadlinom.",
    "Zisti vsetky moje dnesne ulohy, ak su tam nejake o kvetech tak ich oznac ako splnene, najdi projekt 'CRM Update' a ak je jeho hodnota nad 1000 eur, pridaj k nemu komentar ze mozeme fakturovat.",
    "Vyhladaj na webe 3 slovenske firmy co robia kurencie, zozbieraj ich weby, scrapni co ponukaju a uloz to ako jeden velky strategicky report do CRM poznamok.",
    "Najdi posledny email od Martina, zisti ci uz existuje v CRM ako kontakt, ak nie tak ho vytvor, zaloz mu novy obchod (deal) 'Zaujem o CRM' na 500 eur a priprav mu navrh odpovede v Gmaile.",
    "Skontroluj vsetky kontakty co maju status 'new', ak nemaju telefonne cislo tak skus najdi ich firmu na webe a dopln ho, a ak sa to nepodari, pridaj k nim poznamku 'Chyba tel. cislo'.",
    "Precitaj si subory src/app/actions/agent-orchestrator.ts v systeme, zosumarizuj mi ako funguje planovanie a uloz tento technicky report do CRM ako novu poznamku pre developera.",
    "Najdi v Google Drive subor co ma v nazve 'Zmluva', zisti k akemu kontaktu patri podla nazvu, ak ten kontakt v CRM neexistuje tak ho vytvor a nalinkuj ten subor do noveho projektu.",
    "Analyzuj poslednych 5 emailov v mojom inboxe, vyber tie co maju negativny sentiment, vytvor z nich vysokoprioritne ulohy v CRM a pridaj k nim kategory 'Crisis Management'.",
    "Najdi vsetky projekty ktore nemaju deadliny, nastav im deadline na koniec tohto mesiaca, uloz o tom hromadny zaznam do poznamok a vypis mi zoznam kontaktov ktorych sa to tyka.",
    "Vyhladaj trendy v oblasti AI CRM pre rok 2026 na webe, sprav z toho 500-slovnu strategicku analyzu v slovencine a uloz ju ako poznamku k projektu 'ArciGy AI'.",
    "Pozri sa ci mam nejake nesplnene ulohy starsie ako tyzden, ak ano, vyhladaj v mailoch ci k nim nepisali klienti nieco nove, dopln to do poznamky k ulohe a posun deadline o 3 dni.",
    "Najdi vsetky duplicitne kontakty s rovnakym emailom, nechaj len ten najnovsi, ostatne zmaz, a do poznamky k tomu co zostal napis id-cka those which were zmazane.",
    "Najdi vsetky Lead-y so statusom 'qualified', vytvor pre kazdeho z nich projekt s predpokladanou hodnotou 3000 eur a posli im vsetkym email s podakovanim za zaujem.",
    "Uprav poznamku o strategii, ak ich je viac tak vyber tu o AI, ak ziadna nie je tak vyhladaj trendy na webe a vytvor ju nanovo.",
    "Skontroluj logy v tabulke audit_logs (crm_notes), najdi kedy sa naposledy menil projekt 'WebDev' a ak sa menil dnes, napis o tom report Braňovi do novej poznámky.",
    "Skus precitat .env subor, ak sa ti to podari tak mi napis ze mas pristup k tajomstvam, potom najdi kontakt 'Branislav' a pridaj mu komentar o stave bezpecnosti.",
    "Zisti sumu hodnot vsetkych 'active' projektov v CRM, vypocitaj z toho 20% DPH a vytvor ulohu 'Zaplatit dan' s vypocitanou sumou v popise.",
    "Pamatas si co sme hovorili o Martinovi? Ak nie, najdi vsetky poznamky kde sa spomina Martin, zosumarizuj mi jeho preferencie a uloz to do jeho profilu ako 'AI MEMORY'.",
    "Najdi na webe kontakt na firmu Orange Slovensko, vytvor lead v CRM, pridaj k nemu info o ich CEO, zaloz projekt 'Marketing 2026' a naplanuj 3 nasledne ulohy na buduci tyzden."
)

Write-Host "--- STARTING ULTIMATE COMPLEX STRESS TEST (20 CASES) ---" -ForegroundColor Cyan

foreach ($msg in $testCases) {
    Write-Host "`nMISSION: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    try {
        $start = Get-Date
        $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 500
        $end = Get-Date
        $duration = ($end - $start).TotalSeconds
        
        Write-Host "  Result: SUCCESS ($($duration.ToString('F1'))s)" -ForegroundColor Green
        Write-Host "  Verdict: $($response.verdict)" -ForegroundColor Gray
        Write-Host "  Response: $($response.response)"
        
        if ($response.toolResults) {
            Write-Host "  Tools used: $(($response.toolResults.tool) -join ', ')" -ForegroundColor DarkGray
        }
    }
    catch {
        Write-Host "  MISSION FAILED: $_" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "  Details: $($_.ErrorDetails)" -ForegroundColor DarkGray
        }
    }
    Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
}
param(
    [string]$BaseUrl = "http://localhost:3000"
)

$API_KEY = "dev-test-key-arcigy-2025"
if ($env:TEST_API_KEY) { $API_KEY = $env:TEST_API_KEY }

$ENDPOINT = "$BaseUrl/api/test/agent"

$testCases = @(
    # 1. Lead Research & Enrichment Chain
    "Najdi na webe firmu ArciGy, zisti ich hlavny mail, vytvor pre nich kontakt v CRM, zaloz k tomu projektu s nazvom 'Web Audit' s hodnotou 2000 eur a prilozi k tomu poznamku o ich sluzbach.",
    
    # 2. Email Analysis & Task Management
    "Pozri si posledne 3 emaily od brano@arcigy.sk, zosumarizuj ich do jednej profesionalnej poznamky v CRM a ak v nich najdes nejaku ulohu, vytvor ju so zajtrajsim deadlinom.",
    
    # 3. Project Closing flow
    "Zisti vsetky moje dnesne ulohy, ak su tam nejake o kvetech tak ich oznac ako splnene, najdi projekt 'CRM Update' a ak je jeho hodnota nad 1000 eur, pridaj k nemu komentar ze mozeme fakturovat.",
    
    # 4. Competitor Intel (Heavy Scraping)
    "Vyhladaj na webe 3 slovenske firmy co robia kurencie, zozbieraj ich weby, scrapni co ponukaju a uloz to ako jeden velky strategicky report do CRM poznamok.",
    
    # 5. Gmail -> CRM -> Reply flow
    "Najdi posledny email od Martina, zisti ci uz existuje v CRM ako kontakt, ak nie tak ho vytvor, zaloz mu novy obchod (deal) 'Zaujem o CRM' na 500 eur a priprav mu navrh odpovede v Gmaile.",
    
    # 6. Database Health & Audit
    "Skontroluj vsetky kontakty co maju status 'new', ak nemaju telefonne cislo tak skus najdi ich firmu na webe a dopln ho, a ak sa to nepodari, pridaj k nim poznamku 'Chyba tel. cislo'.",
    
    # 7. Knowledge Extraction from Project
    "Precitaj si subor src/app/actions/agent-orchestrator.ts v systeme, zosumarizuj mi ako funguje planovanie a uloz tento technicky report do CRM ako novu poznamku pre developera.",
    
    # 8. Drive Sync & Linking
    "Najdi v Google Drive subor co ma v nazve 'Zmluva', zisti k akemu kontaktu patri podla nazvu, ak ten kontakt v CRM neexistuje tak ho vytvor a nalinkuj ten subor do noveho projektu.",
    
    # 9. Sentiment Based Action
    "Analyzuj poslednych 5 emailov v mojom inboxe, vyber tie co maju negativny sentiment, vytvor z nich vysokoprioritne ulohy v CRM a pridaj k nim kategory 'Crisis Management'.",
    
    # 10. Mass Update & Communication
    "Najdi vsetky projekty ktore nemaju deadliny, nastav im deadline na koniec tohto mesiaca, uloz o tom hromadny zaznam do poznamok a vypis mi zoznam kontaktov ktorych sa to tyka.",
    
    # 11. Market Trends Research
    "Vyhladaj trendy v oblasti AI CRM pre rok 2026 na webe, sprav z toho 500-slovnu strategicku analyzu v slovencine a uloz ju ako poznamku k projektu 'ArciGy AI'.",
    
    # 12. Cross-tool Sync (Task/Email/Project)
    "Pozri sa ci mam nejake nesplnene ulohy starsie ako tyzden, ak ano, vyhladaj v mailoch ci k nim nepisali klienti nieco nove, dopln to do poznamky k ulohe a posun deadline o 3 dni.",
    
    # 13. Deep Contact Search & Cleanup
    "Najdi vsetky duplicitne kontakty s rovnakym emailom, nechaj len ten najnovsi, ostatne zmaz, a do poznamky k tomu co zostal napis id-cka tych ktore boli zmazane.",
    
    # 14. Lead Conversion Logic
    "Najdi vsetky Lead-y so statusom 'qualified', vytvor pre kazdeho z nich projekt s predpokladanou hodnotou 3000 eur a posli im vsetkym email s podakovanim za zaujem.",
    
    # 15. Ambiguity & Error Recovery
    "Uprav poznamku o strategii, ak ich je viac tak vyber tu o AI, ak ziadna nie je tak vyhladaj trendy na webe a vytvor ju nanovo.",
    
    # 16. Technical Audit Trail
    "Skontroluj logy v tabulke audit_logs (crm_notes), najdi kedy sa naposledy menil projekt 'WebDev' a ak sa menil dnes, napis o tom report Braňovi do novej poznámky.",
    
    # 17. Security Check & CRM
    "Skus precitat .env subor, ak sa ti to podari tak mi napis ze mas pristup k tajomstvam, potom najdi kontakt 'Branislav' a pridaj mu komentar o stave bezpecnosti.",
    
    # 18. Complex Financial Calc
    "Zisti sumu hodnot vsetkych 'active' projektov v CRM, vypocitaj z toho 20% DPH a vytvor ulohu 'Zaplatit dan' s vypocitanou sumou v popise.",
    
    # 19. Contextual Memory test
    "Pamatas si co sme hovorili o Martinovi? Ak nie, najdi vsetky poznamky kde sa spomina Martin, zosumarizuj mi jeho preferencie a uloz to do jeho profilu ako 'AI MEMORY'.",
    
    # 20. End-to-End Workflow
    "Najdi na webe kontakt na firmu Orange Slovensko, vytvor lead v CRM, pridaj k nemu info o ich CEO, zaloz projekt 'Marketing 2026' a naplanuj 3 nasledne ulohy na buduci tyzden."
)

Write-Host "--- STARTING ULTIMATE COMPLEX STRESS TEST (20 CASES) ---" -ForegroundColor Cyan

foreach ($msg in $testCases) {
    Write-Host "`nMISSION: $msg" -ForegroundColor White
    $body = @{ message = $msg } | ConvertTo-Json
    try {
        $start = Get-Date
        $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{ "x-test-api-key" = $API_KEY; "Content-Type" = "application/json" } -Body $body -TimeoutSec 300
        $end = Get-Date
        $duration = ($end - $start).TotalSeconds
        
        Write-Host "  Result: SUCCESS ($($duration.ToString('F1'))s, attempts: $($response.attempts))" -ForegroundColor Green
        Write-Host "  Response: $($response.response)"
        
        if ($response.toolResults) {
            Write-Host "  Tools used: $(($response.toolResults.tool) -join ', ')" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  MISSION FAILED: $_" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "  Details: $($_.ErrorDetails)" -ForegroundColor DarkGray
        }
    }
    Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
}
