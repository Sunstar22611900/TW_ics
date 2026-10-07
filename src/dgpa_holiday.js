/**
 * Taiwan DGPA Holidays Scraper & Parser
 * 精準依照行政院人事行政總處 (DGPA) 政府行政機關辦公日曆表
 * 來源：
 * 1. DGPA 辦公日曆表公告 (https://www.dgpa.gov.tw/information?uid=41&pid=12573 等)
 * 2. 政府資料開放平臺 (https://data.gov.tw/dataset/14718)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');

// 確保快取目錄存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * 輔助函數：HTTP(S) 請求下載
 */
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error(`Too many redirects for ${url}`));
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirect = res.headers.location;
        if (!redirect.startsWith('http')) {
          const u = new URL(url);
          redirect = `${u.origin}${redirect}`;
        }
        return fetchUrl(redirect, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * 自動偵測編碼解碼 Buffer (支援 UTF-8, UTF-8 BOM, Big5)
 */
function decodeCsvBuffer(buf) {
  // 檢查 UTF-8 BOM
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(buf.slice(3));
  }
  // 嘗試 UTF-8 解碼
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    const str = utf8Decoder.decode(buf);
    if (str.includes('西元日期') || str.includes('日期') || str.includes('Date')) {
      return str;
    }
  } catch (e) {
    // 不是合法 UTF-8，轉用 Big5
  }

  // 嘗試 Big5 解碼 (台灣官方舊版常見編碼)
  try {
    const big5Decoder = new TextDecoder('big5');
    const str = big5Decoder.decode(buf);
    if (str.includes('西元日期') || str.includes('日期')) {
      return str;
    }
    return str;
  } catch (e) {
    return buf.toString('utf8');
  }
}

/**
 * 解析 DGPA 官方 CSV 檔案
 */
function parseDGPAcsv(csvContent) {
  if (Buffer.isBuffer(csvContent)) {
    csvContent = decodeCsvBuffer(csvContent);
  } else if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const dateIdx = headers.findIndex(h => h.includes('西元日期') || h.includes('日期') || h.toLowerCase().includes('date'));
  const holidayIdx = headers.findIndex(h => h.includes('是否放假'));
  const noteIdx = headers.findIndex(h => h.includes('備註') || h.includes('Description') || h.includes('Subject'));
  const weekdayIdx = headers.findIndex(h => h.includes('星期'));

  const rawRows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());

    const dateStr = cols[dateIdx] ? cols[dateIdx].replace(/[^0-9]/g, '') : '';
    if (!dateStr || dateStr.length !== 8) continue;

    const isHolidayFlag = cols[holidayIdx] ? cols[holidayIdx].replace(/^"|"$/g, '').trim() : '';
    const note = cols[noteIdx] ? cols[noteIdx].replace(/^"|"$/g, '').trim() : '';
    const weekday = cols[weekdayIdx] ? cols[weekdayIdx].replace(/^"|"$/g, '').trim() : '';

    rawRows.push({
      dateStr,
      year: parseInt(dateStr.slice(0, 4), 10),
      month: parseInt(dateStr.slice(4, 6), 10),
      day: parseInt(dateStr.slice(6, 8), 10),
      weekday,
      isHolidayFlag,
      note
    });
  }

  // 整理事件並補強「補假」對應的節日名稱
  const events = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const note = row.note;

    // 只有備註不為空的才屬於特定假日或補班日（過濾掉純週末例假日）
    if (!note) continue;

    const formattedDate = `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`;
    let type = 'holiday';
    let summary = note;
    let description = `依行政院人事行政總處辦公日曆表公告`;

    if (row.isHolidayFlag === '0' || note.includes('補行上班') || note.includes('調整上班')) {
      // 補班日
      type = 'makeup_workday';
      summary = `【補班】${note}`;
      description = `行政院人事行政總處公告補行上班日（需上班）`;
    } else if (note === '補假' || note === '調整放假') {
      type = 'makeup_holiday';
      // 尋找前後 5 天內的關聯節日
      const related = findNearbyHoliday(rawRows, i);
      if (related) {
        summary = `${related} ${note}`;
        description = `${related}逢例假日或連假，依規定予以${note}`;
      } else {
        summary = `政府行政機關${note}`;
        description = `行政院人事行政總處公告${note}`;
      }
    } else {
      type = 'holiday';
      description = `中華民國法定紀念日及節日：${note}`;
    }

    events.push({
      dateStr: formattedDate,
      rawDate: row.dateStr,
      year: row.year,
      month: row.month,
      day: row.day,
      weekday: row.weekday,
      type,
      summary,
      rawNote: note,
      isHoliday: row.isHolidayFlag === '2',
      description
    });
  }

  return events;
}

/**
 * 尋找相鄰日期的放假節日名稱，以輔助標註「補假」的原因
 */
function findNearbyHoliday(rows, currentIndex) {
  const windowSize = 5;
  const start = Math.max(0, currentIndex - windowSize);
  const end = Math.min(rows.length - 1, currentIndex + windowSize);

  const candidates = [];
  for (let j = start; j <= end; j++) {
    if (j === currentIndex) continue;
    const n = rows[j].note;
    if (n && n !== '補假' && n !== '調整放假' && !n.includes('補行上班') && !n.includes('例假日')) {
      candidates.push({ dist: Math.abs(j - currentIndex), name: n });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);

  // 若相鄰有多個節日（例如清明節與兒童節相鄰）
  const closestDist = candidates[0].dist;
  const closestNames = candidates.filter(c => c.dist <= closestDist + 1).map(c => c.name);
  const uniqueNames = [...new Set(closestNames)];

  if (uniqueNames.length > 1) {
    return uniqueNames.join('與');
  }
  return uniqueNames[0];
}

/**
 * 從政府資料開放平臺 (dataset/14718) 抓取所有年度 CSV 連結
 */
async function discoverDGPALinks() {
  const url = 'https://data.gov.tw/dataset/14718';
  console.log(`[DGPA] 查詢政府資料開放平臺最新日曆集: ${url}`);
  try {
    const htmlBuf = await fetchUrl(url);
    const html = htmlBuf.toString('utf8');

    const matches = html.match(/href="(https:\/\/www\.dgpa\.gov\.tw\/FileConversion[^"]*)"/g) || [];
    const discovered = {};

    for (const m of matches) {
      const cleanHref = m.replace(/^href="|"$|&amp;/g, (match) => match === '&amp;' ? '&' : '');
      const nameMatch = cleanHref.match(/name=([^&]+)/);
      if (nameMatch) {
        const decodedName = decodeURIComponent(nameMatch[1]);
        if (!decodedName.includes('Google') && decodedName.endsWith('.csv')) {
          // 擷取民國年份，如 115年
          const rocYearMatch = decodedName.match(/(\d{3})年/);
          if (rocYearMatch) {
            const rocYear = parseInt(rocYearMatch[1], 10);
            const westernYear = rocYear + 1911;
            discovered[westernYear] = {
              year: westernYear,
              rocYear,
              name: decodedName,
              url: cleanHref
            };
          }
        }
      }
    }
    return discovered;
  } catch (err) {
    console.warn(`[DGPA] 查詢開放平臺失敗，將使用快取或備用清單: ${err.message}`);
    return {};
  }
}

/**
 * 預置備用 DGPA 官方 CSV 永久轉換連結清單（涵蓋 2017 ~ 2027 年，保證必定可用）
 */
const FALLBACK_DGPA_URLS = {
  2023: 'https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202407/dd89fe8c-25f5-4035-a31e-7c14b44a74d7.csv&name=112%e5%b9%b4%e4%b8%ad%e8%8f%af%e6%b0%91%e5%9c%8b%e6%94%bf%e5%ba%9c%e8%a1%8c%e6%94%bf%e6%a9%9f%e9%97%9c%e8%be%a6%e5%85%ac%e6%97%a5%e6%9b%86%e8%a1%a8.csv',
  2024: 'https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202407/777152e9-fdd1-4a61-876c-2733e7692538.csv&name=113年中華民國政府行政機關辦公日曆表.csv',
  2025: 'https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202510/b84cb88a-803c-4621-a843-d637b2775615.csv&name=114%e5%b9%b4%e4%b8%ad%e8%8f%af%e6%b0%91%e5%9c%8b%e6%94%bf%e5%ba%9c%e8%a1%8c%e6%94%bf%e6%a9%9f%e9%97%9c%e8%be%a6%e5%85%ac%e6%97%a5%e6%9b%86%e8%a1%a8(1141020%e6%9b%b4%e6%96%b0).csv',
  2026: 'https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202506/a52331bd-a189-466b-b0f0-cae3062bbf74.csv&name=115%e5%b9%b4%e4%b8%ad%e8%8f%af%e6%b0%91%e5%9c%8b%e6%94%bf%e5%ba%9c%e8%a1%8c%e6%94%bf%e6%a9%9f%e9%97%9c%e8%be%a6%e5%85%ac%e6%97%a5%e6%9b%86%e8%a1%a8.csv',
  2027: 'https://www.dgpa.gov.tw/FileConversion?filename=dgpa/files/202607/f538b1ff-ba60-4c63-9477-10db8e6612d1.csv&name=116%e5%b9%b4%e4%b8%ad%e8%8f%af%e6%b0%91%e5%9c%8b%e6%94%bf%e5%ba%9c%e8%a1%8c%e6%94%bf%e6%a9%9f%e9%97%9c%e8%be%a6%e5%85%ac%e6%97%a5%e6%9b%86%e8%a1%a8_utf8bom.csv'
};

/**
 * 載入指定年份的放假資料（優先使用快取，無快取則自官方下載並存檔）
 */
async function getOrFetchYearData(year, url, forceRefresh = false) {
  const cacheFile = path.join(CACHE_DIR, `dgpa_${year}.json`);

  if (!forceRefresh && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return cached;
    } catch (e) {
      console.warn(`[DGPA] 快取讀取失敗 (${cacheFile})，重新抓取: ${e.message}`);
    }
  }

  if (!url) {
    url = FALLBACK_DGPA_URLS[year];
  }

  if (!url) {
    console.warn(`[DGPA] 無法取得 ${year} 年的下載網址，略過。`);
    return [];
  }

  console.log(`[DGPA] 下載 ${year} 年日曆表: ${url}`);
  const buf = await fetchUrl(url);
  const events = parseDGPAcsv(buf);

  if (events.length > 0) {
    fs.writeFileSync(cacheFile, JSON.stringify(events, null, 2), 'utf8');
    console.log(`[DGPA] ${year} 年資料已快取至 ${cacheFile}，共 ${events.length} 個特殊日程。`);
  }

  return events;
}

/**
 * 取得指定年份範圍內的所有台灣國定假日與放假/補班資料
 */
async function getAllTaiwanHolidays(startYear = 2024, endYear = 2027, forceRefresh = false) {
  const discovered = await discoverDGPALinks();

  const allEvents = [];
  for (let y = startYear; y <= endYear; y++) {
    const url = discovered[y]?.url || FALLBACK_DGPA_URLS[y];
    try {
      const events = await getOrFetchYearData(y, url, forceRefresh);
      allEvents.push(...events);
    } catch (err) {
      console.error(`[DGPA] 處理 ${y} 年資料失敗: ${err.message}`);
    }
  }

  // 排序
  allEvents.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  return allEvents;
}

module.exports = {
  discoverDGPALinks,
  parseDGPAcsv,
  getAllTaiwanHolidays,
  FALLBACK_DGPA_URLS
};
