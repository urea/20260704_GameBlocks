# GameBlocks Trial Workspace

`xt4d/GameBlocks` を Codex で試すためのローカル作業フォルダです。

GameBlocks は完成済みゲームやアプリ雛形ではなく、ブラウザベースの 3D ゲーム試作で使うための Codex skill と JavaScript モジュール集です。座標系、移動制御、カメラ、HUD、ゲーム状態、ワールド生成など、3D ゲームで壊れやすい部分を既存実装から選んで流用するために使います。

## Structure

- `gameblocks/` - upstream の skill 本体。`SKILL.md` と `modules/` を含みます。
- `src/gameblocks/` - 試作ゲームへ取り込んだ GameBlocks モジュールの置き場。必要なものだけコピーします。
- `experiments/` - 作成した試作ゲームや検証アプリの置き場。
- `docs/` - GameBlocks の理解、試作計画、設計メモ。
- `assets/` - ロゴ、参考画像、試作用アセット。
- `third_party/GameBlocks/` - upstream README と MIT license の控え。
- `.upstream/GameBlocks/` - upstream clone。同期確認用で、git 管理からは除外しています。
- `gameblocks_usage.md` - GameBlocks から選んだモジュールと流用状況の記録。

## Installed Skill

この環境では次の場所にも GameBlocks skill をコピー済みです。

```text
C:\Users\urear\.codex\skills\gameblocks
```

Codex の skill 一覧へ反映するには、次のスレッドまたは Codex アプリ再起動後に `$gameblocks` と入力して呼び出せます。

## Validation

Run this from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\ValidateProject.ps1
```

## Playable Experiments

- `experiments/sky-courier/` - 3D flight course using GameBlocks aircraft motion, aircraft visual, HUD, camera, terrain, and crash logic.
- `experiments/block-relay/` - route-building 3D puzzle.
- `experiments/contraption-lab/` - 3D contraption physics puzzle with fans, ramps, walls, bumpers, and four stages.

When published with GitHub Pages:

- `https://urea.github.io/20260704_GameBlocks/`
- `https://urea.github.io/20260704_GameBlocks/experiments/sky-courier/`
- `https://urea.github.io/20260704_GameBlocks/experiments/contraption-lab/`
- `https://urea.github.io/20260704_GameBlocks/experiments/block-relay/`
