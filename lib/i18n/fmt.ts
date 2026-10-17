// Language-aware date/duration formatting (wraps lib/dates + lib/tz).
import { toDayNum } from '../dates';
import { locale, type Lang } from './core';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function makeFmt(lang: Lang) {
  const zh = lang === 'zh';

  const weekdayOf = (iso: string) => new Date(toDayNum(iso) * 86_400_000).getUTCDay();

  function prettyDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}) {
    const [y, m, d] = iso.split('-').map(Number);
    if (zh) return `${opts.year ? y + '年' : ''}${m}月${d}日${opts.weekday ? ' ' + WD_ZH[weekdayOf(iso)] : ''}`;
    return `${opts.weekday ? WD_EN[weekdayOf(iso)] + ', ' : ''}${MONTHS_EN[m - 1]} ${d}${opts.year ? ', ' + y : ''}`;
  }

  function prettyRange(a: string, b: string) {
    if (a === b) return prettyDate(a);
    const [, ma] = a.split('-').map(Number);
    const [, mb, db] = b.split('-').map(Number);
    if (zh) return ma === mb ? `${prettyDate(a)}–${db}日` : `${prettyDate(a)} – ${prettyDate(b)}`;
    return ma === mb ? `${prettyDate(a)}–${db}` : `${prettyDate(a)} – ${prettyDate(b)}`;
  }

  function relativeDays(n: number) {
    if (zh) {
      if (n === 0) return '今天';
      if (n === 1) return '明天';
      if (n === -1) return '昨天';
      return n > 0 ? `${n}天后` : `${-n}天前`;
    }
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  }

  function formatDuration(totalSec: number) {
    const s = Math.max(0, Math.round(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (zh) {
      if (h > 0) return `${h}小时${m}分`;
      if (m > 0) return sec && m < 10 ? `${m}分${sec}秒` : `${m}分钟`;
      return `${sec}秒`;
    }
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return sec && m < 10 ? `${m}m ${sec}s` : `${m}m`;
    return `${sec}s`;
  }

  const fmt = (date: Date | string, tz: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale(lang), { timeZone: tz, ...o }).format(typeof date === 'string' ? new Date(date) : date);

  const timeInTz = (date: Date | string, tz: string) => fmt(date, tz, { hour: 'numeric', minute: '2-digit' });
  const dateTimeInTz = (date: Date | string, tz: string) => fmt(date, tz, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const monthName = (m: number) => (zh ? `${m}月` : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]);
  const monthShort = (m: number) => (zh ? `${m}月` : MONTHS_EN[m - 1]);
  const weekdayShort = (i: number) => (zh ? WD_ZH[i] : WD_EN[i]);
  const weekdayLetter = (i: number) => (zh ? '日一二三四五六'[i] : 'SMTWTFS'[i]);
  const plural = (n: number, one: string, many: string) => (zh ? many : n === 1 ? one : many);

  return { lang, prettyDate, prettyRange, relativeDays, formatDuration, timeInTz, dateTimeInTz, monthName, monthShort, weekdayShort, weekdayLetter, plural };
}

export type Fmt = ReturnType<typeof makeFmt>;
