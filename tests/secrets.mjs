// Fails if anything private is about to be published: keys and tokens, addresses
// on the home network or Tailscale, paths and user names from the Air or the Mini,
// personal email, or files that never belong in a public repository.
// Scans every file git tracks or is about to track, and dist/ when it exists.
// Prints where and which rule, never the matched text.
//
//   node tests/secrets.mjs            tracked + staged files, and dist/
//   node tests/secrets.mjs --staged   only what's staged (the pre-commit hook)
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const staged = process.argv.includes('--staged');

const RULES = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['AWS key', /\b(AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Anthropic or OpenAI key', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ['Alpaca key', /\b(PK|AK|CK)[A-Z0-9]{18}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe key', /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/],
  ['password or secret assignment', /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i],
  ['Tailscale address', /\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/],
  ['home-network address', /\b(192\.168|10\.\d{1,3}|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/],
  ['Tailscale or local hostname', /\b[a-z0-9-]+\.(ts\.net|local)\b/i],
  ['path on the Air or the Mini', /\/Users\/|\/Volumes\/|~\/(ergo|ellipsis|ergo-merged|ergo-access)\b/],
  ['machine user name', /\b(kahleeeb|kogito)\b/i],
  ['personal email', /[A-Za-z0-9._%+-]+@(gmail|icloud|me|outlook|yahoo)\.com/i],
];
const BAD_NAMES = [
  ['env file', /(^|\/)\.env(\..*)?$/],
  ['key or certificate file', /\.(pem|key|p12|pfx|keystore)$|(^|\/)id_(rsa|ed25519|ecdsa)/],
  ['trading or positions data', /trading_books|positions\.csv/],
  ['journal or notes export', /(^|\/)(journal|notes|conversations|turns)\//i],
];
const TEXT = /\.(astro|ts|js|mjs|cjs|json|md|css|html|svg|yml|yaml|txt|xml|webmanifest)$|(^|\/)\.[a-z]+rc$|(^|\/)\.gitignore$/;
// Lines that may name these things on purpose: this file's own rules.
const SELF = 'tests/secrets.mjs';

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
let files = staged ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
  : [...new Set([...git('ls-files'), ...git('diff', '--cached', '--name-only', '--diff-filter=ACMR')])];
files = files.map((f) => join(root, f));
if (!staged && existsSync(join(root, 'dist'))) {
  const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
  walk(join(root, 'dist'));
}

const hits = [];
for (const f of files) {
  const rel = relative(root, f);
  for (const [name, re] of BAD_NAMES) if (re.test(rel)) hits.push(`${rel}: ${name}`);
  if (rel === SELF || !existsSync(f) || !TEXT.test(basename(f) === basename(rel) ? rel : f)) continue;
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    for (const [name, re] of RULES) if (re.test(line)) hits.push(`${rel}:${i + 1}: ${name}`);
  });
}

for (const h of hits) console.log(`!! ${h}`);
console.log(hits.length ? `FAIL — ${hits.length} finding(s) in ${files.length} files` : `PASS — ${files.length} files clean`);
process.exit(hits.length ? 1 : 0);
