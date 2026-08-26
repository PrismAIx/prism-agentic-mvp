import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distDir = path.resolve(process.env.PRISM_PUBLIC_DIST_DIR ?? path.join(projectRoot, 'dist'));
const permittedExtensions = new Set(['.avif', '.css', '.gif', '.html', '.ico', '.jpeg', '.jpg', '.js', '.png', '.svg', '.txt', '.webp']);
const textExtensions = new Set(['.css', '.html', '.js', '.svg', '.txt']);
const metadataRules = [
  ['CONTENT_PRIVACY_EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['CONTENT_PRIVACY_PHONE', /\+\d{1,3}[ .-]?(?:\d[ .-]?){7,}\d\b/],
  ['CONTENT_PRIVACY_PATH', /\/Users\//],
  ['CONTENT_PRIVACY_ADDRESS', /0x[a-fA-F0-9]{40}\b/],
];
const genericBackendRoutePattern = /\/(?:backend|server|worker|agent)(?=\/|[?#'"`\s]|$)/i;
const genericWalletCapabilityPattern = /\bwindow\.ethereum(?:\.request)?\b|\bethereum\.request\b|\b(?:signer|requestAccounts|signTransaction|sendTransaction|signTypedData|personal_sign|eth_requestAccounts|eth_sendTransaction)\b/i;
const genericCredentialIdentifierPattern = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*(?:_API_KEY|_PRIVATE_KEY|_SECRET|_TOKEN|_MNEMONIC|_SIGNER|_API_URL|_USER_ADDRESS)\b|\b(?:mnemonic|privateKey)\b/;
const textRules = [
  ['CONTENT_API_ROUTE', /\/api(?=\/|[?#'"`\s]|$)/i],
  ['CONTENT_LOOPBACK', /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b|\[::1\]/i],
  ['CONTENT_BACKEND_ROUTE', genericBackendRoutePattern],
  ['CONTENT_NETWORK_PRIMITIVE', /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|navigator\.sendBeacon\b/],
  ['CONTENT_PWA', /\b(?:workbox|generateSW|injectManifest|registerRoute|precacheAndRoute|registerSW|virtual:pwa|service-worker|runtimeCaching|VitePWA)\b/i],
  ['CONTENT_PWA', /\bserviceWorker\b/],
  ['CONTENT_WALLET', genericWalletCapabilityPattern],
  ['CONTENT_SECRET', genericCredentialIdentifierPattern],
];
const allowedExternalUrls = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/XML/1998/namespace',
  'https://react.dev/errors/',
]);
const externalUrlMatcher = /https?:\/\/[^\s'"`<>\\]+|(?<!:)\/\/(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9][A-Za-z0-9.-]*)(?::\d+)?(?:\/[^\s'"`<>\\]*)?/g;
const findings = new Map();

function report(rule, file) {
  if (!findings.has(rule)) findings.set(rule, file);
}

function relative(file) {
  return path.relative(distDir, file) || '.';
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const info = lstatSync(file);
    if (info.isSymbolicLink()) {
      report('FILE_SYMLINK', relative(file));
    } else if (info.isDirectory()) {
      if (/^(?:api|server)$/i.test(entry.name)) report(entry.name.toLowerCase() === 'api' ? 'FILE_API' : 'FILE_SERVER', relative(file));
      files.push(...walk(file));
    } else if (info.isFile()) {
      files.push(file);
    } else {
      report('FILE_EXTENSION', relative(file));
    }
  }
  return files;
}

function scanText(content, file) {
  for (const [rule, pattern] of textRules) {
    if (pattern.test(content)) report(rule, file);
  }
  for (const urlMatch of content.matchAll(externalUrlMatcher)) {
    if (!allowedExternalUrls.has(urlMatch[0])) report('CONTENT_EXTERNAL_ORIGIN', file);
  }
}

function scanMetadata(buffer, file) {
  const metadata = buffer.toString('latin1');
  for (const [rule, pattern] of metadataRules) {
    if (pattern.test(metadata)) report(rule, file);
  }
}

if (!existsSync(distDir) || !lstatSync(distDir).isDirectory()) {
  report('DIST_DIRECTORY', distDir);
} else {
  const files = walk(distDir);
  const indexPath = path.join(distDir, 'index.html');
  const robotsPath = path.join(distDir, 'robots.txt');

  if (!existsSync(indexPath) || !lstatSync(indexPath).isFile()) {
    report('ENTRYPOINT', 'index.html');
  } else {
    const index = readFileSync(indexPath, 'utf8');
    if (!/<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b[^"']*\bnofollow\b[^"']*["']/i.test(index)) report('ROBOTS_META', 'index.html');
  }

  if (!existsSync(robotsPath) || !lstatSync(robotsPath).isFile()) {
    report('ROBOTS_FILE', 'robots.txt');
  } else {
    const robots = readFileSync(robotsPath, 'utf8');
    if (!/User-agent:\s*\*/i.test(robots) || !/Disallow:\s*\//i.test(robots)) report('ROBOTS_FILE', 'robots.txt');
  }

  let combinedText = '';
  for (const file of files) {
    const rel = relative(file);
    const base = path.basename(file);
    const ext = path.extname(file).toLowerCase();
    if (base === '.env' || base.startsWith('.env.') || rel.split(path.sep).some((part) => part.startsWith('.env'))) report('FILE_ENV', rel);
    if (ext === '.map') report('FILE_MAP', rel);
    if (/^(?:api|server)(?:\.|$)/i.test(base)) report(/^api(?:\.|$)/i.test(base) ? 'FILE_API' : 'FILE_SERVER', rel);
    if (/^(?:manifest(?:\.webmanifest|\.json)?|service-worker|sw|workbox[^/]*|registerSW)(?:[._-]|$)/i.test(base) || ext === '.webmanifest') report('FILE_PWA', rel);
    if (/\.(?:ts|tsx|jsx|mjs|cjs)$/i.test(base) || /(?:^|\/)(?:vite|webpack|rollup|eslint|tsconfig)\.config\.(?:js|jsx|ts|tsx|mjs|cjs)$/i.test(rel)) report('FILE_SOURCE', rel);
    if (!permittedExtensions.has(ext)) report('FILE_EXTENSION', rel);

    if ((ext === '.js' || ext === '.css') && !rel.startsWith(`assets${path.sep}`)) report('FILE_OUTPUT_LOCATION', rel);

    const info = lstatSync(file);
    if (info.mode & 0o111) report('FILE_EXECUTABLE', rel);
    const buffer = readFileSync(file);
    scanMetadata(buffer, rel);
    if (textExtensions.has(ext)) {
      const content = buffer.toString('utf8');
      combinedText += `\n${content}`;
      scanText(content, rel);
    }
  }

  if (!/Synthetic demo data/i.test(combinedText)) report('DISCLOSURE_SYNTHETIC', 'dist');
  if (!/read-only/i.test(combinedText)) report('DISCLOSURE_READ_ONLY', 'dist');
  if (!/Preview only\s*·\s*no transaction sent/i.test(combinedText)) report('DISCLOSURE_NO_TRANSACTION', 'dist');
}

if (findings.size > 0) {
  for (const [rule, file] of findings) console.error(`PUBLIC_BUILD_SAFE_${rule} ${file}`);
  process.exitCode = 1;
} else {
  console.log('PUBLIC_BUILD_SAFE_OK');
}
