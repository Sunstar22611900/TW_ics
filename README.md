# 台灣國定假日 & 二十四節氣 可訂閱行事曆 (iCalendar .ics)

[![Auto Update Calendars](https://github.com/Sunstar22611900/TW_ics/actions/workflows/update.yml/badge.svg)](https://github.com/Sunstar22611900/TW_ics/actions/workflows/update.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

本專案提供 **2 個高精度、自動持續更新、支援任何日曆軟體的 iCalendar (`.ics`) 訂閱源**：

1. **台灣國定假日** (`taiwan_holidays.ics`)：精準依照**行政院人事行政總處 (DGPA)** 官方最新公告之政府行政機關辦公日曆表，包含所有法定紀念日及節日、放假、彈性放假、補假與補行上班日（補班日）。
2. **二十四節氣** (`solar_terms.ics`)：精準依照**現代天文學演算法 (DE441 星曆模型)** 計算之各節氣交節時刻，精度達分鐘，完整記錄黃經度數、節氣意涵與時間。

---

## 📌 訂閱網址 (Subscription URLs)

將專案推送到 GitHub 並開啟 GitHub Pages 後，即可獲得專屬的永久訂閱網址：

| 行事曆名稱 | 推薦 HTTPS 訂閱網址 (適用 Google / Outlook / Apple) | 點擊一鍵訂閱 (Apple / 系統日曆) |
| :--- | :--- | :--- |
| **🇹🇼 台灣國定假日** | `https://sunstar22611900.github.io/TW_ics/taiwan_holidays.ics` | [一鍵訂閱](webcal://sunstar22611900.github.io/TW_ics/taiwan_holidays.ics) |
| **🌱 二十四節氣** | `https://sunstar22611900.github.io/TW_ics/solar_terms.ics` | [一鍵訂閱](webcal://sunstar22611900.github.io/TW_ics/solar_terms.ics) |

> 💡 **備用 Raw 網址**（若未使用 GitHub Pages，亦可直接使用 GitHub Raw 網址訂閱）：
> - 台灣國定假日：`https://raw.githubusercontent.com/Sunstar22611900/TW_ics/main/dist/taiwan_holidays.ics`
> - 二十四節氣：`https://raw.githubusercontent.com/Sunstar22611900/TW_ics/main/dist/solar_terms.ics`

---

## 📱 各裝置與行事曆軟體訂閱教學

### 🍏 Apple 日曆 (iPhone / iPad / Mac)
1. 在 iPhone / iPad / Mac 上點擊上方的 **「一鍵訂閱」** 連結。
2. 系統彈出對話框時，點選 **「訂閱」**。
3. 可自訂顏色與重新整理頻率（建議選擇「每天」），點選 **「加入」** 即完成！
4. *手動設定方式*：進入「設定」>「日曆」>「帳號」>「加入已訂閱的行事曆」> 貼上訂閱網址。

### 🤖 Google 日曆 (Android / 電腦網頁版)
1. 複製上方的 **HTTPS 訂閱網址**。
2. 使用電腦瀏覽器開啟 [Google 日曆網頁版](https://calendar.google.com/)。
3. 在左側欄位的 **「其他日曆」** 旁點選 **「+」** 按鈕。
4. 選擇 **「透過網址訂閱」**。
5. 貼上訂閱網址並點擊 **「新增日曆」**。
6. 手機 Google 日曆 App 進入「設定」> 勾選該日曆並開啟「同步」即可。

### 💻 Microsoft Outlook / Windows 日曆
1. 開啟 Outlook 網頁版或用戶端，進入「日曆」。
2. 點擊「新增日曆」>「從網路訂閱」。
3. 貼上訂閱網址並輸入日曆名稱，點擊「匯入」即可。

---

## 🎯 資料來源與演算法精準度

### 1. 台灣國定假日 (Taiwan National Holidays)
* **依據網址**：[行政院人事行政總處 - 政府行政機關辦公日曆表 (pid=12573)](https://www.dgpa.gov.tw/information?uid=41&pid=12573) 及 [DGPA 辦公日曆表公告專區](https://www.dgpa.gov.tw/informationlist?uid=41)
* **資料集**：[政府資料開放平臺 (Data.gov.tw) - 政府行政機關辦公日曆表 (dataset 14718)](https://data.gov.tw/dataset/14718)
* **精準法規規則**：
  * 完整符合總統公布之《紀念日及節日實施條例》最新規範：
    * 中華民國開國紀念日 (1/1)、和平紀念日 (2/28)、孔子誕辰紀念日/教師節 (9/28)、國慶日 (10/10)、臺灣光復暨金門古寧頭大捷紀念日 (10/25)、行憲紀念日 (12/25) 放假一日。
    * 農曆除夕及春節（小年夜、除夕至初三）放假五日。
    * 兒童節 (4/4)、清明節 (4/5)、勞動節 (5/1)、端午節、中秋節各放假一日。
  * 紀念日與節日逢星期六於前一個上班日補假、逢星期日於次一個上班日補假。
  * 針對「補假」自動關聯並標註補假節日名稱（例如 `和平紀念日 補假`、`兒童節與清明節 補假`）。
  * 針對補行上班日精準標記 `【補班】補行上班`。
  * 過濾一般純週末之例假日，避免洗版。

### 2. 二十四節氣 (24 Solar Terms)
* **依據網址**：[Yuk Tung Liu - 月相和二十四節氣時刻](https://ytliu0.github.io/ChineseCalendar/sunMoon_chinese.html)
* **天文演算法**：
  * 採用現代天文學定義（太陽視黃經到達 $0^\circ, 15^\circ, 30^\circ, \dots, 345^\circ$ 之精確瞬間）。
  * 結合 NASA JPL **DE441** 高精度星曆模型與 **Vondrák 等人的歲差模型**計算地球運動。
  * 所有時刻皆轉換為東經 120° 台灣標準時間 (UTC+8)。
  * 精度達一分鐘，並在行事曆說明欄內詳細標記交節時刻、太陽黃經度數與節氣意涵。

---

## 🔄 每年自動持續更新機制

政府行政機關辦公日曆表通常於每年 5 月至 8 月間核定並公告次年之辦公日曆表。

本專案配置了 **GitHub Actions 自動化工作流程** (`.github/workflows/update.yml`)：

1. **每週定期自動排程**：每週一上午 11:00 (UTC+8) 自動向人事行政總處開放資料平臺查詢最新發布的年度日曆表。
2. **自動解析與驗證**：若偵測到次年度日曆公告，自動下載解析、補充補假邏輯，並執行完整單元測試驗證準確性。
3. **自動提交與部署**：自動將新版 `.ics` 檔案提交回存儲庫，並自動發布至 GitHub Pages。
4. **訂閱端零摩擦更新**：所有訂閱使用者無需重新操作，日曆軟體將於背景自動抓取到新年度的假日！

---

## 🛠️ 本地開發與手動執行

本專案採用純原生 Node.js（Node 18+ 或 22+），**完全零外部執行時依賴**，安全輕量且不會有依賴套件損壞問題。

```bash
# 複製專案
git clone https://github.com/Sunstar22611900/TW_ics.git
cd TW_ics

# 執行生成 (讀取快取並產出 dist/ 檔案)
npm run build

# 強制連線官方最新公告抓取並重新生成
npm run update

# 執行自動化測試與精確度比對
npm test
```

### 專案結構
```
taiwan-calendar-ics/
├── .github/
│   └── workflows/
│       └── update.yml         # GitHub Actions 每週自動檢查更新與 Pages 部署
├── data/
│   └── cache/                 # DGPA 各年份官方日曆快取資料 (JSON)
├── dist/                      # 產出之可訂閱檔案與網頁
│   ├── taiwan_holidays.ics    # 台灣國定假日行事曆 (.ics)
│   ├── solar_terms.ics        # 二十四節氣行事曆 (.ics)
│   ├── taiwan_holidays.json   # 假日 JSON 格式
│   ├── solar_terms.json       # 節氣 JSON 格式
│   └── index.html             # GitHub Pages 導覽與一鍵訂閱首頁
├── src/
│   ├── dgpa_holiday.js        # DGPA 官方日曆抓取、解碼 (UTF8/Big5) 與解析模組
│   ├── solar_terms.js         # 二十四節氣天文計算模組
│   ├── sunMoon_core.js        # DE441 天文星曆演算法核心
│   ├── ics_builder.js         # RFC 5545 iCalendar 標準格式生成器
│   └── generate.js            # 主執行腳本
├── test/
│   └── verify.js              # 單元測試與 2026 年假日/節氣數值比對驗證
├── package.json
└── README.md
```

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
資料版權歸行政院人事行政總處及原作者所有。
