# Creates/updates "Easy Sprite.lnk" on the Windows Desktop.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
npx --yes tsx src/cli.ts desktop --shortcut-only --workspace $root
Write-Host ""
Write-Host "Double-click 'Easy Sprite' on your Desktop to start."
