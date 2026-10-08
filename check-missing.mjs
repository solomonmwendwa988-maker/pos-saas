import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

// Try each of these extensions when resolving an import.
const EXTENSIONS = [
  '',
  '.jsx',
  '.js',
  '.tsx',
  '.ts',
  '.css',
  '/index.jsx',
  '/index.js',
  '/index.tsx',
  '/index.ts',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(jsx?|tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(fromFile, importPath) {
  let target;
  if (importPath.startsWith('@/')) {
    target = path.join(SRC, importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    target = path.resolve(path.dirname(fromFile), importPath);
  } else {
    return null; // external package — ignore
  }

  for (const ext of EXTENSIONS) {
    const candidate = target + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { ok: true, resolved: candidate };
    }
  }
  return { ok: false, resolved: target };
}

const files = walk(SRC);
const missing = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const result = resolveImport(file, importPath);
    if (result && !result.ok) {
      missing.push({
        importPath,
        from: path.relative(ROOT, file),
        expected: path.relative(ROOT, result.resolved),
      });
    }
  }
}

if (missing.length === 0) {
  console.log('\nAll imports resolved. Project is clean.\n');
  process.exit(0);
}

console.log(`\nFound ${missing.length} missing import(s):\n`);
for (const m of missing) {
  console.log(`  ${m.importPath}`);
  console.log(`    from:     ${m.from}`);
  console.log(`    expected: ${m.expected}\n`);
}
process.exit(1);