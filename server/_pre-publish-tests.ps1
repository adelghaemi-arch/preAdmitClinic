# File: server/_pre-publish-tests.ps1
# Description: ارکستراتور تست قبل‌از‌انتشار — کنسول ساکت + heartbeat؛ جزئیات در لاگ
# Parent Dependencies: pre-publish-tests.bat, Nabz.Infrastructure.Tests, Nabz.Api.Tests, _run-frontend-tests.ps1

$ErrorActionPreference = "Stop"

$ServerRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $ServerRoot "..")).Path
$ReportDir = Join-Path $ServerRoot "test-reports"
if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir | Out-Null }

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $ReportDir "pre-publish-$Stamp.log"
$LatestPath = Join-Path $ReportDir "latest.log"
$VerboseMode = ($env:PRE_PUBLISH_VERBOSE -eq "1")

$script:LogLines = New-Object System.Collections.Generic.List[string]

function Write-Log([string]$Message) {
    $script:LogLines.Add($Message) | Out-Null
}

function Write-Console([string]$Message) {
    Write-Host $Message
    Write-Log $Message
}

function Save-LogFiles {
    $script:LogLines | Set-Content -LiteralPath $LogPath -Encoding UTF8
    Copy-Item -LiteralPath $LogPath -Destination $LatestPath -Force
}

function Stop-LockingProcesses {
    $names = @("Nabz.Api", "testhost", "Nabz.Api.Tests", "testhost.net48", "testhost.netcoreapp", "vstest.console")
    $killed = 0
    $skipped = 0
    foreach ($name in $names) {
        $procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue)
        if ($procs.Count -eq 0) {
            $skipped++
            Write-Log "  [skip] $name.exe not running"
            continue
        }
        foreach ($p in $procs) {
            try {
                Stop-Process -Id $p.Id -Force -ErrorAction Stop
                $killed++
                Write-Log "  [killed] $($p.ProcessName) pid=$($p.Id)"
            }
            catch {
                Write-Log "  [warn] could not kill $($p.ProcessName): $($_.Exception.Message)"
            }
        }
    }
    Write-Console "[0/3] Stop locks — killed: $killed, skipped: $skipped"
}

function Get-DotnetSummary([string]$Text) {
    $m = [regex]::Match($Text, "Passed!\s*-.*")
    if ($m.Success) { return $m.Value.Trim() }
    $m2 = [regex]::Match($Text, "Failed!\s*-.*")
    if ($m2.Success) { return $m2.Value.Trim() }
    return $null
}

function Show-FailTail([string]$Combined) {
    $lines = @($Combined -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
    foreach ($line in ($lines | Select-Object -Last 5)) {
        Write-Console "    $line"
    }
}

function Invoke-RedirectedWithHeartbeat {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$ArgumentList,
        [string]$WorkingDirectory = $null
    )

    # ریدایرکت به فایل پایدارتر از async handler در PowerShell است (از crash runspace جلوگیری می‌کند)
    $suiteOut = Join-Path $env:TEMP ("nabz-suite-{0}.out.txt" -f [guid]::NewGuid().ToString("N"))
    $suiteErr = Join-Path $env:TEMP ("nabz-suite-{0}.err.txt" -f [guid]::NewGuid().ToString("N"))

    Write-Console "[$Label] RUNNING (details in log)…"
    Write-Log "CMD: $FilePath $($ArgumentList -join ' ')"

    $argStr = ($ArgumentList | ForEach-Object {
            if ($_ -match '\s') { '"{0}"' -f ($_ -replace '"', '\"') } else { $_ }
        }) -join ' '

    $startParams = @{
        FilePath               = $FilePath
        ArgumentList           = $argStr
        RedirectStandardOutput = $suiteOut
        RedirectStandardError  = $suiteErr
        PassThru               = $true
        NoNewWindow            = $true
    }
    if ($WorkingDirectory) { $startParams.WorkingDirectory = $WorkingDirectory }

    $proc = Start-Process @startParams
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while (-not $proc.HasExited) {
        Start-Sleep -Seconds 5
        if (-not $proc.HasExited) {
            Write-Console ("  … still running ({0}s)" -f [int]$sw.Elapsed.TotalSeconds)
        }
    }
    $proc.Refresh()
    $sw.Stop()

    $outText = if (Test-Path -LiteralPath $suiteOut) { Get-Content -LiteralPath $suiteOut -Raw -ErrorAction SilentlyContinue } else { "" }
    $errText = if (Test-Path -LiteralPath $suiteErr) { Get-Content -LiteralPath $suiteErr -Raw -ErrorAction SilentlyContinue } else { "" }
    if ($null -eq $outText) { $outText = "" }
    if ($null -eq $errText) { $errText = "" }
    $combined = $outText + $errText

    Write-Log "----- suite output: $Label -----"
    Write-Log $combined
    Write-Log ("----- end suite: $Label (exit={0}, {1}s) -----" -f $proc.ExitCode, $sw.Elapsed.TotalSeconds.ToString('0.0'))

    if ($VerboseMode -and $combined) { Write-Host $combined }

    $summary = Get-DotnetSummary $combined
    if (-not $summary) { $summary = "exit code $($proc.ExitCode)" }

    Remove-Item -LiteralPath $suiteOut, $suiteErr -Force -ErrorAction SilentlyContinue

    return [pscustomobject]@{
        Code     = [int]$proc.ExitCode
        Summary  = $summary
        Elapsed  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        Combined = $combined
    }
}

function Invoke-FrontendWithHeartbeat {
    param([string]$FeDir)

    Write-Console "[3/3 Frontend unit] RUNNING (details on console / log note)…"
    Write-Log "Frontend via _run-frontend-tests.ps1 (no file redirect — Vitest globals)"

    $helper = Join-Path $ServerRoot "_run-frontend-tests.ps1"
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "powershell.exe"
    $startInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$helper`" -FrontendDir `"$FeDir`" -Reporter dot"
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $false
    $startInfo.RedirectStandardError = $false
    $startInfo.CreateNoWindow = $false

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $startInfo
    $null = $proc.Start()

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while (-not $proc.HasExited) {
        Start-Sleep -Seconds 5
        if (-not $proc.HasExited) {
            Write-Console ("  … still running ({0}s)" -f [int]$sw.Elapsed.TotalSeconds)
        }
    }
    $proc.WaitForExit()
    $sw.Stop()

    $code = $proc.ExitCode
    if ($null -eq $code) { $code = 1 }
    $summary = "exit code $code"
    Write-Log ("Frontend finished exit={0} elapsed={1}s" -f $code, $sw.Elapsed.TotalSeconds.ToString('0.0'))

    return [pscustomobject]@{
        Code     = [int]$code
        Summary  = $summary
        Elapsed  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        Combined = ""
    }
}

# ---------- main ----------
$start = Get-Date
Write-Console "=== Nabz Clinic pre-publish tests ==="
Write-Console "Log: $LogPath"
Write-Console ("Mode: {0}" -f $(if ($VerboseMode) { "VERBOSE" } else { "quiet (PRE_PUBLISH_VERBOSE=1 for full output)" }))
Write-Console "---"

Stop-LockingProcesses

$results = @{
    BE  = @{ Status = "SKIP"; Code = "-"; Summary = "-" }
    API = @{ Status = "SKIP"; Code = "-"; Summary = "-" }
    FE  = @{ Status = "SKIP"; Code = "-"; Summary = "-" }
}
$overall = "PASS"

$beProj = Join-Path $RepoRoot "backend\tests\Nabz.Infrastructure.Tests\Nabz.Infrastructure.Tests.csproj"
if (-not (Test-Path $beProj)) {
    $results.BE.Status = "FAIL"; $results.BE.Code = "1"; $results.BE.Summary = "project not found"
    $overall = "FAIL"
    Write-Console "[FAIL] 1/3 Backend unit — project not found"
}
else {
    $r = Invoke-RedirectedWithHeartbeat -Label "1/3 Backend unit" -FilePath "dotnet.exe" `
        -ArgumentList @("test", $beProj, "-v", "q", "--nologo")
    $results.BE.Code = "$($r.Code)"; $results.BE.Summary = $r.Summary
    if ($r.Code -ne 0) {
        $results.BE.Status = "FAIL"; $overall = "FAIL"
        Write-Console "[FAIL] 1/3 Backend unit — $($r.Summary) ($($r.Elapsed)s)"
        Show-FailTail $r.Combined
    }
    else {
        $results.BE.Status = "PASS"
        Write-Console "[PASS] 1/3 Backend unit — $($r.Summary) ($($r.Elapsed)s)"
    }
}

if ($overall -eq "PASS") {
    Stop-Process -Name "Nabz.Api" -Force -ErrorAction SilentlyContinue
    $apiProj = Join-Path $RepoRoot "backend\tests\Nabz.Api.Tests\Nabz.Api.Tests.csproj"
    if (-not (Test-Path $apiProj)) {
        $results.API.Status = "FAIL"; $results.API.Code = "1"; $results.API.Summary = "project not found"
        $overall = "FAIL"
        Write-Console "[FAIL] 2/3 API smoke — project not found"
    }
    else {
        $r = Invoke-RedirectedWithHeartbeat -Label "2/3 API smoke" -FilePath "dotnet.exe" `
            -ArgumentList @("test", $apiProj, "-v", "q", "--nologo")
        $results.API.Code = "$($r.Code)"; $results.API.Summary = $r.Summary
        if ($r.Code -ne 0) {
            $results.API.Status = "FAIL"; $overall = "FAIL"
            Write-Console "[FAIL] 2/3 API smoke — $($r.Summary) ($($r.Elapsed)s)"
            Show-FailTail $r.Combined
        }
        else {
            $results.API.Status = "PASS"
            Write-Console "[PASS] 2/3 API smoke — $($r.Summary) ($($r.Elapsed)s)"
        }
    }
}

if ($overall -eq "PASS") {
    $feDir = Join-Path $RepoRoot "frontend"
    if (-not (Test-Path (Join-Path $feDir "package.json"))) {
        $results.FE.Status = "FAIL"; $results.FE.Code = "1"; $results.FE.Summary = "package.json not found"
        $overall = "FAIL"
        Write-Console "[FAIL] 3/3 Frontend unit — package.json not found"
    }
    else {
        $r = Invoke-FrontendWithHeartbeat -FeDir $feDir
        $results.FE.Code = "$($r.Code)"; $results.FE.Summary = $r.Summary
        if ($r.Code -ne 0) {
            $results.FE.Status = "FAIL"; $overall = "FAIL"
            Write-Console "[FAIL] 3/3 Frontend unit — $($r.Summary) ($($r.Elapsed)s)"
        }
        else {
            $results.FE.Status = "PASS"
            Write-Console "[PASS] 3/3 Frontend unit — $($r.Summary) ($($r.Elapsed)s)"
        }
    }
}

$end = Get-Date
$duration = [int]($end - $start).TotalSeconds

Write-Console "---"
Write-Console "========================================"
Write-Console "  PRE-PUBLISH TEST REPORT"
Write-Console "========================================"
Write-Console ("Started:  {0:o}" -f $start)
Write-Console ("Finished: {0:o}" -f $end)
Write-Console "Duration: ${duration}s"
Write-Console "---"
Write-Console ("1 Backend Infrastructure.Tests  {0,-6} {1,-4} {2}" -f $results.BE.Status, $results.BE.Code, $results.BE.Summary)
Write-Console ("2 API smoke Nabz.Api.Tests      {0,-6} {1,-4} {2}" -f $results.API.Status, $results.API.Code, $results.API.Summary)
Write-Console ("3 Frontend Vitest test:run      {0,-6} {1,-4} {2}" -f $results.FE.Status, $results.FE.Code, $results.FE.Summary)
Write-Console "---"
Write-Console "Full log: $LogPath"

if ($overall -eq "PASS") {
    Write-Console "PRE-PUBLISH TESTS: PASS"
    Save-LogFiles
    Write-Host ""
    Write-Host "[OK] pre-publish tests passed — safe to continue publish"
    exit 0
}

Write-Console "PRE-PUBLISH TESTS: FAIL"
Save-LogFiles
Write-Host ""
Write-Host "[ERROR] pre-publish tests FAILED — publish must stop"
Write-Host "See: $LogPath"
exit 1
