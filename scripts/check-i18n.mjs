// Lists UI text that isn't wrapped in t() (JSX text + common text attributes),
// and t('…') keys that have no Chinese translation in lib/i18n/zh.ts.
// Usage: node scripts/check-i18n.mjs [--untranslated] [--missing]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['app', 'components'];
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) files.push(p);
  }
};
roots.forEach(walk);

const args = process.argv.slice(2);
const want = (f) => !args.length || args.includes(f);
let problems = 0;

if (want('--untranslated')) {
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const out = [];
    // JSX text between tags
    for (const m of src.matchAll(/>([^<>{}]*[A-Za-z]{2,}[^<>{}]*)</g)) {
      const txt = m[1].trim();
      if (!txt || /^[\w.-]+$/.test(txt) && txt.length < 3) continue;
      if (/=>|&&|\)\s*$|^\)|;|===|\bconst\b|\(\w*\)/.test(txt)) continue; // code, not text
      out.push(txt.replace(/\s+/g, ' '));
    }
    // text attributes with plain strings
    for (const m of src.matchAll(/\b(placeholder|title|subtitle|label)="([^"]*[A-Za-z]{2,}[^"]*)"/g)) out.push(`${m[1]}="${m[2]}"`);
    // ternaries / literals rendered inside {} like {x ? 'Foo' : 'Bar'}
    const css = (x) => /^[a-z0-9:/\-\[\]. !]*$/.test(x.trim());
    for (const m of src.matchAll(/\{[^{}]*?\?\s*'([^']*[A-Za-z]{2,}[^']*)'\s*:\s*'([^']*)'\s*\}/g)) if (!(css(m[1]) && css(m[2]))) out.push(`'${m[1]}' : '${m[2]}'`);
    if (out.length) {
      problems += out.length;
      console.log(`\n${f}`);
      for (const o of out) console.log('   ', o);
    }
  }
}

if (want('--missing')) {
  const zhSrc = readFileSync('lib/i18n/zh.ts', 'utf8');
  const keys = new Set();
  for (const m of zhSrc.matchAll(/^\s*(['"`])((?:\\.|(?!\1).)*)\1\s*:/gm)) keys.add(m[2].replace(/\\(['"`\\])/g, '$1'));
  const used = new Set();
  const scan = [...files, 'app/actions.ts', 'app/mission-actions.ts', 'lib/progression.ts', 'lib/content.ts', 'lib/activity-details.ts', 'lib/achievements.ts', 'lib/story-achievements.ts', 'lib/score.ts', 'lib/cycle.ts'];
  for (const f of scan) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) used.add(m[2].replace(/\\(['"`\\])/g, '$1'));
    for (const m of src.matchAll(/\bfail\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) if (!m[2].includes('${')) used.add(m[2].replace(/\\(['"`\\])/g, '$1'));
    for (const m of src.matchAll(/\/\*i18n\*\/\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) used.add(m[2].replace(/\\(['"`\\])/g, '$1'));
    // every human-looking string literal inside // i18n:begin … // i18n:end blocks
    for (const block of src.matchAll(/\/\/ i18n:begin([\s\S]*?)\/\/ i18n:end/g)) {
      for (const m of block[1].matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)) {
        const v = m[2];
        if (/[A-Za-z]{2}/.test(v) && !/^#|^rgba|^[a-z]+$|^[a-z-]+$/.test(v) || /\s/.test(v) && /[A-Za-z]/.test(v)) used.add(v.replace(/\\(['"`\\])/g, '$1'));
      }
    }
  }
  const missing = [...used].filter((k) => !keys.has(k));
  if (missing.length) {
    problems += missing.length;
    console.log(`\nMissing Chinese for ${missing.length} keys:`);
    for (const k of missing) console.log('   ', JSON.stringify(k));
  } else console.log(`All ${used.size} keys have Chinese.`);
}
process.exit(problems ? 1 : 0);
