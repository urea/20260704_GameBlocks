$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$requiredPaths = @(
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "index.html",
    ".github/workflows/pages.yml",
    "README.md",
    "GAMEBLOCKS_UPSTREAM.txt",
    "docs",
    "docs/00_project_brief.md",
    "docs/01_game_loop.md",
    "docs/02_gameblocks_overview.md",
    "docs/03_trial_plan.md",
    "gameblocks",
    "gameblocks/SKILL.md",
    "gameblocks/summary.md",
    "gameblocks/modules/math/WorldBasis.js",
    "gameblocks_usage.md",
    "src",
    "src/gameblocks",
    "src/gameblocks/modules/math/WorldBasis.js",
    "src/gameblocks/modules/world/environment/BoardEnvironment.js",
    "src/gameblocks/modules/behavior/GridPathPlanner.js",
    "assets",
    "assets/gameblocks_logo.jpg",
    "experiments",
    "experiments/block-relay/index.html",
    "experiments/block-relay/src/main.js",
    "experiments/block-relay/src/render/createGameView.js",
    "experiments/block-relay/src/simulation/relayGame.js",
    "experiments/block-relay/src/ui/hud.js",
    "experiments/contraption-lab/index.html",
    "experiments/contraption-lab/src/main.js",
    "experiments/contraption-lab/src/render/createContraptionView.js",
    "experiments/contraption-lab/src/physics/createRunWorld.js",
    "experiments/contraption-lab/src/simulation/contraptionGame.js",
    "experiments/contraption-lab/src/simulation/levels.js",
    "experiments/contraption-lab/src/ui/hud.js",
    "tools/verify-contraption-lab.playwright.js",
    "tools/verify-contraption-lab-mobile.playwright.js",
    "tools/verify-contraption-lab-public.playwright.js",
    "tools/verify-block-relay.playwright.js",
    "tools/verify-block-relay-mobile.playwright.js",
    "third_party/GameBlocks/LICENSE",
    "tools"
)

$missing = New-Object System.Collections.Generic.List[string]

foreach ($relativePath in $requiredPaths) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath)) {
        $missing.Add($relativePath)
    }
}

if ($missing.Count -gt 0) {
    throw "Missing required project paths: $($missing -join ', ')"
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitRoot = git -C $projectRoot rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "git root: $gitRoot"
    } else {
        Write-Host "git root: not initialized"
    }
}

$moduleCount = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot "gameblocks/modules") -Filter "*.js" -Recurse).Count
Write-Host "gameblocks modules: $moduleCount"

$codexSkillPath = Join-Path $HOME ".codex/skills/gameblocks/SKILL.md"
if (Test-Path -LiteralPath $codexSkillPath) {
    Write-Host "codex skill: installed"
} else {
    Write-Host "codex skill: not installed"
}

Write-Host "GameBlocks scaffold: ok"
