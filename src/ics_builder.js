/**
 * RFC 5545 Compliant iCalendar (.ics) Builder
 */

/**
 * 轉義 iCalendar 特殊字元 (逗號、分號、反斜線、換行)
 */
function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 摺疊長行 (每行最多 75 octets/bytes，折行後以空格開頭)
 */
function foldLine(line) {
  const maxBytes = 75;
  const buf = Buffer.from(line, 'utf8');
  if (buf.length <= maxBytes) {
    return line;
  }

  const chunks = [];
  let currentBytes = 0;
  let currentStr = '';

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    const limit = chunks.length === 0 ? maxBytes : (maxBytes - 1); // 折行後第一字元是空白

    if (currentBytes + charBytes > limit) {
      chunks.push(currentStr);
      currentStr = char;
      currentBytes = charBytes;
    } else {
      currentStr += char;
      currentBytes += charBytes;
    }
  }

  if (currentStr) {
    chunks.push(currentStr);
  }

  return chunks.join('\r\n ');
}

/**
 * 計算隔天日期字串 (YYYYMMDD -> YYYYMMDD) 作為全天事件的 DTEND（不包含結束日）
 */
function getNextDay(dateStr) {
  // dateStr 可以是 YYYYMMDD 或 YYYY-MM-DD
  const clean = dateStr.replace(/-/g, '');
  const y = parseInt(clean.slice(0, 4), 10);
  const m = parseInt(clean.slice(4, 6), 10) - 1;
  const d = parseInt(clean.slice(6, 8), 10);

  const dt = new Date(Date.UTC(y, m, d + 1));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}${nm}${nd}`;
}

/**
 * 格式化目前 UTC 時間為 DTSTAMP (YYYYMMDDTHHmmssZ)
 */
function formatUtcTimestamp(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * 建立 VCALENDAR 字串
 * @param {Object} options
 * @param {string} options.calName - 行事曆名稱 (如: 台灣國定假日)
 * @param {string} options.calDesc - 行事曆說明
 * @param {Array<Object>} options.events - 事件列表
 */
function buildIcs(options) {
  const {
    calName = 'Calendar',
    calDesc = '',
    events = []
  } = options;

  const dtstamp = formatUtcTimestamp();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taiwan Calendar Project//TW//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-WR-TIMEZONE:Asia/Taipei',
    calDesc ? `X-WR-CALDESC:${escapeText(calDesc)}` : null,
    // VTIMEZONE for Taipei
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Taipei',
    'X-LIC-LOCATION:Asia/Taipei',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].filter(Boolean);

  for (const ev of events) {
    const rawStart = ev.dateStr.replace(/-/g, '');
    const rawEnd = ev.endDateStr ? ev.endDateStr.replace(/-/g, '') : getNextDay(rawStart);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);

    if (ev.isAllDay !== false) {
      lines.push(`DTSTART;VALUE=DATE:${rawStart}`);
      lines.push(`DTEND;VALUE=DATE:${rawEnd}`);
    } else if (ev.startTime && ev.endTime) {
      lines.push(`DTSTART;TZID=Asia/Taipei:${ev.startTime}`);
      lines.push(`DTEND;TZID=Asia/Taipei:${ev.endTime}`);
    }

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    }

    if (ev.categories) {
      lines.push(`CATEGORIES:${escapeText(ev.categories)}`);
    }

    if (ev.url) {
      lines.push(`URL:${escapeText(ev.url)}`);
    }

    lines.push('CLASS:PUBLIC');
    lines.push('STATUS:CONFIRMED');
    // TRANSP:TRANSPARENT 讓假日/節氣顯示為透明（不標註為忙碌佔用時間）
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // 對每一行進行 RFC 5545 長度折疊並使用 \r\n 連接
  const folded = lines.map(foldLine).join('\r\n') + '\r\n';
  return folded;
}

module.exports = {
  buildIcs,
  escapeText,
  foldLine,
  getNextDay,
  formatUtcTimestamp
};
