$file = 'c:\Users\laube\Downloads\Agentic Workflows\CRM\src\components\dashboard\leads\EmailDetailView.tsx'
$content = Get-Content -Path $file -Raw

# 1. Correct the garbled line 1
$badLine = '"use client";`n`nimport { getContactByEmail } from "@/app/actions/contacts";'
if ($content.StartsWith($badLine)) {
    $goodHeader = '"use client";' + "`r`n`r`n" + 'import { getContactByEmail } from "@/app/actions/contacts";'
    $content = $goodHeader + $content.Substring($badLine.Length)
}

Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "Corrected header successfully"
