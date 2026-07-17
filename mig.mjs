import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = {};
for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

const text = new TextDecoder('x-mac-roman').decode(fs.readFileSync('/Volumes/Workspace/Work Projects/UAEW/UAEW_Area_2/Screenshots/stats.csv'));
const lines = text.split(/\r?\n/).filter(l => l.trim());
const head = lines[0].split('\t').map(h => h.trim());
const unquote = v => (v ?? '').trim().replace(/^"(.*)"$/s, '$1').trim();
const rows = lines.slice(1).map(l => { const c = l.split('\t');
  return Object.fromEntries(head.map((h,i) => [h, unquote(c[i])])); });

const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const num = v => { const n = parseFloat((v||'').replace(',','.')); return Number.isFinite(n) ? n : null; };

// Everything in cm. Values we cannot vouch for are DROPPED, not guessed:
// a plausible-but-wrong number becomes truth nobody questions.
const PLAUSIBLE = { height: [120, 230], reach: [120, 250], weight: [40, 200] };
const toCm = (v, kind) => {
  const raw = (v || '').trim();
  const n = num(raw); if (n === null) return { value: null };
  // A bare whole number under 3 ("2") is not a measurement anyone took: real
  // ones read 1,75 / 1,83. It could be 2.00m or a slip, and the surrounding
  // data disagrees case by case — so drop it rather than invent a body.
  if (n < 3 && !raw.includes(',') && !raw.includes('.')) return { value: null, rejected: `${kind}="${raw}" (inteiro cru)` };
  const cm = n < 3 ? Math.round(n * 100) : Math.round(n);
  const [lo, hi] = PLAUSIBLE[kind];
  if (cm < lo || cm > hi) return { value: null, rejected: `${kind}=${v}` };
  return { value: cm, converted: n < 3 };
};
const toKg = v => { const n = num(v); if (n === null) return { value: null };
  const [lo, hi] = PLAUSIBLE.weight;
  if (n < lo || n > hi) return { value: null, rejected: `weight=${v}` };
  return { value: Math.round(n * 100) / 100 }; };

const TSHIRT = { 's-mall':'S','m-edium':'M','l-arge':'L','x-large':'XL','xx-large':'2XL','xxx-large':'3XL' };
const toDate = v => { const m = (v||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return null;
  const d = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return (new Date(d) > new Date()) ? null : d; };

let people = [], from = 0;
for(;;){ const { data } = await sb.from('mma_people').select('id, compiled_name, event_name').range(from, from+999);
  if(!data?.length) break; people.push(...data); from+=1000; if(data.length<1000) break; }
const byName = new Map();
for (const p of people) for (const n of [p.compiled_name, p.event_name]) { const k = norm(n); if(k && !byName.has(k)) byName.set(k, p); }

const { data: staff } = await sb.from('mma_users').select('id, email').ilike('email','%@uaewhloapp.com');
const psToUser = new Map(staff.map(s => [s.email.split('@')[0], s.id]));

const { data: statsNow } = await sb.from('mma_fighter_stats').select('id, person_id');
const statsByPerson = new Map((statsNow||[]).map(s => [s.person_id, s.id]));

const payloads = [], dropped = [], rejects = [];
for (const r of rows) {
  const hit = byName.get(norm(r['COMPILED NAME'])) || byName.get(norm(r['EVENT NAME']));
  if (!hit) { dropped.push(r['COMPILED NAME'] || '(vazio)'); continue; }
  const h = toCm(r['HEIGHT'],'height'), rc = toCm(r['REACH'],'reach'), w = toKg(r['WEIGHT']);
  for (const x of [h, rc, w]) if (x.rejected) rejects.push(`${r['COMPILED NAME']}: ${x.rejected}`);
  payloads.push({
    person_id: hit.id,
    id: statsByPerson.get(hit.id),
    height_cm: h.value, reach_cm: rc.value, weight_kg: w.value,
    fighting_style: r['FIGHT STYLE'] || null,
    team_gym: r['TEAM'] || null,
    residency: r['RESIDENCE'] || null,
    tshirt_size: TSHIRT[(r['T-SHIRT']||'').toLowerCase()] ?? null,
    collected_at: toDate(r['LAST UPDATE DATE']),
    collected_by: psToUser.get(r['USER']) ?? null,
  });
}
// The same athlete was measured at several events, so the log holds repeats.
// mma_fighter_stats keeps one row per person — the DB rejected the duplicates
// rather than let them through. Fernando's rule decides which wins: the list,
// and it carries the date. Newest collection per athlete; undated loses to
// dated, since a measurement of unknown age cannot be the freshest.
const latest = new Map();
for (const p of payloads) {
  const prev = latest.get(p.person_id);
  if (!prev) { latest.set(p.person_id, p); continue; }
  const a = p.collected_at ?? '', b = prev.collected_at ?? '';
  if (a > b) latest.set(p.person_id, p);
}
const superseded = payloads.length - latest.size;
const finalPayloads = [...latest.values()];

console.log(`=== ${APPLY ? 'APLICANDO' : 'ENSAIO'} ===`);
console.log(`  medicoes repetidas (fica a mais recente): ${superseded}`);
console.log(`  atletas unicos  : ${finalPayloads.length}`);
console.log(`  linhas lixo     : ${dropped.length} -> ${dropped.slice(0,4).join(' | ')}`);
console.log(`  valores DESCARTADOS (implausiveis): ${rejects.length}`);
rejects.slice(0,8).forEach(x => console.log('     ' + x));
console.log(`  com autor       : ${finalPayloads.filter(p=>p.collected_by).length}`);
console.log(`  com data coleta : ${finalPayloads.filter(p=>p.collected_at).length}`);

if (!APPLY) { console.log('\n(nada gravado — rode com --apply)'); process.exit(0); }
let ok=0, err=0;
for (const p of finalPayloads) {
  const { id, ...fields } = p;
  const res = id ? await sb.from('mma_fighter_stats').update(fields).eq('id', id)
                 : await sb.from('mma_fighter_stats').insert(fields);
  res.error ? (err++, console.log('ERRO:', res.error.message)) : ok++;
}
console.log(`\ngravados: ${ok}   erros: ${err}`);
