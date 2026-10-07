/**
 * 24 Solar Terms Calculator
 * 準確依據 https://ytliu0.github.io/ChineseCalendar/sunMoon_chinese.html
 * 採用現代天文學定義（DE441 星曆模型、Vondrák 歲差模型、UT1/UTC+8 東經120度標準時）
 */

const core = require('./sunMoon_core.js');

const SOLAR_TERMS_INFO = [
  { name: '冬至', pinyin: 'Dōngzhì', longitude: 270, season: '冬', desc: '太陽到達黃經270度，北半球白晝最短、夜間最長' },
  { name: '小寒', pinyin: 'Xiǎohán', longitude: 285, season: '冬', desc: '太陽到達黃經285度，天氣寒冷但尚未至極' },
  { name: '大寒', pinyin: 'Dàhán', longitude: 300, season: '冬', desc: '太陽到達黃經300度，一年中最嚴寒的時節' },
  { name: '立春', pinyin: 'Lìchūn', longitude: 315, season: '春', desc: '太陽到達黃經315度，春季開始，萬物復甦' },
  { name: '雨水', pinyin: 'Yǔshuǐ', longitude: 330, season: '春', desc: '太陽到達黃經330度，氣溫回升，降雪轉化為降雨' },
  { name: '驚蟄', pinyin: 'Jīngzhé', longitude: 345, season: '春', desc: '太陽到達黃經345度，春雷始鳴，驚醒冬眠動物' },
  { name: '春分', pinyin: 'Chūnfēn', longitude: 0, season: '春', desc: '太陽到達黃經0度，晝夜平分，春季中分點' },
  { name: '清明', pinyin: 'Qīngmíng', longitude: 15, season: '春', desc: '太陽到達黃經15度，天朗氣清，惠風和暢' },
  { name: '穀雨', pinyin: 'Gǔyǔ', longitude: 30, season: '春', desc: '太陽到達黃經30度，雨生百穀，秧苗得潤' },
  { name: '立夏', pinyin: 'Lìxià', longitude: 45, season: '夏', desc: '太陽到達黃經45度，夏季開始，萬物生長繁茂' },
  { name: '小滿', pinyin: 'Xiǎomǎn', longitude: 60, season: '夏', desc: '太陽到達黃經60度，麥類等夏熟作物籽粒開始飽滿' },
  { name: '芒種', pinyin: 'Mángzhòng', longitude: 75, season: '夏', desc: '太陽到達黃經75度，有芒大麥小麥成熟搶收，秋熟作物播種' },
  { name: '夏至', pinyin: 'Xiàzhì', longitude: 90, season: '夏', desc: '太陽到達黃經90度，北半球白晝最長、夜間最短' },
  { name: '小暑', pinyin: 'Xiǎoshǔ', longitude: 105, season: '夏', desc: '太陽到達黃經105度，天氣炎熱但未達極致' },
  { name: '大暑', pinyin: 'Dàshǔ', longitude: 120, season: '夏', desc: '太陽到達黃經120度，一年中日照最多、氣溫最高的時節' },
  { name: '立秋', pinyin: 'Lìqiū', longitude: 135, season: '秋', desc: '太陽到達黃經135度，秋季開始，氣溫漸漸轉涼' },
  { name: '處暑', pinyin: 'Chùshǔ', longitude: 150, season: '秋', desc: '太陽到達黃經150度，暑氣至此結束，秋意漸濃' },
  { name: '白露', pinyin: 'Báilù', longitude: 165, season: '秋', desc: '太陽到達黃經165度，水氣凝結為露珠，氣溫下降顯著' },
  { name: '秋分', pinyin: 'Qiūfēn', longitude: 180, season: '秋', desc: '太陽到達黃經180度，晝夜再次平分，秋季中分點' },
  { name: '寒露', pinyin: 'Hánlù', longitude: 195, season: '秋', desc: '太陽到達黃經195度，氣溫更低，露水寒涼將凝為霜' },
  { name: '霜降', pinyin: 'Shuāngjiàng', longitude: 210, season: '秋', desc: '太陽到達黃經210度，天氣漸冷，初霜出現' },
  { name: '立冬', pinyin: 'Lìdōng', longitude: 225, season: '冬', desc: '太陽到達黃經225度，冬季開始，作物收割完畢' },
  { name: '小雪', pinyin: 'Xiǎoxuě', longitude: 240, season: '冬', desc: '太陽到達黃經240度，氣溫降到零度以下，開始降小雪' },
  { name: '大雪', pinyin: 'Dàxuě', longitude: 255, season: '冬', desc: '太陽到達黃經255度，降雪量增多，地面積雪' }
];

/**
 * 計算指定公曆年（1月1日～12月31日）內發生的 24 個節氣
 * 從 1 月的小寒開始，至 12 月的冬至結束。
 *
 * @param {number} year - 西元年份 (如 2026)
 * @returns {Array<Object>} 該年 24 節氣清單（依日期時間排序）
 */
function getSolarTerms(year) {
  const yrange = core.yrange_sunMoon();
  if (year < yrange[0] || year > yrange[1]) {
    throw new Error(`Year ${year} out of range [${yrange[0]}, ${yrange[1]}]`);
  }

  const termsList = core.sterms();
  const c = core.offset_sunMoon();
  const h = year - yrange[0];
  const m = [core.NdaysGregJul(year - 1), core.NdaysGregJul(year), core.NdaysGregJul(year + 1)];

  // 解壓縮當年份的 24 節氣數據（從前一年冬至 p[0] 到當年大雪 p[23]）
  const p = core.decompress_solarTerms(year, 0, c.solar, termsList[h]);

  // 接續次年冬至與小寒以獲取當年的冬至 p[24]
  const nextTerms = core.decompress_solarTerms(year + 1, 0, c.solar, [termsList[h + 1][0], termsList[h + 1][1]]);
  p.push(nextTerms[0] + 1441 * m[1], nextTerms[1] + 1441 * m[1]);

  const results = [];

  // 在曆法年度內（1月1日至12月31日），出現的24節氣依序為：
  // p[1]: 小寒, p[2]: 大寒, ..., p[23]: 大雪, p[24]: 冬至
  for (let i = 1; i <= 24; i++) {
    const termIndex = i % 24; // 1~23 為對應索引，24 % 24 = 0 即冬至
    const termInfo = SOLAR_TERMS_INFO[termIndex];
    const rawMinutes = p[i];

    const dayIndex = Math.floor(rawMinutes / 1441);
    const minuteInDay = rawMinutes - 1441 * dayIndex;
    const hour = Math.floor(minuteInDay / 60);
    const minute = minuteInDay - 60 * hour;

    let eventYear = year;
    let dayOfYear = dayIndex;

    if (dayOfYear < 1) {
      eventYear = year - 1;
      dayOfYear += m[0];
    } else if (dayOfYear > m[1]) {
      eventYear = year + 1;
      dayOfYear -= m[1];
    }

    // 計算月、日
    const isLeap = (eventYear % 4 === 0 && eventYear % 100 !== 0) || (eventYear % 400 === 0);
    const daysInMonths = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let month = 1;
    let day = dayOfYear;
    while (month <= 12 && day > daysInMonths[month]) {
      day -= daysInMonths[month];
      month++;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');

    results.push({
      term: termInfo.name,
      pinyin: termInfo.pinyin,
      longitude: termInfo.longitude,
      season: termInfo.season,
      description: termInfo.desc,
      year: eventYear,
      month,
      day,
      hour,
      minute,
      dateStr: `${eventYear}-${mm}-${dd}`,
      timeStr: `${hh}:${minStr}`,
      fullIsoString: `${eventYear}-${mm}-${dd}T${hh}:${minStr}:00+08:00`
    });
  }

  // 依時間排序確保順序正確
  results.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.timeStr.localeCompare(b.timeStr));
  return results;
}

/**
 * 取得指定年份區間的所有節氣
 * @param {number} startYear
 * @param {number} endYear
 * @returns {Array<Object>}
 */
function getSolarTermsRange(startYear, endYear) {
  const allTerms = [];
  for (let y = startYear; y <= endYear; y++) {
    allTerms.push(...getSolarTerms(y));
  }
  return allTerms;
}

module.exports = {
  SOLAR_TERMS_INFO,
  getSolarTerms,
  getSolarTermsRange
};
