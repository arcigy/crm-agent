# =============================================================================
# test-agent.ps1 — CRM AI Agent Terminal Tester
# User: branislav@arcigy.group
# Endpoint: https://crm.arcigy.cloud/api/test/agent
#
# Použitie:
#   .\scripts\test-agent.ps1 -Prompt "Nájdi kontakt Google"
#   .\scripts\test-agent.ps1 -Prompt "Vytvor projekt" -Local
#   .\scripts\test-agent.ps1 -Prompt "Pošli email" -ShowConsoleLogs
#   .\scripts\test-agent.ps1 -Interactive
# =============================================================================
param (
    [string]$Prompt = "",
    [switch]$Local,           # Use localhost:3000 instead of production
    [switch]$ShowConsoleLogs, # Print full server-side console.log capture
    [switch]$ShowStateEvents, # Print orchestrator state events
    [switch]$Interactive,     # Multi-turn chat mode
    [string]$ApiKey = ""      # Overrides env TEST_API_KEY
)

# ── CONFIG ────────────────────────────────────────────────────────────────────
$BaseUrl = if ($Local) { "http://localhost:3000" } else { "https://crm.arcigy.cloud" }
$Endpoint = "$BaseUrl/api/test/agent"
$Key = if ($ApiKey) { $ApiKey } elseif ($env:TEST_API_KEY) { $env:TEST_API_KEY } else { "dev-test-key" }
$UserEmail = "branislav@arcigy.group"

# ── HELPERS ───────────────────────────────────────────────────────────────────
function Write-Stage([string]$Stage, [string]$Msg, [string]$Color = "White") {
    $tag = "[$Stage]".PadRight(14)
    Write-Host $tag -ForegroundColor $Color -NoNewline
    Write-Host " $Msg" -ForegroundColor White
}

function Write-Detail([string]$Text) {
    Write-Host "               $Text" -ForegroundColor DarkGray
}

function Write-Sep([string]$Title = "") {
    if ($Title) {
        Write-Host ""
        Write-Host "─── $Title " -ForegroundColor DarkCyan -NoNewline
        Write-Host ("─" * [Math]::Max(0, 60 - $Title.Length)) -ForegroundColor DarkCyan
    }
    else {
        Write-Host ("─" * 64) -ForegroundColor DarkGray
    }
}

function Invoke-Agent([string]$Message, [array]$History = @()) {
    $body = @{
        message = $Message
        history = $History
    } | ConvertTo-Json -Depth 10

    $headers = @{
        "x-test-api-key" = $Key
        "Content-Type"   = "application/json"
    }

    Write-Sep "REQUEST"
    Write-Stage "USER" "`"$Message`"" "Cyan"
    Write-Stage "TARGET" "$Endpoint" "DarkGray"
    Write-Stage "AS" "$UserEmail" "DarkGray"
    Write-Host ""

    $startTime = Get-Date

    try {
        $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $body -Headers $headers -TimeoutSec 120
        $elapsed = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)

        # ── PATH ──────────────────────────────────────────────────
        $path = $resp._debug.path
        $iters = $resp._debug.iterations
        $total = $resp._debug.total_ms

        Write-Sep "PIPELINE ($path) — ${elapsed}s total"

        # ── GATEKEEPER ────────────────────────────────────────────
        $gk = $resp._debug.gatekeeper
        $gkColor = if ($gk.verdict -eq "ACTION") { "Green" } else { "Yellow" }
        Write-Stage "GATEKEEPER" "$($gk.verdict)  ($($gk.ms)ms)" $gkColor

        # ── ORCHESTRATOR ──────────────────────────────────────────
        if ($resp._debug.orchestrator) {
            $orch = $resp._debug.orchestrator
            Write-Stage "ORCHESTRATOR" "$iters iteration(s)  ($($orch.ms)ms)" "Magenta"
            if ($orch.last_plan) {
                Write-Detail "Intent : $($orch.last_plan.intent)"
                Write-Detail "Thought: $($orch.last_plan.thought)"
            }
        }

        # ── TOOL RESULTS ──────────────────────────────────────────
        if ($resp._debug.tool_results_summary -and $resp._debug.tool_results_summary.Count -gt 0) {
            Write-Sep "TOOL RESULTS"
            foreach ($t in $resp._debug.tool_results_summary) {
                $icon = if ($t.success -eq $true) { "✅" } else { "❌" }
                $color = if ($t.success -eq $true) { "Green" } else { "Red" }
                Write-Stage "TOOL" "$icon  $($t.tool)  [$($t.status)]" $color
                if ($t.error) {
                    Write-Detail "ERROR: $($t.error)"
                }
            }
        }

        # ── CONSOLE LOGS (server-side debug) ──────────────────────
        if ($ShowConsoleLogs -and $resp._debug.console_logs -and $resp._debug.console_logs.Count -gt 0) {
            Write-Sep "SERVER CONSOLE LOGS"
            foreach ($log in $resp._debug.console_logs) {
                $lvlColor = switch ($log.level) {
                    "error" { "Red" }
                    "warn" { "Yellow" }
                    default { "DarkGray" }
                }
                $prefix = switch ($log.level) {
                    "error" { "  ❌" }
                    "warn" { "  ⚠️ " }
                    default { "  📋" }
                }

                # Color-code tags in the message
                $msg = $log.message
                $tagColor = "DarkGray"
                if ($msg -match "\[ORCHESTRATOR\]") { $tagColor = "Magenta" }
                elseif ($msg -match "\[ROUTER\]") { $tagColor = "Yellow" }
                elseif ($msg -match "\[PREPARER\]") { $tagColor = "Blue" }
                elseif ($msg -match "\[EXECUTOR\]") { $tagColor = "Green" }
                elseif ($msg -match "\[SELF-CORRECT\]") { $tagColor = "Cyan" }
                elseif ($msg -match "\[ESCALATOR\]") { $tagColor = "Red" }
                elseif ($msg -match "\[VERIFIER\]") { $tagColor = "DarkCyan" }
                elseif ($msg -match "\[ID-EXTRACTOR\]") { $tagColor = "DarkGreen" }

                Write-Host "$prefix " -NoNewline -ForegroundColor $lvlColor
                Write-Host $msg -ForegroundColor $tagColor
            }
        }
        elseif (-not $ShowConsoleLogs) {
            # Show summary of log count
            $logCount = if ($resp._debug.console_logs) { $resp._debug.console_logs.Count } else { 0 }
            Write-Detail "(Server logs: $logCount lines — run with -ShowConsoleLogs to see all)"
        }

        # ── STATE EVENTS ──────────────────────────────────────────
        if ($ShowStateEvents -and $resp._debug.state_events -and $resp._debug.state_events.Count -gt 0) {
            Write-Sep "STATE EVENTS"
            foreach ($ev in $resp._debug.state_events) {
                $evColor = if ($ev.event -eq "done") { "Green" } elseif ($ev.event -eq "error") { "Red" } else { "DarkGray" }
                Write-Host "  [$($ev.event)] " -ForegroundColor $evColor -NoNewline
                if ($ev.data.status) { Write-Host "$($ev.data.status)" -ForegroundColor $evColor -NoNewline }
                if ($ev.data.message) { Write-Host " — $($ev.data.message)" -ForegroundColor DarkGray -NoNewline }
                Write-Host ""
            }
        }

        # ── COST ──────────────────────────────────────────────────
        if ($resp._debug.cost_summary) {
            $cost = $resp._debug.cost_summary
            $costCents = if ($cost.totalCost) { [Math]::Round($cost.totalCost * 100, 4) } else { "?" }
            Write-Detail "💰 Cost: $costCents cent(s)"
        }

        # ── FINAL RESPONSE ────────────────────────────────────────
        Write-Sep "AGENT RESPONSE"
        Write-Host ""
        Write-Host "  $($resp.response)" -ForegroundColor White
        Write-Host ""

        return $resp

    }
    catch {
        $elapsed = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
        Write-Sep "ERROR (${elapsed}s)"

        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd() | ConvertFrom-Json -ErrorAction SilentlyContinue
            Write-Stage "HTTP" "$($_.Exception.Response.StatusCode)" "Red"
            if ($errBody.error) { Write-Stage "MSG" $errBody.error "Red" }
            if ($errBody.stack) {
                Write-Sep "STACK TRACE"
                Write-Host $errBody.stack -ForegroundColor DarkRed
            }
            if ($errBody._debug.console_logs) {
                Write-Sep "CONSOLE LOGS BEFORE CRASH"
                foreach ($log in $errBody._debug.console_logs) {
                    Write-Host "  $($log.message)" -ForegroundColor DarkGray
                }
            }
        }
        else {
            Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host ""
        return $null
    }
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  █████╗ ██████╗  ██████╗██╗ ██████╗ ██╗   ██╗" -ForegroundColor Cyan
Write-Host "  ██╔══██╗██╔══██╗██╔════╝██║██╔════╝ ╚██╗ ██╔╝" -ForegroundColor Cyan
Write-Host "  ███████║██████╔╝██║     ██║██║  ███╗ ╚████╔╝ " -ForegroundColor Cyan
Write-Host "  ██╔══██║██╔══██╗██║     ██║██║   ██║  ╚██╔╝  " -ForegroundColor Cyan
Write-Host "  ██║  ██║██║  ██║╚██████╗██║╚██████╔╝   ██║   " -ForegroundColor Cyan
Write-Host "  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝ ╚═════╝    ╚═╝   CRM Agent Tester" -ForegroundColor Cyan
Write-Host ""
Write-Host "  User  : $UserEmail" -ForegroundColor DarkGray
Write-Host "  Target: $Endpoint" -ForegroundColor DarkGray
Write-Host "  Flags : $(if ($ShowConsoleLogs){'[ShowConsoleLogs] '})$(if ($ShowStateEvents){'[ShowStateEvents] '})$(if ($Local){'[LOCAL] '})" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Tip: Add -ShowConsoleLogs for full server debug | -Interactive for multi-turn" -ForegroundColor DarkGray
Write-Host ""

if ($Interactive) {
    # ── INTERACTIVE CHAT MODE ─────────────────────────────────────────────────
    Write-Host "  🗨️  Interactive mode. Type 'exit' to quit, 'clear' to reset history." -ForegroundColor Yellow
    Write-Host ""

    $chatHistory = @()

    while ($true) {
        Write-Host "  You: " -ForegroundColor Cyan -NoNewline
        $input = Read-Host

        if ($input -eq "exit" -or $input -eq "quit") {
            Write-Host "`n  Goodbye! 👋" -ForegroundColor DarkGray
            break
        }

        if ($input -eq "clear" -or $input -eq "reset") {
            $chatHistory = @()
            Clear-Host
            Write-Host "`n  History cleared. Start a new conversation.`n" -ForegroundColor Yellow
            continue
        }

        if (-not $input.Trim()) { continue }

        $result = Invoke-Agent -Message $input -History $chatHistory

        if ($result -and $result.response) {
            # Add to history for follow-up context
            $chatHistory += @{ role = "user"; content = $input }
            $chatHistory += @{ role = "assistant"; content = $result.response }

            # Keep last 6 messages only (3 turns)
            if ($chatHistory.Count -gt 6) {
                $chatHistory = $chatHistory[-6..-1]
            }
        }

        Write-Host ""
    }
}
elseif ($Prompt) {
    # ── SINGLE PROMPT MODE ────────────────────────────────────────────────────
    Invoke-Agent -Message $Prompt
}
else {
    # ── NO ARGS — show help ───────────────────────────────────────────────────
    Write-Host "  Použitie:" -ForegroundColor Yellow
    Write-Host "    .\scripts\test-agent.ps1 -Prompt `"Nájdi kontakt Google`"" -ForegroundColor White
    Write-Host "    .\scripts\test-agent.ps1 -Prompt `"Vytvor projekt pre ESET`" -ShowConsoleLogs" -ForegroundColor White
    Write-Host "    .\scripts\test-agent.ps1 -Prompt `"Pošli email Martinovi`" -ShowConsoleLogs -ShowStateEvents" -ForegroundColor White
    Write-Host "    .\scripts\test-agent.ps1 -Interactive" -ForegroundColor White
    Write-Host "    .\scripts\test-agent.ps1 -Prompt `"test`" -Local   # localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  Test endpointov:" -ForegroundColor Yellow
    Write-Host "    $Endpoint" -ForegroundColor DarkGray
    Write-Host "    Autentifikácia: x-test-api-key header = `$env:TEST_API_KEY" -ForegroundColor DarkGray
    Write-Host ""
}
