#!/usr/bin/env node
/**
 * VIBE AUDIT EXTRACT v5.0.2
 *
 * Objetivo.
 * Extrair um snapshot auditável e econômico em tokens de um projeto existente.
 * Saída em 2 camadas.
 * 1) Summary JSON pequeno para LLM.
 * 2) Evidence pack JSONL com trechos, line numbers e hashes.
 *
 * Uso.
 * node vibe-audit-extract-v502.js
 *
 * Opções.
 * --out <dir>              Diretório de saída. default: _VIBE_INBOX se existir, senão .
 * --maxDepth <n>           Profundidade da árvore. default: 4
 * --maxFileSizeKB <n>      Máximo de KB por arquivo lido para evidência. default: 256
 * --maxEvidenceItems <n>   Máximo de evidências totais. default: 800
 * --includeFullFor <csv>   Lista de paths para incluir conteúdo completo, separado por vírgula.
 *
 * Requisitos.
 * Node.js 16+.
 * Executar na raiz do projeto.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv);

const DEFAULT_OUT = fs.existsSync('_VIBE_INBOX') ? '_VIBE_INBOX' : '.';
const OUT_DIR = String(ARGS.out || DEFAULT_OUT);

const MAX_DEPTH = Number.isFinite(Number(ARGS.maxDepth)) ? Number(ARGS.maxDepth) : 4;

const MAX_FILE_SIZE_KB = Number.isFinite(Number(ARGS.maxFileSizeKB))
  ? Number(ARGS.maxFileSizeKB)
  : 256;

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KB * 1024;

const MAX_EVIDENCE_ITEMS = Number.isFinite(Number(ARGS.maxEvidenceItems))
  ? Number(ARGS.maxEvidenceItems)
  : 800;

const INCLUDE_FULL_FOR = String(ARGS.includeFullFor || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const CONFIG = {
  extractor_version: '5.0.2',
  vibe_target: '5.0.2',

  ignoreDirs: [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    '.turbo',
    '.vercel',
    'coverage',
    '.cache',
    'out',
    '.pytest_cache',
    '.mypy_cache',
    '.ruff_cache',
    '__pycache__',
    '.idea',
    '.vscode'
  ],

  ignoreFilesExact: [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lockb'
  ],

  codeExtensions: [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.md',
    '.sql',
    '.prisma',
    '.py',
    '.toml',
    '.yaml',
    '.yml'
  ],

  keyFiles: [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'middleware.ts',
    'src/middleware.ts',
    'components.json',
    'tailwind.config.js',
    'tailwind.config.ts',
    '.env.example',
    'supabase/config.toml',
    'prisma/schema.prisma',
    'pyproject.toml',
    'requirements.txt'
  ],

  patterns: [
    { id: 'supabase_ssr_pkg', kind: 'package', re: /@supabase\/ssr/ },
    { id: 'supabase_js_pkg', kind: 'package', re: /@supabase\/supabase-js/ },
    { id: 'auth_helpers_pkg', kind: 'package', re: /@supabase\/auth-helpers/ },

    { id: 'security_definer_sql', kind: 'sql', re: /SECURITY\s+DEFINER/gi },
    { id: 'create_policy_sql', kind: 'sql', re: /CREATE\s+POLICY/gi },
    { id: 'alter_table_sql', kind: 'sql', re: /ALTER\s+TABLE/gi },
    { id: 'create_function_sql', kind: 'sql', re: /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi },
    { id: 'create_trigger_sql', kind: 'sql', re: /CREATE\s+TRIGGER/gi },
    { id: 'exception_when_sql', kind: 'sql', re: /EXCEPTION\s+WHEN/gi },

    { id: 'force_dynamic_next', kind: 'code', re: /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/ },
    { id: 'server_actions_next', kind: 'code', re: /['"]use server['"]/ },

    { id: 'app_router_route_ts', kind: 'path', re: /^app\/.+\/route\.(ts|js)$/ },
    { id: 'app_router_page_tsx', kind: 'path', re: /^app\/.+\/page\.(tsx|jsx)$/ },
    { id: 'app_router_layout_tsx', kind: 'path', re: /^app\/.+\/layout\.(tsx|jsx)$/ },
    { id: 'next_api_routes', kind: 'path', re: /^(pages\/api\/.+\.(ts|js))|(app\/api\/.+\/route\.(ts|js))$/ },

    { id: 'pgbouncer_flag', kind: 'text', re: /pgbouncer\s*=\s*true/i },
    { id: 'port_6543', kind: 'text', re: /\b6543\b/ },

    { id: 'service_role_leak', kind: 'secret', re: /SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/i },
    { id: 'jwt_like', kind: 'secret', re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/ },
    { id: 'private_key_pem', kind: 'secret', re: /-----BEGIN\s+(RSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----/ },
    { id: 'api_key_generic', kind: 'secret', re: /\b(api[_-]?key|secret|token)\b\s*[:=]\s*['"][^'"]{12,}['"]/i }
  ],

  secretRedactions: [
    { id: 'jwt', re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g, replace: 'REDACTED_JWT' },
    { id: 'service_role', re: /\b(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\b\s*=\s*.+/gi, replace: '$1=REDACTED' },
    { id: 'anon_key', re: /\b(SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)\b\s*=\s*.+/gi, replace: '$1=REDACTED' },
    { id: 'db_url', re: /\b(DATABASE_URL)\b\s*=\s*.+/gi, replace: '$1=REDACTED' },
    { id: 'private_key_block', re: /-----BEGIN[\s\S]*?PRIVATE\s+KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE\s+KEY-----/g, replace: 'REDACTED_PRIVATE_KEY_BLOCK' }
  ]
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function readTextFile(p, maxBytes) {
  try {
    const st = fs.statSync(p);
    const size = st.size;
    const tooBig = size > maxBytes;
    const buf = fs.readFileSync(p);
    const text = buf.toString('utf8');
    return { text, size, tooBig, readOk: !tooBig };
  } catch {
    return { text: null, size: null, tooBig: false, readOk: false };
  }
}

function redactSecrets(text) {
  if (text == null) return { text: null, redactions: [] };
  let out = text;
  const applied = [];
  for (const r of CONFIG.secretRedactions) {
    const before = out;
    out = out.replace(r.re, r.replace);
    if (out !== before) applied.push(r.id);
  }
  return { text: out, redactions: applied };
}

function runCmd(cmd) {
  try {
    const stdout = childProcess.execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: '' };
  }
}

function hasGitRepo(root) {
  return fs.existsSync(path.join(root, '.git'));
}

function collectGitInfo() {
  const root = process.cwd();
  if (!hasGitRepo(root)) return { present: false };
  const head = runCmd('git rev-parse HEAD');
  const branch = runCmd('git rev-parse --abbrev-ref HEAD');
  const status = runCmd('git status --porcelain');
  return {
    present: true,
    head: head.ok ? head.stdout : null,
    branch: branch.ok ? branch.stdout : null,
    dirty: status.ok ? (status.stdout.length > 0) : null,
    status_sample: status.ok ? status.stdout.split('\n').slice(0, 50) : []
  };
}

function shouldIgnoreDir(name) {
  return CONFIG.ignoreDirs.includes(name);
}

function shouldSkipHidden(name) {
  if (!name.startsWith('.')) return false;
  if (name === '.env.example') return false;
  return true;
}

function walkTree(dir, depth, maxDepth, out) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const e of entries) {
    if (shouldIgnoreDir(e.name)) continue;
    if (shouldSkipHidden(e.name)) continue;

    const full = path.join(dir, e.name);
    const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');

    if (e.isDirectory()) {
      out.dirs.push(rel + '/');
      walkTree(full, depth + 1, maxDepth, out);
    } else {
      out.files.push(rel);
    }
  }
}

function detectPackageManager(root) {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(root, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function readPackageJson(root) {
  const p = path.join(root, 'package.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function detectFrameworkFromDeps(pkg) {
  if (!pkg) return { name: 'unknown', version: null };
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return { name: 'next', version: deps.next };
  if (deps['@remix-run/react']) return { name: 'remix', version: deps['@remix-run/react'] };
  if (deps['@sveltejs/kit']) return { name: 'sveltekit', version: deps['@sveltejs/kit'] };
  if (deps.vite) return { name: 'vite', version: deps.vite };
  if (deps.react) return { name: 'react', version: deps.react };
  return { name: 'unknown', version: null };
}

function detectSupabasePackages(pkg) {
  if (!pkg) return { present: false };
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const ssr = deps['@supabase/ssr'] || null;
  const js = deps['@supabase/supabase-js'] || null;
  const ahn = deps['@supabase/auth-helpers-nextjs'] || null;
  const ahr = deps['@supabase/auth-helpers-react'] || null;

  return {
    present: Boolean(ssr || js || ahn || ahr),
    ssr: ssr,
    supabase_js: js,
    auth_helpers_nextjs: ahn,
    auth_helpers_react: ahr,
    has_deprecated_auth_helpers: Boolean(ahn || ahr)
  };
}

function listSupabaseMigrations(root) {
  const migDir = path.join(root, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) return { present: false, files: [] };

  let files = [];
  try {
    files = fs.readdirSync(migDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(f => {
        const full = path.join(migDir, f);
        const st = safeStat(full);
        const content = fs.readFileSync(full, 'utf8');
        const red = redactSecrets(content);
        return {
          path: path.relative(root, full).replace(/\\/g, '/'),
          size: st ? st.size : null,
          sha256: sha256(content),
          redactions_applied: red.redactions,
          pattern_counts: {
            create_policy: (red.text.match(/CREATE\s+POLICY/gi) || []).length,
            security_definer: (red.text.match(/SECURITY\s+DEFINER/gi) || []).length,
            create_function: (red.text.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi) || []).length,
            create_trigger: (red.text.match(/CREATE\s+TRIGGER/gi) || []).length
          }
        };
      });
  } catch {
    return { present: true, files: [] };
  }

  return { present: true, files };
}

function buildRouteIndexNext(root) {
  const out = {
    app_router_pages: [],
    app_router_routes: [],
    pages_api_routes: []
  };

  const tree = { dirs: [], files: [] };
  walkTree(root, 0, 12, tree);

  for (const f of tree.files) {
    if (/^app\/.+\/page\.(tsx|jsx)$/.test(f)) out.app_router_pages.push(f);
    if (/^app\/.+\/route\.(ts|js)$/.test(f)) out.app_router_routes.push(f);
    if (/^pages\/api\/.+\.(ts|js)$/.test(f)) out.pages_api_routes.push(f);
  }

  out.app_router_pages.sort();
  out.app_router_routes.sort();
  out.pages_api_routes.sort();
  return out;
}

function extractEvidenceFromFile(relPath, content, patterns, maxItemsPerFile) {
  const evidence = [];
  if (!content) return evidence;

  const lines = content.split('\n');
  const joined = content;

  for (const p of patterns) {
    if (p.kind === 'path') continue;

    p.re.lastIndex = 0;
    if (!p.re.test(joined)) {
      p.re.lastIndex = 0;
      continue;
    }

    let matches = 0;
    for (let i = 0; i < lines.length; i++) {
      p.re.lastIndex = 0;
      if (p.re.test(lines[i])) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length - 1, i + 2);
        const excerpt = lines.slice(start, end + 1).join('\n');

        evidence.push({
          type: 'pattern_match',
          pattern_id: p.id,
          file: relPath,
          line: i + 1,
          excerpt: excerpt
        });

        matches++;
        if (matches >= maxItemsPerFile) break;
        if (evidence.length >= maxItemsPerFile) break;
      }
    }
  }

  return evidence;
}

function isLikelyBinary(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  if (!ext) return false;
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip'].includes(ext);
}

function shouldIgnoreFile(relPath) {
  const base = path.basename(relPath);
  if (CONFIG.ignoreFilesExact.includes(base)) return true;
  if (base.startsWith('.') && base !== '.env.example') return true;
  return false;
}

function shouldReadContent(relPath) {
  if (INCLUDE_FULL_FOR.includes(relPath)) return true;
  if (CONFIG.keyFiles.includes(relPath)) return true;
  if (relPath === '.env.example') return true;
  return false;
}

function isCodeFile(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  return CONFIG.codeExtensions.includes(ext);
}

function summarizeDeps(pkg) {
  const deps = pkg?.dependencies || {};
  const dev = pkg?.devDependencies || {};

  const pick = (obj) => Object.keys(obj)
    .sort()
    .slice(0, 200)
    .reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {});

  return { dependencies: pick(deps), devDependencies: pick(dev) };
}

function main() {
  const root = process.cwd();
  const start = Date.now();

  const hasNodeProject = fs.existsSync(path.join(root, 'package.json'));
  const hasPythonProject = fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'requirements.txt'));

  if (!hasNodeProject && !hasPythonProject) {
    console.error('ERROR. Não encontrei package.json nem pyproject.toml nem requirements.txt na raiz.');
    console.error('Ação. Execute este script na raiz do projeto.');
    process.exit(1);
  }

  ensureDir(OUT_DIR);

  const projectName = path.basename(root);

  const pkg = hasNodeProject ? readPackageJson(root) : null;
  const framework = detectFrameworkFromDeps(pkg);
  const supabasePkgs = detectSupabasePackages(pkg);
  const pm = detectPackageManager(root);

  const git = collectGitInfo();

  const tree = { dirs: [], files: [] };
  walkTree(root, 0, MAX_DEPTH, tree);

  const nextRoutes = buildRouteIndexNext(root);
  const migrations = listSupabaseMigrations(root);

  const evidenceStreamPath = path.join(OUT_DIR, 'vibe-snapshot-evidence.jsonl');
  const evidenceFd = fs.openSync(evidenceStreamPath, 'w');

  let evidenceCount = 0;
  const fileIndex = [];

  function writeEvidence(obj) {
    if (evidenceCount >= MAX_EVIDENCE_ITEMS) return;
    fs.writeSync(evidenceFd, JSON.stringify(obj) + '\n', null, 'utf8');
    evidenceCount++;
  }

  for (const rel of tree.files) {
    if (evidenceCount >= MAX_EVIDENCE_ITEMS) break;
    if (shouldIgnoreFile(rel)) continue;
    if (isLikelyBinary(rel)) continue;
    if (!isCodeFile(rel)) continue;

    const full = path.join(root, rel);
    const st = safeStat(full);
    if (!st || !st.isFile()) continue;

    const idxEntry = {
      path: rel,
      size: st.size,
      ext: path.extname(rel).toLowerCase() || null,
      sha256: null,
      content_included: false,
      redactions_applied: []
    };

    const shouldTryRead = (st.size <= MAX_FILE_SIZE_BYTES) || shouldReadContent(rel);
    if (!shouldTryRead) {
      fileIndex.push(idxEntry);
      continue;
    }

    const contentObj = readTextFile(full, MAX_FILE_SIZE_BYTES);
    if (contentObj.text == null) {
      fileIndex.push(idxEntry);
      continue;
    }

    idxEntry.sha256 = sha256(contentObj.text);

    const red = redactSecrets(contentObj.text);
    idxEntry.redactions_applied = red.redactions;

    const ev = extractEvidenceFromFile(rel, red.text, CONFIG.patterns, 10);
    for (const e of ev) {
      writeEvidence({ ...e, file_sha256: idxEntry.sha256 });
      if (evidenceCount >= MAX_EVIDENCE_ITEMS) break;
    }

    const isKey = CONFIG.keyFiles.includes(rel) || INCLUDE_FULL_FOR.includes(rel);
    const includeFull = isKey && st.size <= MAX_FILE_SIZE_BYTES;

    if (includeFull && evidenceCount < MAX_EVIDENCE_ITEMS) {
      writeEvidence({
        type: 'full_file',
        file: rel,
        file_sha256: idxEntry.sha256,
        redactions_applied: idxEntry.redactions_applied,
        content: red.text
      });
      idxEntry.content_included = true;
    } else if (isKey && ev.length === 0 && evidenceCount < MAX_EVIDENCE_ITEMS) {
      const lines = red.text.split('\n');
      const headLines = Math.min(200, lines.length);
      writeEvidence({
        type: 'file_head_excerpt',
        file: rel,
        file_sha256: idxEntry.sha256,
        redactions_applied: idxEntry.redactions_applied,
        line_start: 1,
        line_end: headLines,
        excerpt: lines.slice(0, headLines).join('\n')
      });
    }

    fileIndex.push(idxEntry);
  }

  fs.closeSync(evidenceFd);

  const summary = {
    v: '5.0.2',
    extractor: {
      name: 'VIBE_AUDIT_EXTRACT',
      version: CONFIG.extractor_version,
      generated_at_utc: new Date().toISOString()
    },
    project: {
      name: projectName,
      root: root.replace(/\\/g, '/')
    },
    git: git,
    stack: {
      runtime: hasNodeProject ? 'node' : 'unknown',
      package_manager: pm,
      framework: framework,
      supabase: supabasePkgs,
      python: {
        pyproject_present: fs.existsSync(path.join(root, 'pyproject.toml')),
        requirements_present: fs.existsSync(path.join(root, 'requirements.txt'))
      }
    },
    inventory: {
      tree: {
        max_depth: MAX_DEPTH,
        dirs_count: tree.dirs.length,
        files_count: tree.files.length,
        sample: tree.files.slice(0, 120)
      },
      next_routes: {
        app_router_pages_count: nextRoutes.app_router_pages.length,
        app_router_routes_count: nextRoutes.app_router_routes.length,
        pages_api_routes_count: nextRoutes.pages_api_routes.length,
        sample: {
          app_router_pages: nextRoutes.app_router_pages.slice(0, 50),
          app_router_routes: nextRoutes.app_router_routes.slice(0, 50),
          pages_api_routes: nextRoutes.pages_api_routes.slice(0, 50)
        }
      },
      supabase: {
        migrations_present: migrations.present,
        migrations_count: migrations.files.length,
        migrations_sample: migrations.files.slice(0, 30)
      }
    },
    evidence_pack: {
      path: evidenceStreamPath.replace(/\\/g, '/'),
      items_written: evidenceCount,
      max_items: MAX_EVIDENCE_ITEMS
    },
    file_index: {
      count: fileIndex.length,
      key_files_present: CONFIG.keyFiles.filter(f => fs.existsSync(path.join(root, f))),
      files_sample: fileIndex.slice(0, 200)
    },
    dependencies: pkg ? summarizeDeps(pkg) : { dependencies: {}, devDependencies: {} },
    notes: [
      'Evidence pack contains redacted excerpts and selected full files.',
      'Use evidence pointers to justify findings. Avoid guessing.',
      'If you need more evidence, re-run with higher maxDepth or includeFullFor.'
    ]
  };

  const summaryPath = path.join(OUT_DIR, 'vibe-snapshot-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  const mdPath = path.join(OUT_DIR, 'vibe-snapshot.md');

  const mdLines = [];
  mdLines.push('# VIBE Snapshot');
  mdLines.push('');
  mdLines.push('Projeto: ' + projectName);
  mdLines.push('Gerado em (UTC): ' + summary.extractor.generated_at_utc);
  mdLines.push('VIBE alvo: ' + summary.v);
  mdLines.push('');
  mdLines.push('## Stack');
  mdLines.push('- Runtime: ' + summary.stack.runtime);
  mdLines.push('- Package manager: ' + pm);
  mdLines.push('- Framework: ' + framework.name + (framework.version ? ' ' + framework.version : ''));
  mdLines.push('- Supabase: ' + (supabasePkgs.present ? 'sim' : 'não'));
  if (supabasePkgs.ssr) mdLines.push('- @supabase/ssr: ' + supabasePkgs.ssr);
  if (supabasePkgs.has_deprecated_auth_helpers) mdLines.push('- auth-helpers obsoleto detectado');
  mdLines.push('');
  mdLines.push('## Git');
  mdLines.push('- Repo: ' + (git.present ? 'sim' : 'não'));
  if (git.present) {
    mdLines.push('- Branch: ' + (git.branch || 'unknown'));
    mdLines.push('- Head: ' + (git.head || 'unknown'));
    mdLines.push('- Dirty: ' + String(git.dirty));
  }
  mdLines.push('');
  mdLines.push('## Inventário');
  mdLines.push('- Dirs count: ' + String(tree.dirs.length));
  mdLines.push('- Files count: ' + String(tree.files.length));
  mdLines.push('- Files sample: ' + tree.files.slice(0, 50).join(', '));
  mdLines.push('');
  mdLines.push('## Next routes (amostra)');
  mdLines.push('- app pages: ' + nextRoutes.app_router_pages.slice(0, 30).join(', '));
  mdLines.push('- app routes: ' + nextRoutes.app_router_routes.slice(0, 30).join(', '));
  mdLines.push('- pages api: ' + nextRoutes.pages_api_routes.slice(0, 30).join(', '));
  mdLines.push('');
  mdLines.push('## Supabase migrations');
  mdLines.push('- Present: ' + String(migrations.present));
  mdLines.push('- Count: ' + String(migrations.files.length));
  mdLines.push('- Sample: ' + migrations.files.slice(0, 10).map(x => x.path).join(', '));
  mdLines.push('');
  mdLines.push('## Saídas');
  mdLines.push('- Summary: ' + summaryPath.replace(/\\/g, '/'));
  mdLines.push('- Evidence: ' + evidenceStreamPath.replace(/\\/g, '/'));
  mdLines.push('- Markdown: ' + mdPath.replace(/\\/g, '/'));
  mdLines.push('');
  mdLines.push('## Como usar no VIBE');
  mdLines.push('1. Cole o conteúdo de vibe-snapshot-summary.json na LLM para iniciar auditoria.');
  mdLines.push('2. Quando o VIBE pedir evidência, busque no vibe-snapshot-evidence.jsonl por file e pattern_id.');
  mdLines.push('3. Se precisar de mais evidência, rode de novo com --maxDepth maior ou --includeFullFor para arquivos específicos.');

  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log('OK. VIBE AUDIT EXTRACT v5.0.2 concluído.');
  console.log('Out dir: ' + OUT_DIR);
  console.log('Summary: ' + summaryPath);
  console.log('Evidence: ' + evidenceStreamPath);
  console.log('Markdown: ' + mdPath);
  console.log('Evidence items: ' + evidenceCount);
  console.log('Elapsed seconds: ' + elapsed);
}

main();
