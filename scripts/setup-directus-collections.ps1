# Directus Collections Setup Script
# Creates all necessary collections for CRM

$DIRECTUS_URL = "https://directus-buk1-production.up.railway.app"
$TOKEN = $env:DIRECTUS_TOKEN
if (-not $TOKEN) { throw "DIRECTUS_TOKEN env variable is required" }
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "🔧 Creating Directus Collections for CRM..." -ForegroundColor Cyan

# 1. CONTACTS Collection
Write-Host "`n📇 Creating 'contacts' collection..." -ForegroundColor Yellow
$contactsBody = @{
    collection = "contacts"
    meta = @{
        icon = "person"
        note = "CRM Contacts - hlavná tabuľka kontaktov"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "first_name"
            type = "string"
            meta = @{ interface = "input"; required = $true; width = "half" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "last_name"
            type = "string"
            meta = @{ interface = "input"; width = "half" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "email"
            type = "string"
            meta = @{ interface = "input"; options = @{ iconLeft = "mail" } }
            schema = @{ max_length = 255 }
        },
        @{
            field = "phone"
            type = "string"
            meta = @{ interface = "input"; options = @{ iconLeft = "phone" } }
            schema = @{ max_length = 50 }
        },
        @{
            field = "company"
            type = "string"
            meta = @{ interface = "input"; options = @{ iconLeft = "business" } }
            schema = @{ max_length = 200 }
        },
        @{
            field = "status"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                options = @{
                    choices = @(
                        @{ text = "Lead"; value = "lead" },
                        @{ text = "Prospect"; value = "prospect" },
                        @{ text = "Customer"; value = "customer" },
                        @{ text = "Partner"; value = "partner" },
                        @{ text = "Inactive"; value = "inactive" }
                    )
                }
            }
            schema = @{ default_value = "lead"; max_length = 50 }
        },
        @{
            field = "comments"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        },
        @{
            field = "deleted_at"
            type = "timestamp"
            meta = @{ interface = "datetime"; hidden = $true }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $contactsBody
    Write-Host "✅ Contacts collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Contacts: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. PROJECTS Collection
Write-Host "`n📁 Creating 'projects' collection..." -ForegroundColor Yellow
$projectsBody = @{
    collection = "projects"
    meta = @{
        icon = "folder"
        note = "CRM Projects"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "project_type"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                required = $true
                options = @{
                    choices = @(
                        @{ text = "Web Development"; value = "Web Development" },
                        @{ text = "Mobile App"; value = "Mobile App" },
                        @{ text = "E-commerce"; value = "E-commerce" },
                        @{ text = "Marketing Campaign"; value = "Marketing Campaign" },
                        @{ text = "Branding"; value = "Branding" },
                        @{ text = "Consultation"; value = "Consultation" },
                        @{ text = "Maintenance"; value = "Maintenance" },
                        @{ text = "Custom Integration"; value = "Custom Integration" }
                    )
                }
            }
            schema = @{ max_length = 100 }
        },
        @{
            field = "contact_id"
            type = "integer"
            meta = @{ interface = "select-dropdown-m2o"; special = @("m2o") }
        },
        @{
            field = "contact_name"
            type = "string"
            meta = @{ interface = "input"; note = "Cached contact name" }
            schema = @{ max_length = 200 }
        },
        @{
            field = "stage"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                options = @{
                    choices = @(
                        @{ text = "Plánovanie"; value = "planning" },
                        @{ text = "V procese"; value = "in_progress" },
                        @{ text = "Kontrola"; value = "review" },
                        @{ text = "Dokončené"; value = "completed" },
                        @{ text = "Pozastavené"; value = "on_hold" },
                        @{ text = "Zrušené"; value = "cancelled" }
                    )
                }
            }
            schema = @{ default_value = "planning"; max_length = 50 }
        },
        @{
            field = "end_date"
            type = "date"
            meta = @{ interface = "datetime" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        },
        @{
            field = "deleted_at"
            type = "timestamp"
            meta = @{ interface = "datetime"; hidden = $true }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $projectsBody
    Write-Host "✅ Projects collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Projects: $($_.Exception.Message)" -ForegroundColor Yellow
}


# 3. DEALS Collection
Write-Host "`n💰 Creating 'deals' collection..." -ForegroundColor Yellow
$dealsBody = @{
    collection = "deals"
    meta = @{
        icon = "payments"
        note = "CRM Deals - obchody a faktúry"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "name"
            type = "string"
            meta = @{ interface = "input"; required = $true }
            schema = @{ max_length = 200 }
        },
        @{
            field = "value"
            type = "float"
            meta = @{ interface = "input"; options = @{ iconLeft = "euro" } }
        },
        @{
            field = "contact_id"
            type = "integer"
            meta = @{ interface = "select-dropdown-m2o"; special = @("m2o") }
        },
        @{
            field = "paid"
            type = "boolean"
            meta = @{ interface = "boolean" }
            schema = @{ default_value = $false }
        },
        @{
            field = "invoice_date"
            type = "date"
            meta = @{ interface = "datetime" }
        },
        @{
            field = "description"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        },
        @{
            field = "deleted_at"
            type = "timestamp"
            meta = @{ interface = "datetime"; hidden = $true }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $dealsBody
    Write-Host "✅ Deals collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Deals: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. ACTIVITIES Collection
Write-Host "`n📋 Creating 'activities' collection..." -ForegroundColor Yellow
$activitiesBody = @{
    collection = "activities"
    meta = @{
        icon = "history"
        note = "CRM Activities - timeline aktivít"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "type"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                required = $true
                options = @{
                    choices = @(
                        @{ text = "Hovor"; value = "call" },
                        @{ text = "Email"; value = "email" },
                        @{ text = "Stretnutie"; value = "meeting" },
                        @{ text = "SMS"; value = "sms" }
                    )
                }
            }
            schema = @{ max_length = 50 }
        },
        @{
            field = "contact_id"
            type = "integer"
            meta = @{ interface = "select-dropdown-m2o"; special = @("m2o") }
        },
        @{
            field = "subject"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 200 }
        },
        @{
            field = "content"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "duration"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 50 }
        },
        @{
            field = "activity_date"
            type = "timestamp"
            meta = @{ interface = "datetime" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $activitiesBody
    Write-Host "✅ Activities collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Activities: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. GOOGLE_TOKENS Collection
Write-Host "`n🔐 Creating 'google_tokens' collection..." -ForegroundColor Yellow
$tokensBody = @{
    collection = "google_tokens"
    meta = @{
        icon = "vpn_key"
        note = "Google OAuth tokens for Calendar/Gmail"
        hidden = $true
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "user_id"
            type = "string"
            meta = @{ interface = "input"; required = $true }
            schema = @{ max_length = 255 }
        },
        @{
            field = "access_token"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "refresh_token"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "expiry_date"
            type = "bigInteger"
            meta = @{ interface = "input" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        },
        @{
            field = "deleted_at"
            type = "timestamp"
            meta = @{ interface = "datetime"; hidden = $true }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $tokensBody
    Write-Host "✅ Google Tokens collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Google Tokens: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. EMAIL_ANALYSIS Collection
Write-Host "`n🤖 Creating 'email_analysis' collection..." -ForegroundColor Yellow
$emailAnalysisBody = @{
    collection = "email_analysis"
    meta = @{
        icon = "psychology"
        note = "AI Email analysis cache"
        hidden = $true
    }
    schema = @{}
    fields = @(
        @{
            field = "message_id"
            type = "string"
            meta = @{ interface = "input"; required = $true }
            schema = @{ is_primary_key = $true; max_length = 255 }
        },
        @{
            field = "intent"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 50 }
        },
        @{
            field = "priority"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 20 }
        },
        @{
            field = "sentiment"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 20 }
        },
        @{
            field = "service_category"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "estimated_budget"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "next_step"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "summary"
            type = "text"
            meta = @{ interface = "input-multiline" }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $emailAnalysisBody
    Write-Host "✅ Email Analysis collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Email Analysis: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. ANDROID_LOGS Collection
Write-Host "`n📱 Creating 'android_logs' collection..." -ForegroundColor Yellow
$androidLogsBody = @{
    collection = "android_logs"
    meta = @{
        icon = "phone_android"
        note = "SMS a Hovory z Android zariadení"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "type"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                required = $true
                options = @{
                    choices = @(
                        @{ text = "SMS"; value = "sms" },
                        @{ text = "Call"; value = "call" }
                    )
                }
            }
            schema = @{ max_length = 20 }
        },
        @{
            field = "direction"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                options = @{
                    choices = @(
                        @{ text = "Incoming"; value = "incoming" },
                        @{ text = "Outgoing"; value = "outgoing" },
                        @{ text = "Missed"; value = "missed" },
                        @{ text = "Rejected"; value = "rejected" }
                    )
                }
            }
            schema = @{ max_length = 20 }
        },
        @{
            field = "phone_number"
            type = "string"
            meta = @{ interface = "input"; required = $true }
            schema = @{ max_length = 50 }
        },
        @{
            field = "body"
            type = "text"
            meta = @{ interface = "input-multiline"; note = "SMS text" }
        },
        @{
            field = "duration"
            type = "integer"
            meta = @{ interface = "input"; note = "Call duration in seconds" }
            schema = @{ default_value = 0 }
        },
        @{
            field = "timestamp"
            type = "timestamp"
            meta = @{ interface = "datetime" }
        },
        @{
            field = "extra_data"
            type = "json"
            meta = @{ interface = "input-code"; options = @{ language = "json" } }
        },
        @{
            field = "contact_id"
            type = "integer"
            meta = @{ interface = "select-dropdown-m2o"; special = @("m2o") }
        },
        @{
            field = "deleted_at"
            type = "timestamp"
            meta = @{ interface = "datetime"; hidden = $true }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $androidLogsBody
    Write-Host "✅ Android Logs collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Android Logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 8. CRM_USERS Collection
Write-Host "`n👤 Creating 'crm_users' collection..." -ForegroundColor Yellow
$crmUsersBody = @{
    collection = "crm_users"
    meta = @{
        icon = "group"
        note = "CRM aplikační používatelia"
    }
    schema = @{}
    fields = @(
        @{
            field = "id"
            type = "integer"
            meta = @{ hidden = $true; interface = "input"; readonly = $true }
            schema = @{ is_primary_key = $true; has_auto_increment = $true }
        },
        @{
            field = "email"
            type = "string"
            meta = @{ interface = "input"; required = $true }
            schema = @{ max_length = 255 }
        },
        @{
            field = "password_hash"
            type = "string"
            meta = @{ interface = "input"; hidden = $true }
            schema = @{ max_length = 255 }
        },
        @{
            field = "first_name"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "last_name"
            type = "string"
            meta = @{ interface = "input" }
            schema = @{ max_length = 100 }
        },
        @{
            field = "role"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                options = @{
                    choices = @(
                        @{ text = "Admin"; value = "admin" },
                        @{ text = "User"; value = "user" },
                        @{ text = "Viewer"; value = "viewer" }
                    )
                }
            }
            schema = @{ default_value = "user"; max_length = 50 }
        },
        @{
            field = "status"
            type = "string"
            meta = @{
                interface = "select-dropdown"
                options = @{
                    choices = @(
                        @{ text = "Active"; value = "active" },
                        @{ text = "Inactive"; value = "inactive" },
                        @{ text = "Pending"; value = "pending" }
                    )
                }
            }
            schema = @{ default_value = "active"; max_length = 50 }
        },
        @{
            field = "date_created"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-created") }
        },
        @{
            field = "date_updated"
            type = "timestamp"
            meta = @{ interface = "datetime"; readonly = $true; special = @("date-updated") }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "$DIRECTUS_URL/collections" -Method Post -Headers $headers -Body $crmUsersBody
    Write-Host "✅ CRM Users collection created!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ CRM Users: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 All collections setup complete!" -ForegroundColor Cyan
Write-Host "Check Directus Admin at: $DIRECTUS_URL" -ForegroundColor Gray
