import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url).pathname;
const guard = join(projectRoot, 'scripts/assert-public-demo-safe.mjs');
const fixtureEmail = `person${'@'}example${'.'}com`;
const fixturePhone = ['+33', '6', '12', '34', '56', '78'].join(' ');
const fixturePath = ['', 'Users', 'example'].join('/');
const fixtureAddress = ['0x', '0123456789abcdef0123456789abcdef01234567'].join('');

function runGuard(distDir) {
  return spawnSync(process.execPath, [guard], {
    encoding: 'utf8',
    env: { ...process.env, PRISM_PUBLIC_DIST_DIR: distDir },
  });
}

async function writeSafeFixture(root) {
  await mkdir(join(root, 'assets'));
  await Promise.all([
    writeFile(join(root, 'index.html'), '<!doctype html><meta name="robots" content="noindex,nofollow"><main>Synthetic demo data · read-only<br>Preview only · no transaction sent</main>'),
    writeFile(join(root, 'robots.txt'), 'User-agent: *\nDisallow: /\n'),
    writeFile(join(root, 'assets', 'app.js'), 'console.log("static preview");\n'),
    writeFile(join(root, 'assets', 'app.css'), 'body { color: #fff; }\n'),
    writeFile(join(root, 'mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>\n'),
    writeFile(join(root, 'image.png'), Buffer.from([137, 80, 78, 71, 0, 1])),
  ]);
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), 'prism-public-build-'));
  try {
    await writeSafeFixture(root);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('accepts a complete safe static build fixture', async () => {
  await withFixture(async (root) => {
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });
});

test('accepts a plain network asset label without wallet capability', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'assets', 'app.js'), 'const assetName = "Ethereum";\n');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });
});

const contentCases = [
  ['API route', 'const path = "/api?x=1";', 'CONTENT_API_ROUTE'],
  ['loopback host', 'const host = "127.0.0.1";', 'CONTENT_LOOPBACK'],
  ['generic backend route', 'const path = "/backend/run";', 'CONTENT_BACKEND_ROUTE'],
  ['network primitive', 'fetch("relative.json");', 'CONTENT_NETWORK_PRIMITIVE'],
  ['PWA marker', 'const marker = "workbox";', 'CONTENT_PWA'],
  ['wallet signing capability', 'window.ethereum.request({ method: "eth_requestAccounts" });', 'CONTENT_WALLET'],
  ['generic signer capability', 'const capability = "signer";', 'CONTENT_WALLET'],
  ['generic provider credential identifier', 'const marker = "MODEL_PROVIDER_API_KEY";', 'CONTENT_SECRET'],
  ['Ethereum address shape', `const address = "${fixtureAddress}";`, 'CONTENT_PRIVACY_ADDRESS'],
  ['external HTTPS origin', 'const origin = "https://example.invalid";', 'CONTENT_EXTERNAL_ORIGIN'],
  ['protocol-relative origin', 'const origin = "//example.invalid/script.js";', 'CONTENT_EXTERNAL_ORIGIN'],
  ['absolute local path', `const path = "${fixturePath}";`, 'CONTENT_PRIVACY_PATH'],
  ['personal email', `const email = "${fixtureEmail}";`, 'CONTENT_PRIVACY_EMAIL'],
  ['international phone', `const phone = "${fixturePhone}";`, 'CONTENT_PRIVACY_PHONE'],
];

for (const [label, content, rule] of contentCases) {
  test(`rejects ${label} through its stable rule`, async () => {
    await withFixture(async (root) => {
      await writeFile(join(root, 'unsafe.js'), content);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`PUBLIC_BUILD_SAFE_${rule}`));
    });
  });
}

test('rejects privacy metadata embedded in a binary asset', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'brand.png'), Buffer.concat([Buffer.from([0, 255, 0]), Buffer.from(fixtureEmail)]));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /PUBLIC_BUILD_SAFE_CONTENT_PRIVACY_EMAIL/);
  });
});

const pathCases = [
  ['missing entrypoint', 'ENTRYPOINT', async (root) => rm(join(root, 'index.html'))],
  ['invalid robots meta', 'ROBOTS_META', async (root) => writeFile(join(root, 'index.html'), '<main>Synthetic demo data · read-only · Preview only · no transaction sent</main>')],
  ['missing robots file', 'ROBOTS_FILE', async (root) => rm(join(root, 'robots.txt'))],
  ['source map', 'FILE_MAP', async (root) => writeFile(join(root, 'app.js.map'), '{}')],
  ['environment file', 'FILE_ENV', async (root) => writeFile(join(root, '.env.preview'), 'VALUE=1')],
  ['server artifact', 'FILE_SERVER', async (root) => writeFile(join(root, 'server.js'), 'export {};')],
  ['API artifact', 'FILE_API', async (root) => writeFile(join(root, 'api.js'), 'export {};')],
  ['PWA artifact', 'FILE_PWA', async (root) => writeFile(join(root, 'manifest.webmanifest'), '{}')],
  ['unexpected executable', 'FILE_EXTENSION', async (root) => writeFile(join(root, 'run.sh'), '#!/bin/sh')],
];

for (const [label, rule, change] of pathCases) {
  test(`rejects ${label} through its stable rule`, async () => {
    await withFixture(async (root) => {
      await change(root);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`PUBLIC_BUILD_SAFE_${rule}`));
    });
  });
}

test('rejects symbolic links through its stable rule', async () => {
  await withFixture(async (root) => {
    await symlink('assets/app.js', join(root, 'linked.js'));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /PUBLIC_BUILD_SAFE_FILE_SYMLINK/);
  });
});

test('allows only exact inert namespace and React diagnostic origins', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'assets', 'allowed.js'), 'const diagnostic = "https://react.dev/errors/";\n');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  });
});

const outputPathCases = [
  ['service-worker JavaScript artifact', 'FILE_PWA', 'service-worker.js'],
  ['short service-worker JavaScript artifact', 'FILE_PWA', 'sw.js'],
  ['Workbox JavaScript artifact', 'FILE_PWA', 'workbox-runtime.js'],
  ['registerSW JavaScript artifact', 'FILE_PWA', 'registerSW.js'],
  ['Vite JavaScript config artifact', 'FILE_SOURCE', 'vite.config.js'],
  ['Vite TypeScript config artifact', 'FILE_SOURCE', 'vite.config.ts'],
  ['Vite TSX config artifact', 'FILE_SOURCE', 'vite.config.tsx'],
  ['Vite module config artifact', 'FILE_SOURCE', 'vite.config.mjs'],
  ['root JavaScript outside assets', 'FILE_OUTPUT_LOCATION', 'app.js'],
  ['root CSS outside assets', 'FILE_OUTPUT_LOCATION', 'app.css'],
];

for (const [label, rule, file] of outputPathCases) {
  test(`rejects ${label} through its stable rule`, async () => {
    await withFixture(async (root) => {
      await writeFile(join(root, file), '');
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`PUBLIC_BUILD_SAFE_${rule}`));
    });
  });
}

test('rejects executable permission bits on an otherwise allowed JavaScript asset', async () => {
  await withFixture(async (root) => {
    const file = join(root, 'assets', 'executable.js');
    await writeFile(file, 'console.log("static preview");\n');
    await chmod(file, 0o755);
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /PUBLIC_BUILD_SAFE_FILE_EXECUTABLE/);
  });
});

const originBypassCases = [
  ['W3C suffix origin', 'https://www.w3.org/2000/svg.evil/path'],
  ['W3C query origin', 'https://www.w3.org/2000/svg?next=evil'],
  ['React diagnostic path origin', 'https://react.dev/errors/123'],
  ['React sibling origin', 'https://react.dev/other'],
  ['protocol-relative external origin', '//example.invalid/app.js'],
  ['protocol-relative IPv6 loopback origin', '//[::1]/runtime.js'],
  ['protocol-relative IPv6 origin with port', '//[2001:db8::1]:8443/path'],
  ['protocol-relative IPv4 loopback origin', '//127.0.0.1/runtime.js'],
];

for (const [label, origin] of originBypassCases) {
  test(`rejects ${label} as a non-allowlisted URL token`, async () => {
    await withFixture(async (root) => {
      await writeFile(join(root, 'assets', 'unsafe.js'), `const origin = "${origin}";\n`);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /PUBLIC_BUILD_SAFE_CONTENT_EXTERNAL_ORIGIN/);
    });
  });
}

test('rejects a sibling of the React diagnostic origin', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'unsafe.js'), 'const origin = "https://react.dev/other";\n');
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /PUBLIC_BUILD_SAFE_CONTENT_EXTERNAL_ORIGIN/);
  });
});
