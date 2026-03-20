$file = 'c:\Users\laube\Downloads\Agentic Workflows\CRM\src\components\dashboard\leads\EmailDetailView.tsx'
$content = Get-Content -Path $file -Raw

# 1. Add Import
if ($content -notlike '*from "@/app/actions/contacts"*') {
    $content = $content -replace '"use client";', '"use client";`n`nimport { getContactByEmail } from "@/app/actions/contacts";'
}

# 2. Replace Client Call with Server Call
$target = 'directus\.request\(readItems\("contacts", \{[\s\S]*?filter: \{ email: \{ _icontains: senderEmail \} \},[\s\S]*?limit: 1[\s\S]*?\}\)\)'
$content = [regex]::Replace($content, $target, 'getContactByEmail(senderEmail)')

# 3. Handle then result mapping
$content = $content -replace '.then\(\(\[threadData, contacts\]\) => \{', '.then(([threadData, contactRes]) => {'
$content = $content -replace 'const contact = \(contacts as Lead\[\]\)\?\.\[0\] \|\| null;', 'const contact = contactRes.success ? contactRes.data as Lead : null;'

# Cleanup imports (remove directus and readItems as they may be unused now)
$content = $content -replace 'import directus from "@/lib/directus";', '// removed directus import'
$content = $content -replace 'import { readItems } from "@directus/sdk";', '// removed readItems import'

Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
Write-Host "Replaced successfully"
