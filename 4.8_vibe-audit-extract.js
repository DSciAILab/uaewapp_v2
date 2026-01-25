#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * VIBE AUDIT EXTRACT v1.0
 * 
 * Extrai snapshot de projeto existente para análise pelo
 * VIBE PROJECT ARCHITECT v4.8
 * 
 * ════════════════════════════════════════════════════════════════
 * 
 * USO:
 *   node vibe-audit-extract.js
 * 
 * SAÍDAS:
 *   - vibe-project-snapshot.json (para o LLM analisar)
 *   - vibe-project-snapshot.md (para você revisar)
 * 
 * REQUISITOS:
 *   - Node.js 16+
 *   - Executar na raiz do projeto
 * 
 * ════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '1.0',
  vibeVersion: '4.8',
  
  // Arquivos para extrair conteúdo completo
  extractContent: [
    'package.json',
    'tsconfig.json',
    '.env.example',
    'prisma/schema.prisma',
    'src/lib/supabase/client.ts',
    'src/lib/supabase/server.ts',
    'src/lib/supabase/middleware.ts',
    'src/lib/constants.ts',
    'src/lib/cookies.ts',
    'src/middleware.ts',
    'middleware.ts',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'components.json',
  ],
  
  // Pastas para mapear estrutura
  mapStructure: [
    'src',
    'app',
    'pages',
    'components',
    'lib',
    'prisma',
    'supabase',
    'docs',
  ],
  
  // Pastas para ignorar
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
  ],
  
  // Extensões de código
  codeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.sql', '.prisma'],
  
  // Padrões para detectar
  patterns: {
    supabaseSSR: /@supabase\/ssr/,
    authHelpers: /@supabase\/auth-helpers/,
    forceDynamic: /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/,
    envCheck: /if\s*\(\s*!.*SUPABASE/,
    rlsPolicy: /CREATE\s+POLICY/gi,
    triggerException: /EXCEPTION\s+WHEN/gi,
    onConflict: /ON\s+CONFLICT/gi,
    securityDefiner: /SECURITY\s+DEFINER/gi,
    createSchema: /CREATE\s+SCHEMA/gi,
    port6543: /6543/,
    pgbouncer: /pgbouncer=true/i,
    ensureProfile: /ensureUserProfile|ensureProfile/,
    userMetaKeys: /full_name|user_metadata/,
    getCookieOptions: /getCookieOptions/,
  }
};

// ════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ════════════════════════════════════════════════════════════════

function log(message) {
  console.log(`  ${message}`);
}

function logSuccess(message) {
  console.log(`  ✅ ${message}`);
}

function logWarning(message) {
  console.log(`  ⚠️  ${message}`);
}

function logError(message) {
  console.log(`  ❌ ${message}`);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function readJSON(filePath) {
  try {
    const content = readFile(filePath);
    return content ? JSON.parse(content) : null;
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    logError(`Erro ao escrever ${filePath}: ${error.message}`);
    return false;
  }
}

function getDirectoryTree(dir, prefix = '', depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return [];
  
  const items = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.sort((a, b) => {
      // Diretórios primeiro
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    
    for (const entry of entries) {
      if (CONFIG.ignoreDirs.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        items.push(`${prefix}📁 ${entry.name}/`);
        items.push(...getDirectoryTree(fullPath, prefix + '   ', depth + 1, maxDepth));
      } else {
        const ext = path.extname(entry.name);
        const icon = CONFIG.codeExtensions.includes(ext) ? '📄' : '📎';
        items.push(`${prefix}${icon} ${entry.name}`);
      }
    }
  } catch {
    // Ignora erros de permissão
  }
  
  return items;
}

function findFiles(dir, pattern, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (CONFIG.ignoreDirs.includes(entry.name)) continue;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        findFiles(fullPath, pattern, results);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignora erros de permissão
  }
  
  return results;
}

function countPattern(content, pattern) {
  if (!content) return 0;
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function testPattern(content, pattern) {
  if (!content) return false;
  return pattern.test(content);
}

// ════════════════════════════════════════════════════════════════
// DETECTORES
// ════════════════════════════════════════════════════════════════

function detectFramework(packageJson) {
  if (!packageJson?.dependencies) return { name: 'unknown', version: null };
  
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (deps['next']) return { name: 'next', version: deps['next'] };
  if (deps['nuxt']) return { name: 'nuxt', version: deps['nuxt'] };
  if (deps['@sveltejs/kit']) return { name: 'sveltekit', version: deps['@sveltejs/kit'] };
  if (deps['@remix-run/react']) return { name: 'remix', version: deps['@remix-run/react'] };
  if (deps['gatsby']) return { name: 'gatsby', version: deps['gatsby'] };
  if (deps['vite']) return { name: 'vite', version: deps['vite'] };
  if (deps['react']) return { name: 'react', version: deps['react'] };
  if (deps['vue']) return { name: 'vue', version: deps['vue'] };
  
  return { name: 'unknown', version: null };
}

function detectSupabasePackage(packageJson) {
  if (!packageJson?.dependencies) return { package: null, version: null, deprecated: false };
  
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Verificar @supabase/ssr (atual)
  if (deps['@supabase/ssr']) {
    return { 
      package: '@supabase/ssr', 
      version: deps['@supabase/ssr'], 
      deprecated: false 
    };
  }
  
  // Verificar auth-helpers (obsoleto)
  if (deps['@supabase/auth-helpers-nextjs']) {
    return { 
      package: '@supabase/auth-helpers-nextjs', 
      version: deps['@supabase/auth-helpers-nextjs'], 
      deprecated: true 
    };
  }
  
  if (deps['@supabase/auth-helpers-react']) {
    return { 
      package: '@supabase/auth-helpers-react', 
      version: deps['@supabase/auth-helpers-react'], 
      deprecated: true 
    };
  }
  
  // Verificar cliente direto
  if (deps['@supabase/supabase-js']) {
    return { 
      package: '@supabase/supabase-js', 
      version: deps['@supabase/supabase-js'], 
      deprecated: false,
      note: 'Cliente direto sem SSR helpers'
    };
  }
  
  return { package: null, version: null, deprecated: false };
}

function detectUILibrary(packageJson) {
  if (!packageJson?.dependencies) return 'unknown';
  
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // shadcn/ui é detectado por componentes Radix
  if (deps['@radix-ui/react-slot'] || fileExists('components.json')) {
    return 'shadcn/ui';
  }
  if (deps['@mui/material']) return 'Material UI';
  if (deps['@chakra-ui/react']) return 'Chakra UI';
  if (deps['antd']) return 'Ant Design';
  if (deps['@mantine/core']) return 'Mantine';
  if (deps['daisyui']) return 'DaisyUI';
  
  return 'unknown';
}

function detectPrefix(prismaSchema) {
  if (!prismaSchema) return null;
  
  // Procurar padrão de prefixo em @@map
  const mapMatches = prismaSchema.match(/@@map\("(\w+)_\w+"\)/g);
  
  if (mapMatches && mapMatches.length > 0) {
    const prefixes = mapMatches.map(m => {
      const match = m.match(/@@map\("(\w+)_/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    // Retornar prefixo mais comum
    const counts = {};
    prefixes.forEach(p => counts[p] = (counts[p] || 0) + 1);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length > 0) {
      return sorted[0][0];
    }
  }
  
  // Tentar detectar por nome de modelo
  const modelMatches = prismaSchema.match(/model\s+(\w+)\s+{/g);
  if (modelMatches) {
    const models = modelMatches.map(m => m.match(/model\s+(\w+)/)[1]);
    const withUnderscore = models.filter(m => m.includes('_'));
    
    if (withUnderscore.length > 0) {
      const parts = withUnderscore[0].split('_');
      if (parts.length > 1) {
        return parts[0].toLowerCase();
      }
    }
  }
  
  return null;
}

function extractTables(prismaSchema) {
  if (!prismaSchema) return [];
  
  const tables = [];
  const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
  
  let match;
  while ((match = modelRegex.exec(prismaSchema)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // Extrair campos
    const fields = [];
    const fieldLines = modelBody.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('@@') && !l.startsWith('//'));
    
    for (const line of fieldLines) {
      const fieldMatch = line.match(/^(\w+)\s+(\w+)/);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2]
        });
      }
    }
    
    // Extrair nome da tabela mapeada
    const mapMatch = modelBody.match(/@@map\("(\w+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
    
    tables.push({
      model: modelName,
      table: tableName,
      fields: fields.map(f => f.name),
      fieldCount: fields.length
    });
  }
  
  return tables;
}

// ════════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE REGRAS DE RESILIÊNCIA
// ════════════════════════════════════════════════════════════════

function checkResilienceRules(files, projectPath) {
  const rules = {
    rule_01_sql_foundation: false,
    rule_02_config_order: 'unknown',
    rule_03_sync_double: false,
    rule_04_metadata_standard: false,
    rule_05_safety_check: false,
    rule_06_force_dynamic: false,
    rule_07_friendly_errors: false,
    rule_08_robust_triggers: false,
    rule_09_cookies_env: false,
    rule_10_connection_pool: false,
    rule_11_simple_rls: 'unknown',
    rule_12_organized_schemas: false,
    rule_13_migrations_cli: false,
    rule_14_supabase_ssr: false
  };
  
  // Regra 01: SQL Foundation
  rules.rule_01_sql_foundation = 
    fileExists('docs/database/00_DATABASE_FOUNDATION.sql') ||
    fileExists('supabase/migrations') && fs.readdirSync('supabase/migrations').length > 0;
  
  // Regra 03: Sync Double (ensureUserProfile)
  const allTsFiles = findFiles(projectPath, /\.(ts|tsx)$/);
  for (const file of allTsFiles.slice(0, 50)) { // Limitar para performance
    const content = readFile(file);
    if (content && testPattern(content, CONFIG.patterns.ensureProfile)) {
      rules.rule_03_sync_double = true;
      break;
    }
  }
  
  // Regra 04: Metadata Standard
  const constantsTs = files['src/lib/constants.ts'];
  if (constantsTs && testPattern(constantsTs, CONFIG.patterns.userMetaKeys)) {
    rules.rule_04_metadata_standard = true;
  }
  
  // Regra 05: Safety Check
  const clientTs = files['src/lib/supabase/client.ts'];
  if (clientTs && testPattern(clientTs, CONFIG.patterns.envCheck)) {
    rules.rule_05_safety_check = true;
  }
  
  // Regra 06: force-dynamic
  const layoutFiles = findFiles(projectPath, /layout\.(ts|tsx)$/);
  for (const file of layoutFiles.slice(0, 20)) {
    const content = readFile(file);
    if (content && testPattern(content, CONFIG.patterns.forceDynamic)) {
      rules.rule_06_force_dynamic = true;
      break;
    }
  }
  
  // Regra 09: Cookies por ambiente
  const cookiesTs = files['src/lib/cookies.ts'];
  if (cookiesTs && testPattern(cookiesTs, CONFIG.patterns.getCookieOptions)) {
    rules.rule_09_cookies_env = true;
  }
  
  // Regra 10: Connection Pooling
  const envExample = files['.env.example'];
  if (envExample) {
    rules.rule_10_connection_pool = 
      testPattern(envExample, CONFIG.patterns.port6543) ||
      testPattern(envExample, CONFIG.patterns.pgbouncer);
  }
  
  // Regra 12: Organized Schemas
  const sqlFiles = findFiles(projectPath, /\.sql$/);
  for (const file of sqlFiles.slice(0, 20)) {
    const content = readFile(file);
    if (content && testPattern(content, CONFIG.patterns.createSchema)) {
      rules.rule_12_organized_schemas = true;
      break;
    }
  }
  
  // Regra 13: Migrations CLI
  rules.rule_13_migrations_cli = fileExists('supabase/config.toml');
  
  // Regra 14: Supabase SSR
  const packageJson = readJSON('package.json');
  if (packageJson?.dependencies?.['@supabase/ssr']) {
    rules.rule_14_supabase_ssr = true;
  }
  
  // Regra 08: Robust Triggers
  for (const file of sqlFiles.slice(0, 20)) {
    const content = readFile(file);
    if (content && testPattern(content, CONFIG.patterns.triggerException)) {
      rules.rule_08_robust_triggers = true;
      break;
    }
  }
  
  return rules;
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO DE SCORE
// ════════════════════════════════════════════════════════════════

function calculateScore(rules) {
  const weights = {
    rule_01_sql_foundation: 3,
    rule_03_sync_double: 2,
    rule_04_metadata_standard: 1,
    rule_05_safety_check: 2,
    rule_06_force_dynamic: 1,
    rule_07_friendly_errors: 1,
    rule_08_robust_triggers: 2,
    rule_09_cookies_env: 1,
    rule_10_connection_pool: 2,
    rule_11_simple_rls: 1,
    rule_12_organized_schemas: 1,
    rule_13_migrations_cli: 1,
    rule_14_supabase_ssr: 2
  };
  
  let score = 0;
  let maxScore = 0;
  
  for (const [rule, weight] of Object.entries(weights)) {
    maxScore += weight;
    if (rules[rule] === true) {
      score += weight;
    }
  }
  
  const percentage = Math.round((score / maxScore) * 100);
  let grade;
  
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  else grade = 'F';
  
  return { score, maxScore, percentage, grade };
}

// ════════════════════════════════════════════════════════════════
// GERAÇÃO DE ISSUES
// ════════════════════════════════════════════════════════════════

function generateIssues(rules, packageJson) {
  const issues = [];
  
  if (!rules.rule_01_sql_foundation) {
    issues.push({
      severity: 'critical',
      rule: 'rule_01',
      title: 'SQL de fundação não existe',
      message: 'Não encontrado docs/database/00_DATABASE_FOUNDATION.sql',
      fix: 'Gerar SQL completo com todas as tabelas, triggers e policies'
    });
  }
  
  if (!rules.rule_14_supabase_ssr) {
    const hasAuthHelpers = packageJson?.dependencies?.['@supabase/auth-helpers-nextjs'] ||
                          packageJson?.dependencies?.['@supabase/auth-helpers-react'];
    
    issues.push({
      severity: hasAuthHelpers ? 'critical' : 'high',
      rule: 'rule_14',
      title: hasAuthHelpers ? 'Usando pacote OBSOLETO' : '@supabase/ssr não instalado',
      message: hasAuthHelpers 
        ? '@supabase/auth-helpers está obsoleto'
        : 'Pacote @supabase/ssr não encontrado',
      fix: 'pnpm remove @supabase/auth-helpers-nextjs @supabase/auth-helpers-react && pnpm add @supabase/ssr'
    });
  }
  
  if (!rules.rule_05_safety_check) {
    issues.push({
      severity: 'high',
      rule: 'rule_05',
      title: 'Safety check de variáveis não implementado',
      message: 'Cliente Supabase não verifica variáveis de ambiente',
      file: 'src/lib/supabase/client.ts',
      fix: 'Adicionar verificação de NEXT_PUBLIC_SUPABASE_URL e ANON_KEY'
    });
  }
  
  if (!rules.rule_03_sync_double) {
    issues.push({
      severity: 'high',
      rule: 'rule_03',
      title: 'Sincronização dupla não implementada',
      message: 'Não encontrada função ensureUserProfile ou similar',
      fix: 'Implementar check-and-create para perfil de usuário'
    });
  }
  
  if (!rules.rule_10_connection_pool) {
    issues.push({
      severity: 'medium',
      rule: 'rule_10',
      title: 'Connection pooling não configurado',
      message: 'Não encontrada configuração de Supavisor (porta 6543)',
      file: '.env.example',
      fix: 'Usar porta 6543 com ?pgbouncer=true na DATABASE_URL'
    });
  }
  
  if (!rules.rule_06_force_dynamic) {
    issues.push({
      severity: 'medium',
      rule: 'rule_06',
      title: 'force-dynamic não encontrado',
      message: 'Páginas com Supabase podem falhar no build',
      fix: 'Adicionar export const dynamic = "force-dynamic" em layouts'
    });
  }
  
  if (!rules.rule_08_robust_triggers) {
    issues.push({
      severity: 'medium',
      rule: 'rule_08',
      title: 'Triggers sem tratamento de erro',
      message: 'Não encontrado EXCEPTION WHEN em triggers SQL',
      fix: 'Adicionar bloco EXCEPTION em todas as triggers'
    });
  }
  
  if (!rules.rule_09_cookies_env) {
    issues.push({
      severity: 'low',
      rule: 'rule_09',
      title: 'Cookies não configurados por ambiente',
      message: 'Não encontrada configuração condicional de cookies',
      file: 'src/lib/cookies.ts',
      fix: 'Criar getCookieOptions() com configuração dev/prod'
    });
  }
  
  if (!rules.rule_04_metadata_standard) {
    issues.push({
      severity: 'low',
      rule: 'rule_04',
      title: 'Metadados não padronizados',
      message: 'Não encontrado USER_META ou padronização',
      file: 'src/lib/constants.ts',
      fix: 'Criar constantes para chaves de metadados'
    });
  }
  
  if (!rules.rule_12_organized_schemas) {
    issues.push({
      severity: 'low',
      rule: 'rule_12',
      title: 'Schemas não organizados',
      message: 'Não encontrado CREATE SCHEMA para dados sensíveis',
      fix: 'Criar schema app_private para dados sensíveis'
    });
  }
  
  if (!rules.rule_13_migrations_cli) {
    issues.push({
      severity: 'low',
      rule: 'rule_13',
      title: 'Supabase CLI não configurado',
      message: 'Não encontrado supabase/config.toml',
      fix: 'Executar supabase init para habilitar migrations via CLI'
    });
  }
  
  // Ordenar por severidade
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ════════════════════════════════════════════════════════════════
// GERAÇÃO DE MARKDOWN
// ════════════════════════════════════════════════════════════════

function generateMarkdown(snapshot) {
  const s = snapshot;
  
  let md = `# VIBE Project Snapshot: ${s.project.name}

**Extraído em:** ${new Date(s.extraction_date).toLocaleString('pt-BR')}
**VIBE Version:** ${s.vibe_version}
**Extractor Version:** ${s.extractor_version}
**Score:** ${s.scores.score}/${s.scores.maxScore} (${s.scores.grade}) - ${s.scores.percentage}%

---

## Stack Detectada

| Item | Valor |
|------|-------|
| Framework | ${s.project.framework} ${s.project.framework_version || ''} |
| Linguagem | ${s.stack.language} |
| Runtime | ${s.stack.runtime} ${s.stack.runtime_version || ''} |
| Package Manager | ${s.stack.package_manager} |
| UI Library | ${s.stack.ui_library} |
| Styling | ${s.stack.styling} |

## Banco de Dados

| Item | Valor |
|------|-------|
| Tipo | ${s.database.type} |
| Serviço | ${s.database.service} |
| ORM | ${s.database.orm} |
| Prefixo Detectado | ${s.database.prefix_detected || '❌ Não detectado'} |
| SQL de Fundação | ${s.database.has_foundation_sql ? '✅ Existe' : '❌ Não existe'} |

### Tabelas Encontradas (${s.database.tables.length})

`;

  if (s.database.tables.length > 0) {
    md += '| Modelo | Tabela | Campos |\n';
    md += '|--------|--------|--------|\n';
    for (const t of s.database.tables) {
      md += `| ${t.model} | ${t.table} | ${t.fieldCount} |\n`;
    }
  } else {
    md += '*Nenhuma tabela encontrada no schema Prisma.*\n';
  }

  md += `

## Autenticação

| Item | Valor |
|------|-------|
| Provider | ${s.auth.provider} |
| Pacote | ${s.auth.package || 'Não detectado'} |
| Versão | ${s.auth.package_version || '-'} |
| Obsoleto? | ${s.auth.deprecated ? '⚠️ SIM - MIGRAR!' : '✅ Não'} |
| Middleware | ${s.auth.has_middleware ? '✅ Existe' : '❌ Não existe'} |

## Regras de Resiliência VIBE v4.7

| # | Regra | Status | Descrição |
|---|-------|--------|-----------|
| 01 | SQL Fundação | ${s.resilience_check.rule_01_sql_foundation ? '✅' : '❌'} | SQL único com todo o banco |
| 02 | Ordem Config | ${s.resilience_check.rule_02_config_order === 'unknown' ? '⚠️' : s.resilience_check.rule_02_config_order ? '✅' : '❌'} | SQL antes de código |
| 03 | Sync Dupla | ${s.resilience_check.rule_03_sync_double ? '✅' : '❌'} | Check-and-create de perfil |
| 04 | Metadados | ${s.resilience_check.rule_04_metadata_standard ? '✅' : '❌'} | Padronização de user meta |
| 05 | Safety Check | ${s.resilience_check.rule_05_safety_check ? '✅' : '❌'} | Validação de env vars |
| 06 | force-dynamic | ${s.resilience_check.rule_06_force_dynamic ? '✅' : '❌'} | Em páginas com Supabase |
| 07 | Msgs Amigáveis | ${s.resilience_check.rule_07_friendly_errors ? '✅' : '❌'} | Erros humanizados |
| 08 | Triggers | ${s.resilience_check.rule_08_robust_triggers ? '✅' : '❌'} | Com EXCEPTION |
| 09 | Cookies/Env | ${s.resilience_check.rule_09_cookies_env ? '✅' : '❌'} | Config por ambiente |
| 10 | Pooling | ${s.resilience_check.rule_10_connection_pool ? '✅' : '❌'} | Supavisor porta 6543 |
| 11 | RLS Simples | ${s.resilience_check.rule_11_simple_rls === 'unknown' ? '⚠️' : s.resilience_check.rule_11_simple_rls ? '✅' : '❌'} | Sem lógica complexa |
| 12 | Schemas | ${s.resilience_check.rule_12_organized_schemas ? '✅' : '❌'} | app_private |
| 13 | Migrations CLI | ${s.resilience_check.rule_13_migrations_cli ? '✅' : '❌'} | supabase db diff |
| 14 | @supabase/ssr | ${s.resilience_check.rule_14_supabase_ssr ? '✅' : '❌'} | Pacote atual |

## Issues Encontrados (${s.issues.length})

`;

  if (s.issues.length > 0) {
    for (const issue of s.issues) {
      const icon = issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'high' ? '🟠' :
                   issue.severity === 'medium' ? '🟡' : '🟢';
      
      md += `### ${icon} ${issue.title}

**Severidade:** ${issue.severity.toUpperCase()}
**Regra:** ${issue.rule}
${issue.file ? `**Arquivo:** \`${issue.file}\`\n` : ''}
${issue.message}

**Fix:** ${issue.fix}

---

`;
    }
  } else {
    md += '*Nenhum issue encontrado. Projeto está aderente ao VIBE v4.7!* 🎉\n';
  }

  md += `
## Estrutura do Projeto

| Item | Status |
|------|--------|
| Pasta docs/ | ${s.structure.has_docs_folder ? '✅' : '❌'} |
| Pasta docs/database/ | ${s.structure.has_database_folder ? '✅' : '❌'} |
| Pasta docs/prompts/ | ${s.structure.has_prompts_folder ? '✅' : '❌'} |
| Pasta docs/sprints/ | ${s.structure.has_sprints_folder ? '✅' : '❌'} |

### Árvore de Arquivos

\`\`\`
${s.structure.tree.slice(0, 80).join('\n')}
${s.structure.tree.length > 80 ? '\n... (mais arquivos)' : ''}
\`\`\`

---

## Como Usar Este Snapshot

1. **Copie** o arquivo \`vibe-project-snapshot.json\`

2. **Abra uma nova conversa** com VIBE_PROJECT_ARCHITECT_v4.7.md

3. **Responda as perguntas iniciais** (ambiente, perfil)

4. **Quando perguntar tipo de projeto**, escolha:
   - "c) Projeto existente com snapshot"

5. **Cole o JSON** do snapshot

6. **O Data Architect** vai analisar e gerar:
   - Diagnóstico detalhado
   - 00_DATABASE_FOUNDATION.sql (estado ideal)
   - 00_DATABASE_MIGRATION.sql (correções)
   - SPRINT_ADQ_XX (adequações de código)

---

*Gerado por VIBE Audit Extract v${s.extractor_version}*
*Para VIBE PROJECT ARCHITECT v${s.vibe_version}*
`;

  return md;
}

// ════════════════════════════════════════════════════════════════
// EXTRAÇÃO PRINCIPAL
// ════════════════════════════════════════════════════════════════

function extract() {
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  VIBE AUDIT EXTRACT v' + CONFIG.version);
  console.log('  Para VIBE PROJECT ARCHITECT v' + CONFIG.vibeVersion);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  
  const startTime = Date.now();
  const projectPath = process.cwd();
  const projectName = path.basename(projectPath);
  
  log(`Projeto: ${projectName}`);
  log(`Caminho: ${projectPath}`);
  console.log('');
  
  // Verificar se é um projeto válido
  if (!fileExists('package.json')) {
    logError('package.json não encontrado!');
    logError('Execute este script na raiz de um projeto Node.js/Next.js');
    process.exit(1);
  }
  
  // Ler arquivos de configuração
  log('Lendo arquivos de configuração...');
  const packageJson = readJSON('package.json');
  const tsconfigJson = readJSON('tsconfig.json');
  
  // Extrair conteúdo de arquivos específicos
  log('Extraindo arquivos importantes...');
  const files = {};
  for (const filePath of CONFIG.extractContent) {
    const content = readFile(filePath);
    if (content) {
      files[filePath] = content;
      logSuccess(filePath);
    }
  }
  
  console.log('');
  
  // Detectar framework e stack
  log('Detectando stack...');
  const framework = detectFramework(packageJson);
  const supabase = detectSupabasePackage(packageJson);
  const uiLibrary = detectUILibrary(packageJson);
  const prismaSchema = files['prisma/schema.prisma'];
  const prefix = detectPrefix(prismaSchema);
  const tables = extractTables(prismaSchema);
  
  logSuccess(`Framework: ${framework.name} ${framework.version || ''}`);
  logSuccess(`UI Library: ${uiLibrary}`);
  if (prefix) {
    logSuccess(`Prefixo detectado: ${prefix}_`);
  } else {
    logWarning('Prefixo não detectado');
  }
  logSuccess(`Tabelas encontradas: ${tables.length}`);
  
  console.log('');
  
  // Verificar regras de resiliência
  log('Verificando regras de resiliência...');
  const rules = checkResilienceRules(files, projectPath);
  const score = calculateScore(rules);
  const issues = generateIssues(rules, packageJson);
  
  logSuccess(`Score: ${score.score}/${score.maxScore} (${score.grade})`);
  if (issues.length > 0) {
    logWarning(`Issues encontrados: ${issues.length}`);
  } else {
    logSuccess('Nenhum issue encontrado!');
  }
  
  console.log('');
  
  // Estrutura de pastas
  log('Mapeando estrutura...');
  const structure = getDirectoryTree('.', '', 0, 3);
  logSuccess(`Arquivos/pastas mapeados: ${structure.length}`);
  
  console.log('');
  
  // Montar snapshot
  const snapshot = {
    vibe_version: CONFIG.vibeVersion,
    extractor_version: CONFIG.version,
    extraction_date: new Date().toISOString(),
    
    project: {
      name: projectName,
      path: projectPath,
      framework: framework.name,
      framework_version: framework.version
    },
    
    stack: {
      language: packageJson?.devDependencies?.typescript ? 'typescript' : 'javascript',
      runtime: 'node',
      runtime_version: packageJson?.engines?.node || process.version,
      package_manager: fileExists('pnpm-lock.yaml') ? 'pnpm' : 
                       fileExists('yarn.lock') ? 'yarn' : 
                       fileExists('bun.lockb') ? 'bun' : 'npm',
      ui_library: uiLibrary,
      styling: packageJson?.dependencies?.tailwindcss || 
               packageJson?.devDependencies?.tailwindcss ? 'tailwindcss' : 'css'
    },
    
    database: {
      type: 'postgresql',
      service: supabase.package ? 'supabase' : 'unknown',
      orm: packageJson?.dependencies?.prisma || 
           packageJson?.devDependencies?.prisma ? 'prisma' : 
           packageJson?.dependencies?.drizzle ? 'drizzle' : 'none',
      prefix_detected: prefix,
      tables: tables,
      has_foundation_sql: rules.rule_01_sql_foundation
    },
    
    auth: {
      provider: supabase.package ? 'supabase' : 'unknown',
      package: supabase.package,
      package_version: supabase.version,
      deprecated: supabase.deprecated,
      has_middleware: fileExists('src/middleware.ts') || fileExists('middleware.ts')
    },
    
    resilience_check: rules,
    
    scores: score,
    
    issues: issues,
    
    structure: {
      tree: structure,
      has_docs_folder: fileExists('docs'),
      has_database_folder: fileExists('docs/database'),
      has_prompts_folder: fileExists('docs/prompts'),
      has_sprints_folder: fileExists('docs/sprints')
    },
    
    files_content: files,
    
    dependencies: {
      production: packageJson?.dependencies || {},
      development: packageJson?.devDependencies || {}
    }
  };
  
  // Salvar JSON
  log('Salvando snapshot...');
  const jsonPath = 'vibe-project-snapshot.json';
  if (writeFile(jsonPath, JSON.stringify(snapshot, null, 2))) {
    logSuccess(`Salvo: ${jsonPath}`);
  }
  
  // Gerar e salvar Markdown
  const markdown = generateMarkdown(snapshot);
  const mdPath = 'vibe-project-snapshot.md';
  if (writeFile(mdPath, markdown)) {
    logSuccess(`Salvo: ${mdPath}`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  ✅ Extração concluída em ${elapsed}s`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  📊 RESULTADO:');
  console.log(`     Score: ${score.score}/${score.maxScore} (${score.grade})`);
  console.log(`     Issues: ${issues.length}`);
  console.log('');
  console.log('  📄 ARQUIVOS GERADOS:');
  console.log(`     - ${jsonPath} (para o LLM)`);
  console.log(`     - ${mdPath} (para você revisar)`);
  console.log('');
  console.log('  🚀 PRÓXIMOS PASSOS:');
  console.log('');
  console.log('     1. Revise vibe-project-snapshot.md');
  console.log('     2. Abra nova conversa com VIBE_PROJECT_ARCHITECT_v4.7.md');
  console.log('     3. Responda as perguntas iniciais');
  console.log('     4. Escolha "projeto existente com snapshot"');
  console.log('     5. Cole o conteúdo de vibe-project-snapshot.json');
  console.log('     6. Diga: "Analise este snapshot e proponha adequações"');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
}

// ════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ════════════════════════════════════════════════════════════════

extract();

