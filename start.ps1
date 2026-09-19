$ErrorActionPreference = 'Stop'
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if ($taskNode) { $taskNodePath = $taskNode.Source } else {
  $taskNodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $taskNodePath)) { throw 'Bitte Node.js 22 oder neuer installieren und start.ps1 erneut starten.' }
Set-Location $PSScriptRoot
& $taskNodePath server.mjs
