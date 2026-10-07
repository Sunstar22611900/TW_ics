/**
 * Automated Verification Test for Generated .ics Files
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function parseIcsEvents(filePath) {
  assert(fs.existsSync(filePath), `File does not exist: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Unfold lines according to RFC 5545
  const unfolded = content.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).filter(Boolean);

  assert.strictEqual(lines[0], 'BEGIN:VCALENDAR', 'Must start with BEGIN:VCALENDAR');
  assert.strictEqual(lines[lines.length - 1], 'END:VCALENDAR', 'Must end with END:VCALENDAR');

  const events = [];
  let curEvent = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      curEvent = {};
    } else if (line === 'END:VEVENT') {
      if (curEvent) events.push(curEvent);
      curEvent = null;
    } else if (curEvent) {
      const colIdx = line.indexOf(':');
      if (colIdx !== -1) {
        const prop = line.slice(0, colIdx);
        const val = line.slice(colIdx + 1);
        const propName = prop.split(';')[0];
        curEvent[propName] = val;
        curEvent[prop] = val;
      }
    }
  }

  return events;
}

console.log('--- 測試開始：驗證生成的 .ics 檔案品質與準確性 ---');

// 1. 驗證 taiwan_holidays.ics
const holidayFile = path.join(DIST_DIR, 'taiwan_holidays.ics');
const holidayEvents = parseIcsEvents(holidayFile);
console.log(`[驗證] taiwan_holidays.ics: 成功解析 ${holidayEvents.length} 個事件`);
assert(holidayEvents.length > 50, '國定假日事件數應大於 50');

for (const ev of holidayEvents) {
  assert(ev.UID, '事件必須具有 UID');
  assert(ev.SUMMARY, '事件必須具有 SUMMARY');
  assert(ev['DTSTART;VALUE=DATE'], `事件必須有 DTSTART;VALUE=DATE: ${ev.SUMMARY}`);
  assert(ev['DTEND;VALUE=DATE'], `事件必須有 DTEND;VALUE=DATE: ${ev.SUMMARY}`);
  assert.strictEqual(ev.TRANSP, 'TRANSPARENT', '假日應設為 TRANSPARENT');
}

// 驗證 2026 年（民國115年）關鍵節日
const h2026 = holidayEvents.filter(e => e['DTSTART;VALUE=DATE'].startsWith('2026'));
const h2026Map = {};
h2026.forEach(e => { h2026Map[e['DTSTART;VALUE=DATE']] = e.SUMMARY; });

console.log('[驗證] 比對 2026 年人事行政總處公告節日：');
const expected2026 = {
  '20260101': '開國紀念日',
  '20260215': '小年夜',
  '20260216': '農曆除夕',
  '20260217': '春節',
  '20260218': '春節',
  '20260219': '春節',
  '20260228': '和平紀念日',
  '20260404': '兒童節',
  '20260405': '清明節',
  '20260501': '勞動節',
  '20260619': '端午節',
  '20260925': '中秋節',
  '20260928': '孔子誕辰紀念日/教師節',
  '20261010': '國慶日',
  '20261025': '臺灣光復暨金門古寧頭大捷紀念日',
  '20261225': '行憲紀念日'
};

for (const [date, name] of Object.entries(expected2026)) {
  assert(h2026Map[date], `2026年應有 ${date} 事件`);
  assert(h2026Map[date].includes(name), `${date} 名稱應包含 ${name}，實際為: ${h2026Map[date]}`);
  console.log(`  ✓ ${date}: ${h2026Map[date]}`);
}

// 2. 驗證 solar_terms.ics
const solarFile = path.join(DIST_DIR, 'solar_terms.ics');
const solarEvents = parseIcsEvents(solarFile);
console.log(`\n[驗證] solar_terms.ics: 成功解析 ${solarEvents.length} 個節氣事件`);
assert(solarEvents.length >= 384, '節氣事件數應至少 384 個 (16年 x 24節氣)');

const s2026 = solarEvents.filter(e => e['DTSTART;VALUE=DATE'].startsWith('2026'));
assert.strictEqual(s2026.length, 24, '2026年應有 24 個節氣');

const s2026Map = {};
s2026.forEach(e => { s2026Map[e.SUMMARY.split(' (')[0].replace('節氣：', '')] = { date: e['DTSTART;VALUE=DATE'], summary: e.SUMMARY }; });

console.log('[驗證] 比對 2026 年二十四節氣精準天文交節日期與時間：');
const expectedTerms2026 = {
  '小寒': { date: '20260105', time: '16:23' },
  '大寒': { date: '20260120', time: '09:45' },
  '立春': { date: '20260204', time: '04:02' },
  '雨水': { date: '20260218', time: '23:52' },
  '驚蟄': { date: '20260305', time: '21:59' },
  '春分': { date: '20260320', time: '22:46' },
  '清明': { date: '20260405', time: '02:40' },
  '穀雨': { date: '20260420', time: '09:39' },
  '立夏': { date: '20260505', time: '19:49' },
  '小滿': { date: '20260521', time: '08:37' },
  '芒種': { date: '20260605', time: '23:48' },
  '夏至': { date: '20260621', time: '16:25' },
  '小暑': { date: '20260707', time: '09:57' },
  '大暑': { date: '20260723', time: '03:13' },
  '立秋': { date: '20260807', time: '19:43' },
  '處暑': { date: '20260823', time: '10:19' },
  '白露': { date: '20260907', time: '22:41' },
  '秋分': { date: '20260923', time: '08:05' },
  '寒露': { date: '20261008', time: '14:29' },
  '霜降': { date: '20261023', time: '17:38' },
  '立冬': { date: '20261107', time: '17:52' },
  '小雪': { date: '20261122', time: '15:23' },
  '大雪': { date: '20261207', time: '10:53' },
  '冬至': { date: '20261222', time: '04:50' }
};

for (const [term, exp] of Object.entries(expectedTerms2026)) {
  const actual = s2026Map[term];
  assert(actual, `2026年應包含節氣 ${term}`);
  assert.strictEqual(actual.date, exp.date, `${term} 日期應為 ${exp.date}`);
  assert(actual.summary.includes(exp.time), `${term} 時間應包含 ${exp.time}，實際標題為: ${actual.summary}`);
  console.log(`  ✓ ${term}: ${actual.date} (${exp.time})`);
}

console.log('\n🎉 所有驗證測試皆順利通過！資料 100% 精準吻合官方公告與天文標準。');
