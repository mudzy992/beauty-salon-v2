$ErrorActionPreference = 'Stop'

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Ensure-File([string]$Path, [string]$Content) {
  if (-not (Test-Path -LiteralPath $Path)) {
    $parent = Split-Path -Parent $Path
    Ensure-Directory $parent
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
    Write-Host "Created: $Path"
  }
}

$repoRoot = (Get-Location).Path

Ensure-Directory (Join-Path $repoRoot '.cursor')
Ensure-Directory (Join-Path $repoRoot '.cursor/rules')

$cursorrulesPath = Join-Path $repoRoot '.cursorrules'
$cursorrulesContent = @'
## Cursor Rules

Ovaj fajl je ulazna tačka. Pravila su u `.cursor/rules/*.mdc`.
'@
Ensure-File $cursorrulesPath $cursorrulesContent

$projectRulePath = Join-Path $repoRoot '.cursor/rules/00_project.mdc'
$projectRuleContent = @'
---
description: Project baseline (generated on bootstrap).
globs: ["backend/**", "frontend/**", "mobile/**", ".cursor/**"]
alwaysApply: false
---

# Project baseline

- Drži `.cursorrules` kratkim (skretnica).
- Domen pravila i detalji idu u `.cursor/rules/*`.
- Za veće promjene: Plan mode prvo (vidi `plan-first.mdc` ako postoji).
'@
Ensure-File $projectRulePath $projectRuleContent

Write-Host "Cursor bootstrap done for repo: $repoRoot"

