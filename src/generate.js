/**
 * Master ICS Generator Script
 * 生成 2 個可訂閱的 .ics 檔案及 GitHub Pages 訂閱說明網頁：
 * 1. taiwan_holidays.ics (台灣國定假日與補假補班)
 * 2. solar_terms.ics (二十四節氣精準時刻)
 */

const fs = require('fs');
const path = require('path');
const { getAllTaiwanHolidays } = require('./dgpa_holiday.js');
const { getSolarTermsRange } = require('./solar_terms.js');
const { buildIcs } = require('./ics_builder.js');

const DIST_DIR = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  const forceFetch = args.includes('--force-fetch');

  console.log('========================================================');
  console.log(' 台灣國定假日 & 二十四節氣 iCalendar (.ics) 生成器');
  console.log('========================================================\n');

  // 1. 生成台灣國定假日 ICS
  console.log('[1/3] 抓取並解析行政院人事行政總處 (DGPA) 辦公日曆表...');
  const startHolidayYear = 2024;
  const endHolidayYear = 2027; // DGPA 目前開放資料已有至 2027 年 (民國116年)
  const holidays = await getAllTaiwanHolidays(startHolidayYear, endHolidayYear, forceFetch);
  console.log(`=> 成功載入 ${holidays.length} 個假日與補班事件 (${startHolidayYear}~${endHolidayYear})\n`);

  const holidayIcsEvents = holidays.map(h => {
    // 建立穩定唯一的 UID
    const typeTag = h.type === 'makeup_workday' ? 'work' : 'holiday';
    const cleanDate = h.dateStr.replace(/-/g, '');
    const uid = `tw-${typeTag}-${cleanDate}@dgpa.gov.tw`;

    return {
      uid,
      summary: h.summary,
      dateStr: h.dateStr,
      isAllDay: true,
      description: `${h.description}\n資料來源：行政院人事行政總處政府行政機關辦公日曆表 (https://www.dgpa.gov.tw/information?uid=41&pid=12573)`,
      categories: h.type === 'makeup_workday' ? '補班日' : '國定假日',
      url: 'https://www.dgpa.gov.tw/informationlist?uid=41'
    };
  });

  const holidaysIcsContent = buildIcs({
    calName: '台灣國定假日 (人事行政總處)',
    calDesc: '依據行政院人事行政總處最新公告之政府行政機關辦公日曆表，包含國定假日、彈性放假、補假與補行上班日。每年自動更新。',
    events: holidayIcsEvents
  });

  const holidaysIcsPath = path.join(DIST_DIR, 'taiwan_holidays.ics');
  fs.writeFileSync(holidaysIcsPath, holidaysIcsContent, 'utf8');
  console.log(`[OK] 產出國定假日行事曆: ${holidaysIcsPath} (${holidayIcsEvents.length} events)`);

  // 輸出 JSON 版本方便檢視
  fs.writeFileSync(path.join(DIST_DIR, 'taiwan_holidays.json'), JSON.stringify(holidays, null, 2), 'utf8');

  // 2. 生成二十四節氣 ICS
  console.log('\n[2/3] 計算二十四節氣精準天文交節時刻...');
  const startSolarYear = 2020;
  const endSolarYear = 2035; // 涵蓋 16 年
  const solarTerms = getSolarTermsRange(startSolarYear, endSolarYear);
  console.log(`=> 成功計算 ${solarTerms.length} 個節氣事件 (${startSolarYear}~${endSolarYear})\n`);

  const solarIcsEvents = solarTerms.map(st => {
    const cleanDate = st.dateStr.replace(/-/g, '');
    const uid = `solar-term-${cleanDate}-${st.term}@chinese-calendar`;

    return {
      uid,
      summary: `節氣：${st.term} (${st.timeStr})`,
      dateStr: st.dateStr,
      isAllDay: true,
      description: [
        `【二十四節氣：${st.term}】(${st.pinyin})`,
        `交節時刻：${st.dateStr} ${st.timeStr} (UTC+8 台灣標準時間)`,
        `太陽黃經：${st.longitude}° (${st.season}季)`,
        `節氣說明：${st.description}`,
        `計算來源：ytliu0.github.io/ChineseCalendar (DE441星曆與Vondrák歲差高精度模型)`
      ].join('\n'),
      categories: '二十四節氣',
      url: 'https://ytliu0.github.io/ChineseCalendar/sunMoon_chinese.html'
    };
  });

  const solarIcsContent = buildIcs({
    calName: '二十四節氣 (天文時刻)',
    calDesc: '準確依據現代天文學定義（DE441星曆高精度模型）計算之二十四節氣，精準記錄每年各節氣之交節日期與時間。',
    events: solarIcsEvents
  });

  const solarIcsPath = path.join(DIST_DIR, 'solar_terms.ics');
  fs.writeFileSync(solarIcsPath, solarIcsContent, 'utf8');
  console.log(`[OK] 產出二十四節氣行事曆: ${solarIcsPath} (${solarIcsEvents.length} events)`);

  // 輸出 JSON 版本方便檢視
  fs.writeFileSync(path.join(DIST_DIR, 'solar_terms.json'), JSON.stringify(solarTerms, null, 2), 'utf8');

  // 3. 生成訂閱與預覽 HTML 頁面 (GitHub Pages 首頁)
  console.log('\n[3/3] 生成 GitHub Pages 訂閱導覽頁面...');
  const htmlContent = generateIndexHtml(holidays, solarTerms);
  const htmlPath = path.join(DIST_DIR, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`[OK] 產出訂閱展示網頁: ${htmlPath}`);

  console.log('\n========================================================');
  console.log(' 全數生成完畢！可直接發布或於日曆軟體訂閱。');
  console.log('========================================================\n');
}

/**
 * 產生前端訂閱與預覽 HTML
 */
function generateIndexHtml(holidays, solarTerms) {
  const currentYear = 2026;
  const currentHolidays = holidays.filter(h => h.year === currentYear);
  const currentSolar = solarTerms.filter(st => st.year === currentYear);

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>台灣國定假日 & 二十四節氣 可訂閱行事曆 (iCalendar .ics)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    :root {
      --pico-primary: #1e88e5;
      --pico-primary-hover: #1565c0;
    }
    body { padding-top: 2rem; padding-bottom: 4rem; }
    .card { background: var(--pico-card-background-color); border: 1px solid var(--pico-muted-border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .badge-holiday { background: #ffebee; color: #c62828; }
    .badge-makeup { background: #fff3e0; color: #e65100; }
    .badge-work { background: #e8f5e9; color: #2e7d32; }
    .badge-term { background: #e3f2fd; color: #1565c0; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .url-box { font-family: monospace; font-size: 0.85rem; background: var(--pico-form-element-background-color); border: 1px dashed var(--pico-muted-border-color); padding: 0.5rem; border-radius: 6px; word-break: break-all; margin-top: 0.5rem; }
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
    .table-container { max-height: 480px; overflow-y: auto; }
    table th, table td { font-size: 0.9rem; }
  </style>
</head>
<body>
  <main class="container">
    <header style="text-align: center; margin-bottom: 2.5rem;">
      <h1>📅 台灣國定假日 & 二十四節氣 可訂閱行事曆</h1>
      <p style="color: var(--pico-muted-color);">精準對齊行政院人事行政總處 (DGPA) 公告與現代天文學 DE441 星曆計算，每年自動更新</p>
    </header>

    <div class="grid-cards">
      <!-- 國定假日卡片 -->
      <div class="card">
        <h3>🇹🇼 台灣國定假日與放假/補班日</h3>
        <p>依據行政院人事行政總處最新辦公日曆表，包含國定假日、農曆除夕春節、紀念日放假、例假日補假及補行上班日。</p>
        <div class="url-box" id="holiday-url">https://&lt;your-domain&gt;/taiwan_holidays.ics</div>
        <div class="btn-group">
          <button class="primary" onclick="subscribeCalendar('taiwan_holidays.ics')">⚡ 一鍵訂閱 (Apple / 系統日曆)</button>
          <button class="secondary outline" onclick="copyIcsUrl('taiwan_holidays.ics')">📋 複製訂閱網址</button>
          <a role="button" class="contrast outline" href="taiwan_holidays.ics" download>⬇️ 下載 .ics</a>
        </div>
      </div>

      <!-- 24節氣卡片 -->
      <div class="card">
        <h3>🌱 二十四節氣 (天文時刻精準版)</h3>
        <p>依據 ytliu0.github.io/ChineseCalendar 天文演算法（DE441 星曆與 Vondrák 歲差模型，精度達分鐘），標註各節氣之精準交節日期與時間。</p>
        <div class="url-box" id="solar-url">https://&lt;your-domain&gt;/solar_terms.ics</div>
        <div class="btn-group">
          <button class="primary" onclick="subscribeCalendar('solar_terms.ics')">⚡ 一鍵訂閱 (Apple / 系統日曆)</button>
          <button class="secondary outline" onclick="copyIcsUrl('solar_terms.ics')">📋 複製訂閱網址</button>
          <a role="button" class="contrast outline" href="solar_terms.ics" download>⬇️ 下載 .ics</a>
        </div>
      </div>
    </div>

    <!-- 訂閱教學 -->
    <section class="card" style="margin-top: 2rem;">
      <h3>📖 如何在各裝置與行事曆中訂閱？</h3>
      <div class="grid">
        <div>
          <h4>🍏 Apple 日曆 (iOS / macOS)</h4>
          <ol>
            <li>直接點擊上方「一鍵訂閱」按鈕。</li>
            <li>系統將彈出提示，確認「訂閱」即可自動同步。</li>
            <li>或在 iPhone「設定」&gt;「日曆」&gt;「帳號」&gt;「加入已訂閱的行事曆」，貼上訂閱網址。</li>
          </ol>
        </div>
        <div>
          <h4>🤖 Google 日曆 (Android / 網頁版)</h4>
          <ol>
            <li>點擊上方「複製訂閱網址」。</li>
            <li>開啟 <a href="https://calendar.google.com" target="_blank">Google 日曆網頁版</a>。</li>
            <li>在左側「其他日曆」旁點擊「+」號 &gt; 選擇「透過網址訂閱」。</li>
            <li>貼上網址並點擊「新增日曆」即可！</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- 資料預覽 -->
    <section style="margin-top: 2rem;">
      <h2>🔍 當年度資料即時預覽 (${currentYear} 年)</h2>
      <div class="grid">
        <div class="card">
          <h4>2026 國定假日與補班日 (${currentHolidays.length} 天)</h4>
          <div class="table-container">
            <table>
              <thead>
                <tr><th>日期</th><th>星期</th><th>類別</th><th>名稱</th></tr>
              </thead>
              <tbody>
                ${currentHolidays.map(h => `
                  <tr>
                    <td><strong>${h.dateStr}</strong></td>
                    <td>週${h.weekday}</td>
                    <td>
                      <span class="badge ${h.type === 'makeup_workday' ? 'badge-work' : h.type === 'makeup_holiday' ? 'badge-makeup' : 'badge-holiday'}">
                        ${h.type === 'makeup_workday' ? '補班日' : h.type === 'makeup_holiday' ? '補假' : '放假日'}
                      </span>
                    </td>
                    <td>${h.summary}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h4>2026 二十四節氣時刻表 (${currentSolar.length} 個節氣)</h4>
          <div class="table-container">
            <table>
              <thead>
                <tr><th>節氣</th><th>公曆日期</th><th>精準交節時刻</th><th>黃經</th></tr>
              </thead>
              <tbody>
                ${currentSolar.map(st => `
                  <tr>
                    <td><span class="badge badge-term">${st.term}</span></td>
                    <td><strong>${st.dateStr}</strong></td>
                    <td>${st.timeStr}</td>
                    <td>${st.longitude}°</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <footer style="margin-top: 3rem; text-align: center; font-size: 0.85rem; color: var(--pico-muted-color);">
      <p>資料來源：<a href="https://www.dgpa.gov.tw/information?uid=41&pid=12573" target="_blank">行政院人事行政總處</a> ｜ <a href="https://ytliu0.github.io/ChineseCalendar/sunMoon_chinese.html" target="_blank">中華農曆月相與二十四節氣 (Yuk Tung Liu)</a></p>
      <p>開源專案建置 ｜ 自動化定期更新</p>
    </footer>
  </main>

  <script>
    // 自動更新網址框為當前主機網址
    const baseUrl = window.location.origin + window.location.pathname.replace(/\\/[^/]*$/, '/');
    document.getElementById('holiday-url').innerText = baseUrl + 'taiwan_holidays.ics';
    document.getElementById('solar-url').innerText = baseUrl + 'solar_terms.ics';

    function getAbsoluteUrl(filename) {
      return baseUrl + filename;
    }

    function subscribeCalendar(filename) {
      const fullUrl = getAbsoluteUrl(filename);
      const webcalUrl = fullUrl.replace(/^https?:\\/\\//, 'webcal://');
      window.location.href = webcalUrl;
    }

    function copyIcsUrl(filename) {
      const fullUrl = getAbsoluteUrl(filename);
      navigator.clipboard.writeText(fullUrl).then(() => {
        alert('訂閱網址已複製到剪貼簿：\\n' + fullUrl + '\\n\\n請至 Google 日曆「透過網址訂閱」貼上使用！');
      }).catch(err => {
        prompt('請手動複製訂閱網址：', fullUrl);
      });
    }
  </script>
</body>
</html>`;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = { main };
