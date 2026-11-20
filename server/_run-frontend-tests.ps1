# File: server/_run-frontend-tests.ps1
# Description: اجرای Vitest از PowerShell بدون redirect به فایل (globals سالم می‌ماند)
# Parent Dependencies: _pre-publish-tests.ps1, frontend/package.json

param(
    [Parameter(Mandatory = $true)]
    [string] $FrontendDir,
    [string] $Reporter = "dot"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $FrontendDir

# فراخوانی مستقیم shim — زیر nesting bat→ps1 گاهی PATH اسکریپت npm به .bin نمی‌رسد
$vitestCmd = Join-Path $FrontendDir "node_modules\.bin\vitest.cmd"
if (-not (Test-Path -LiteralPath $vitestCmd)) {
    Write-Host "[ERROR] vitest not found at $vitestCmd"
    Write-Host "Run: npm ci   (in frontend/) then retry pre-publish-tests"
    exit 1
}

& $vitestCmd run --reporter=$Reporter
exit $LASTEXITCODE
