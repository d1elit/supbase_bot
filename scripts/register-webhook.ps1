$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot "supabase\functions\.env"
$webhookUrl = "https://ogyxltahifkuxiqzjhim.supabase.co/functions/v1/telegram-bot"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Secrets file not found: $envFile"
}

$botSettings = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([^#=]+)=(.*)$') {
        $botSettings[$matches[1].Trim()] = $matches[2].Trim()
    }
}

foreach ($name in @("TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET")) {
    if ([string]::IsNullOrWhiteSpace($botSettings[$name])) {
        throw "Missing $name in $envFile"
    }
}

$body = @{
    url = $webhookUrl
    secret_token = $botSettings["TELEGRAM_WEBHOOK_SECRET"]
    allowed_updates = @("message", "callback_query")
} | ConvertTo-Json

Write-Host "Registering Telegram webhook: $webhookUrl"
$setResult = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.telegram.org/bot$($botSettings['TELEGRAM_BOT_TOKEN'])/setWebhook" `
    -ContentType "application/json" `
    -Body $body

if (-not $setResult.ok) {
    throw "Telegram did not accept the webhook."
}

Write-Host $setResult.description

$info = Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.telegram.org/bot$($botSettings['TELEGRAM_BOT_TOKEN'])/getWebhookInfo"

Write-Host "Webhook URL: $($info.result.url)"
Write-Host "Pending updates: $($info.result.pending_update_count)"
if ($info.result.last_error_message) {
    Write-Warning "Telegram reports: $($info.result.last_error_message)"
} else {
    Write-Host "Telegram reports no webhook errors."
}
