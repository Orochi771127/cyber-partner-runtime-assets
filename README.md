# Cyber Partner Runtime Assets

《Cyber Partner: Tournament》公開試玩版的版本化角色素材發布端。

完整角色製作資料在私人 `Orochi771127/cyber-partner-animation`；本庫只發布主遊戲既有發布檢查已接受的 `assets/production/characters/` 檔案。

## 發布流程

1. 以 `config/source.json` 指定的完整 commit 取得主遊戲。
2. 執行主遊戲原有 build、validate 與公開產物檢查。
3. 只選取該產物內的角色檔案，保留原本路徑與內容。
4. 產生逐檔 SHA-256、容量與來源 commit 清單。
5. 確認此資產站本身也小於 GitHub Pages 的 1 GB 上限，才發布。

固定版本在 `v/<完整來源commit>/`。遊戲應綁定完整版本，不能依賴可變的 latest。新增版本時保留 `versions` 中仍被遊戲使用的舊版本；每次發布會重新建立所有保留版本，避免舊遊戲頁面中途失去素材。

本庫不包含私人製作原稿、研究資料或未選用的動畫候選；公開網站也不取得私人 repo 的存取權杖。這是公開試玩素材交付，並不新增商業發行的權利認定。

## 本機檢查

準備好指定 commit 的乾淨主遊戲 checkout，執行該專案的 `npm ci`、`npm run build:playtest` 和 `npm run validate:playtest`，再於本庫執行：

```sh
node scripts/build-runtime-site.mjs --source /absolute/path/to/championship-2026 --out site
```

只有實際發布成功並驗證匿名讀取後，主遊戲才切換至該版本網址。
