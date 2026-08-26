import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url).pathname;
const guard = join(projectRoot, 'scripts/assert-source-share-safe.mjs');
const fixtureEmail = `person${'@'}example${'.'}com`;
const fixturePhone = ['+33', '6', '12', '34', '56', '78'].join(' ');
const fixturePath = ['', 'Users', 'example'].join('/');
const fixtureAddress = ['0x', '0123456789abcdef0123456789abcdef01234567'].join('');
const fixtureHandle = ['@', 'reviewer'].join('');
const fixtureValue = ['actual', 'value'].join('-');

function runGuard(root) {
  return spawnSync(process.execPath, [guard, root], { encoding: 'utf8' });
}

test('reports stable rule identifiers for controlled unsafe share fixtures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-unsafe-'));
  try {
    await Promise.all([
      mkdir(join(root, 'api'), { recursive: true }),
      mkdir(join(root, '.vercel'), { recursive: true }),
      writeFile(join(root, '.env.preview'), 'VALUE=1\n'),
      writeFile(join(root, '.vercelignore'), 'dist\n'),
      writeFile(join(root, 'api', 'handler.js'), 'export default () => null;\n'),
      writeFile(join(root, 'unsafe.ts'), [
        'const endpoint = "/backend/run";',
        'const events = EventSource;',
        'const preview = "MODEL_PROVIDER_API_KEY PUBLIC_API_URL";',
        'const categoryTerms = "privateKey mnemonic window.ethereum.request signTransaction";',
        `const privacy = "${fixturePath} ${fixtureAddress}";`,
      ].join('\n')),
    ]);

    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    for (const rule of ['PATH_API', 'PATH_ENV', 'PATH_VERCEL', 'CONTENT_BACKEND', 'CONTENT_SENSITIVE', 'CONTENT_PRIVACY']) {
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accepts a controlled safe share fixture', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-safe-'));
  try {
    await writeFile(join(root, 'app.ts'), 'export const label = "Public preview";\n');
    await writeFile(join(root, 'asset.bin'), Buffer.from([0, 1, 2, 255]));

    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accepts a plain network asset label without wallet capability', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-asset-label-safe-'));
  try {
    await writeFile(join(root, 'asset.ts'), 'export const assetName = "Ethereum";\n');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects generic backend, provider credential, and wallet capability markers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-capability-unsafe-'));
  try {
    await writeFile(join(root, 'runtime.ts'), [
      'const backendRoute = "/backend/run";',
      'const providerCredential = "MODEL_PROVIDER_API_KEY";',
      'const walletRequest = window.ethereum.request;',
    ].join('\n'));

    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    for (const rule of ['CONTENT_BACKEND', 'CONTENT_SENSITIVE']) {
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects external runtime, API route, remote font, and PWA fixtures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-runtime-unsafe-'));
  try {
    await writeFile(join(root, 'runtime.ts'), [
      'fetch("https://example.invalid/data");',
      'const route = "/api/preview";',
      'const font = "https://fonts.example.invalid/css";',
      'const pwa = "VitePWA service-worker runtimeCaching";',
    ].join('\n'));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    for (const rule of ['CONTENT_EXTERNAL_RUNTIME', 'CONTENT_API_ROUTE', 'CONTENT_REMOTE_FONT', 'CONTENT_PWA']) {
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const boundaryCases = [
  ['loopback hostname', 'const host = "localhost";', 'CONTENT_BACKEND'],
  ['generic signer capability', 'const capability = "signer";', 'CONTENT_SENSITIVE'],
  ['/api end boundary', 'const route = "/api";', 'CONTENT_API_ROUTE'],
  ['/api route boundary', 'const route = "/api/route";', 'CONTENT_API_ROUTE'],
  ['/api query boundary', 'const route = "/api?x=1";', 'CONTENT_API_ROUTE'],
  ['/api hash boundary', 'const route = "/api#fragment";', 'CONTENT_API_ROUTE'],
  ['protocol-relative resource', 'const resource = "//cdn.example.test/app.js";', 'CONTENT_EXTERNAL_RUNTIME'],
  ['protocol-relative IPv6 loopback resource', 'const resource = "//[::1]/runtime.js";', 'CONTENT_EXTERNAL_RUNTIME'],
  ['protocol-relative IPv6 resource with port', 'const resource = "//[2001:db8::1]:8443/path";', 'CONTENT_EXTERNAL_RUNTIME'],
  ['protocol-relative IPv4 loopback resource', 'const resource = "//127.0.0.1/runtime.js";', 'CONTENT_EXTERNAL_RUNTIME'],
  ['PWA workbox', 'const config = "workbox";', 'CONTENT_PWA'],
  ['PWA generateSW', 'const config = "generateSW";', 'CONTENT_PWA'],
  ['PWA injectManifest', 'const config = "injectManifest";', 'CONTENT_PWA'],
  ['PWA registerRoute', 'const config = "registerRoute";', 'CONTENT_PWA'],
  ['PWA precacheAndRoute', 'const config = "precacheAndRoute";', 'CONTENT_PWA'],
  ['PWA registerSW', 'const config = "registerSW";', 'CONTENT_PWA'],
  ['PWA virtual:pwa', 'const config = "virtual:pwa";', 'CONTENT_PWA'],
  ['PWA serviceWorker', 'const config = "serviceWorker";', 'CONTENT_PWA'],
  ['PWA runtimeCaching', 'const config = "runtimeCaching";', 'CONTENT_PWA'],
  ['PWA VitePWA', 'const config = "VitePWA";', 'CONTENT_PWA'],
  ['network fetch', 'fetch("relative.json");', 'CONTENT_NETWORK_PRIMITIVE'],
  ['network XMLHttpRequest', 'new XMLHttpRequest();', 'CONTENT_NETWORK_PRIMITIVE'],
  ['network WebSocket', 'new WebSocket("socket");', 'CONTENT_NETWORK_PRIMITIVE'],
  ['network EventSource', 'new EventSource("events");', 'CONTENT_NETWORK_PRIMITIVE'],
  ['network sendBeacon', 'navigator.sendBeacon("beacon");', 'CONTENT_NETWORK_PRIMITIVE'],
];

for (const [label, source, rule] of boundaryCases) {
  test(`rejects ${label} in an isolated fixture`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-boundary-unsafe-'));
    try {
      await writeFile(join(root, 'boundary.ts'), source);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('accepts an ordinary source comment', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-comment-safe-'));
  try {
    await writeFile(join(root, 'comment.ts'), '// comment\nconst path = "./preview-data";\n');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accepts harmless comments, relative paths, and local SVG namespaces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-boundary-safe-'));
  try {
    await Promise.all([
      writeFile(join(root, 'safe.ts'), '// ordinary comment\nconst path = "./preview-data";\n'),
      writeFile(join(root, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>\n'),
    ]);
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const privacyCases = [
  ['personal email with a dotted domain', `const contact = "${fixtureEmail}";`, 'CONTENT_PRIVACY_EMAIL'],
  ['international-format phone number', `const contact = "${fixturePhone}";`, 'CONTENT_PRIVACY_PHONE'],
];

for (const [label, source, rule] of privacyCases) {
  test(`rejects ${label} in an isolated fixture`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-privacy-unsafe-'));
    try {
      await writeFile(join(root, 'privacy.ts'), source);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('rejects personal email embedded in binary metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-binary-privacy-unsafe-'));
  try {
    await writeFile(join(root, 'brand.bin'), Buffer.concat([
      Buffer.from([0, 255, 0, 127]),
      Buffer.from(`metadata ${fixtureEmail}`),
      Buffer.from([0, 1, 2]),
    ]));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_PRIVACY_EMAIL/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a symlink without following a local-user target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-symlink-unsafe-'));
  try {
    await symlink(`${fixturePath}/private.txt`, join(root, 'linked.txt'));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_PATH_SYMLINK/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const emptyPwaArtifactCases = ['service-worker.js', 'workbox-runtime.js', 'registerSW.js', 'manifest.json'];

for (const file of emptyPwaArtifactCases) {
  test(`rejects empty ${file} source artifact by path`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-pwa-path-unsafe-'));
    try {
      await writeFile(join(root, file), '');
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_PATH_PWA/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

const repositoryWideCases = [
  ['provenance hostname in a script', 'scripts/check.mjs', ['claude', '.ai'].join(''), 'CONTENT_PROVENANCE'],
  ['provenance phrase in a test', 'tests/check.test.mjs', ['Exact', ' port'].join(''), 'CONTENT_PROVENANCE'],
  ['personal greeting in a script', 'scripts/greeting.mjs', ['Hi', ', Jordan'].join(''), 'CONTENT_IDENTITY_NAME'],
  ['non-generic handle in a test', 'tests/handle.test.mjs', `"${['@', 'reviewer'].join('')}"`, 'CONTENT_IDENTITY_HANDLE'],
  ['secret assignment in a script', 'scripts/secret.mjs', `${['SERVICE', 'SECRET'].join('_')} = "${fixtureValue}"`, 'CONTENT_SECRET_VALUE'],
  ['email in a script', 'scripts/email.mjs', fixtureEmail, 'CONTENT_PRIVACY_EMAIL'],
  ['path in a test', 'tests/path.test.mjs', fixturePath, 'CONTENT_PRIVACY_PATH'],
];

for (const [label, file, value, rule] of repositoryWideCases) {
  test(`rejects ${label} repository-wide`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-repository-wide-'));
    try {
      await mkdir(join(root, file.split('/')[0]), { recursive: true });
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('rejects binary metadata in tests directory repository-wide', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-test-binary-'));
  try {
    await mkdir(join(root, 'tests'));
    await writeFile(join(root, 'tests', 'brand.bin'), Buffer.concat([Buffer.from([0, 255]), Buffer.from(fixtureEmail)]));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_PRIVACY_EMAIL/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('accepts brand and generic handles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-safe-handles-'));
  try {
    await writeFile(join(root, 'safe.ts'), 'const handles = ["@prism", "@creator"];');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects executable script mode', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-executable-'));
  try {
    const file = join(root, 'script.mjs');
    await writeFile(file, 'export {};');
    await chmod(file, 0o755);
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_PATH_EXECUTABLE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects a non-regular FIFO entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-fifo-'));
  try {
    const fifo = join(root, 'stream.pipe');
    const created = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
    assert.equal(created.status, 0, created.stderr);
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_PATH_NON_REGULAR/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const nestedPrivacyCases = [
  ['nested dist directory', 'src/dist/private.ts', fixtureEmail, 'CONTENT_PRIVACY_EMAIL'],
  ['nested node_modules directory', 'scripts/node_modules/private.mjs', fixturePath, 'CONTENT_PRIVACY_PATH'],
  ['nested superpowers directory', 'src/.superpowers/private.ts', fixtureEmail, 'CONTENT_PRIVACY_EMAIL'],
  ['nested git directory', 'src/.git/private.ts', fixtureEmail, 'CONTENT_PRIVACY_EMAIL'],
];

for (const [label, file, value, rule] of nestedPrivacyCases) {
  test(`rejects ${label} contents rather than skipping them`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-nested-ignore-'));
    try {
      await mkdir(join(root, file.split('/').slice(0, -1).join('/')), { recursive: true });
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

const handleCases = [
  ['JSX handle', `<span>${fixtureHandle}</span>`],
  ['plain-copy handle', `Built by ${fixtureHandle}`],
  ['JSON handle', `{"owner":"${fixtureHandle}"}`],
  ['quoted JavaScript handle', `const owner = "${fixtureHandle}";`],
];

for (const [label, value] of handleCases) {
  test(`rejects ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-handle-'));
    try {
      await writeFile(join(root, 'copy.txt'), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_IDENTITY_HANDLE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test('accepts brand and generic handles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-handle-safe-'));
  try {
    await writeFile(join(root, 'safe.txt'), '"@prism" "@creator"');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const unsafeValueCases = [
  ['JSON secret', `{"${['SERVICE', 'SECRET'].join('_')}":"${fixtureValue}"}`],
  ['camel secret', `const ${['service', 'Secret'].join('')} = "${fixtureValue}";`],
  ['snake secret', `${['service', 'secret'].join('_')}: ${fixtureValue}`],
  ['kebab secret', `${['service', 'secret'].join('-')}: ${fixtureValue}`],
  ['private key', `const ${['private', 'Key'].join('')} = "${fixtureValue}";`],
  ['API key', `const ${['api', 'Key'].join('')} = "${fixtureValue}";`],
  ['access token', `const ${['access', 'Token'].join('')} = "${fixtureValue}";`],
  ['password', ['password', ': ', fixtureValue].join('')],
  ['mnemonic', ['mnemonic', ': ', fixtureValue].join('')],
];

for (const [label, value] of unsafeValueCases) {
  test(`rejects ${label} value`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-secret-value-'));
    try {
      await writeFile(join(root, 'config.txt'), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

const handleSyntaxCases = [
  ['Markdown table handle', `|${fixtureHandle}|`],
  ['profile path handle', `Built by ${fixtureHandle}/profile`],
  ['brand profile path handle', `Built by ${['@', 'prism'].join('')}/profile`],
  ['JSON profile path handle', `{"owner":"${fixtureHandle}/profile"}`],
  ['HTML profile path handle', `<span>${fixtureHandle}/profile</span>`],
];

for (const [label, value] of handleSyntaxCases) {
  test(`rejects ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-handle-syntax-'));
    try {
      await writeFile(join(root, 'copy.md'), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_IDENTITY_HANDLE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test('accepts scoped imports, package dependencies, and CSS at-rules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-handle-context-safe-'));
  try {
    const packageScope = ['@', 'types/node'].join('');
    const cssAtRule = ['@', 'media screen { .card { color: white; } }'].join('');
    await Promise.all([
      writeFile(join(root, 'module.ts'), ['import type { Node } from "', packageScope, '";'].join('')),
      writeFile(join(root, 'package.json'), ['{"dependencies":{"', packageScope, '":"1.0.0"}}'].join('')),
      writeFile(join(root, 'safe.css'), cssAtRule),
    ]);
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const syntaxCases = [
  ['GitHub token', `${['GITHUB', 'TOKEN'].join('_')}: ${fixtureValue}`],
  ['API token', `${['api', 'token'].join('_')}: ${fixtureValue}`],
  ['literal block password', ['password', ': |', '\n  ', fixtureValue].join('')],
  ['block password', ['password', ': |-', '\n  ', fixtureValue].join('')],
  ['folded block password', ['password', ': >', '\n  ', fixtureValue].join('')],
  ['chomped folded block password', ['password', ': >-', '\n  ', fixtureValue].join('')],
  ['underscore password', ['password', ': _', fixtureValue].join('')],
  ['slash-prefix password', ['password', ': /', fixtureValue, '/'].join('')],
  ['access key', `const ${['access', 'Key'].join('')} = "${fixtureValue}";`],
  ['credential', `credential: ${fixtureValue}`],
  ['passwd', ['passwd', ': ', fixtureValue].join('')],
  ['private key', `${['PRIVATE', 'KEY'].join('_')}: ${fixtureValue}`],
  ['API key', `${['API', 'KEY'].join('_')}: ${fixtureValue}`],
  ['access key', `${['ACCESS', 'KEY'].join('_')}: ${fixtureValue}`],
];

for (const [label, value] of syntaxCases) {
  test(`rejects ${label} syntax`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-credential-syntax-'));
    try {
      await writeFile(join(root, 'config.txt'), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test('accepts credential references without assigned values', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-credential-safe-'));
  try {
    await writeFile(join(root, 'types.ts'), [
      'const secretRule = /value/;',
      'const tokenCases = [];',
      'type CredentialShape = {',
      '  password: string;',
      '};',
      '// A credential name can appear in documentation.',
    ].join('\n'));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const parserFixtures = {
  pass: ['pass', 'word'].join(''),
  api: ['API', 'KEY'].join('_'),
  service: ['SERVICE', 'SECRET'].join('_'),
  embedded: ['auth', 'Token', 'Value'].join(''),
  aws: ['AWS', 'ACCESS', 'KEY', 'ID'].join('_'),
  plural: ['credential', 's'].join(''),
  scoped: ['@', 'scope/pkg'].join(''),
  media: ['@', 'media'].join(''),
  prism: ['@', 'prism'].join(''),
  creator: ['@', 'creator'].join(''),
  reviewer: ['@', 'reviewer'].join(''),
  tick: String.fromCharCode(96),
};

function fixtureMap(key, value) {
  return Object.fromEntries([[key, value]]);
}

const contextualCases = [
  ['JSON second property', 'config.json', JSON.stringify(Object.assign({ name: 'safe' }, fixtureMap(parserFixtures.pass, fixtureValue)))],
  ['nested JSON array property', 'config.json', JSON.stringify([{ options: fixtureMap(parserFixtures.pass, fixtureValue) }])],
  ['JavaScript object second property', 'config.js', ['const values = { label: "safe", ', parserFixtures.pass, ': "', fixtureValue, '" };'].join('')],
  ['JavaScript multiline object property', 'config.js', ['const values = {', '\n  label: "safe",', '\n  ', parserFixtures.pass, ': "', fixtureValue, '",', '\n};'].join('')],
  ['exported JavaScript declaration', 'config.mjs', ['export const ', parserFixtures.service, ' = "', fixtureValue, '";'].join('')],
  ['member assignment', 'config.ts', ['config.', parserFixtures.pass, ' = "', fixtureValue, '";'].join('')],
  ['YAML sequence assignment', 'config.yaml', ['- ', parserFixtures.api, ': ', fixtureValue].join('')],
  ['YAML sequence block scalar', 'config.yml', ['- ', parserFixtures.pass, ': |-', '\n  ', fixtureValue].join('')],
  ['YAML type-looking scalar', 'config.yaml', [parserFixtures.pass, ': string'].join('')],
  ['regular-expression declaration', 'config.ts', ['const ', parserFixtures.pass, ' = /', fixtureValue, '/;'].join('')],
  ['embedded token family', 'config.txt', [parserFixtures.embedded, ': ', fixtureValue].join('')],
  ['AWS access-key identifier', 'config.txt', [parserFixtures.aws, ': ', fixtureValue].join('')],
  ['plural credentials identifier', 'config.json', JSON.stringify(fixtureMap(parserFixtures.plural, fixtureValue))],
];

for (const [label, file, value] of contextualCases) {
  test(`rejects contextual ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-contextual-credential-'));
    try {
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

const scriptValueCases = [
  ['quoted declaration', ['const ', parserFixtures.pass, ' = "', fixtureValue, '";'].join('')],
  ['template declaration', ['const ', parserFixtures.pass, ' = ', parserFixtures.tick, fixtureValue, parserFixtures.tick, ';'].join('')],
  ['unquoted declaration', ['const ', parserFixtures.pass, ' = actualValue;'].join('')],
  ['object value', ['const record = { ', parserFixtures.pass, ': { nested: true } };'].join('')],
  ['array value', ['const record = { ', parserFixtures.pass, ': [actualValue] };'].join('')],
];

for (const [label, value] of scriptValueCases) {
  test(`rejects a script credential ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-script-value-'));
    try {
      await writeFile(join(root, 'config.ts'), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

const contextualSafeCases = [
  ['TypeScript type annotation', 'types.ts', ['type Options = { ', parserFixtures.pass, ': string | undefined; };'].join('')],
  ['Markdown prose', 'notes.md', [[parserFixtures.pass[0].toUpperCase(), parserFixtures.pass.slice(1)].join(''), ': supplied by the reviewer.'].join('')],
  ['package dependency name', 'package.json', JSON.stringify({ dependencies: fixtureMap(parserFixtures.plural, '1.0.0') })],
  ['helper names and pattern definition', 'helpers.ts', [
    ['const secret', 'Rule = /value/;'].join(''),
    ['const token', 'Cases = [];'].join(''),
    ['const ', parserFixtures.pass, 'Pattern = /value/;'].join(''),
  ].join('\n')],
];

for (const [label, file, value] of contextualSafeCases) {
  test(`accepts contextual ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-contextual-safe-'));
    try {
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test('rejects fenced YAML credentials while allowing surrounding Markdown prose', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-fenced-credential-'));
  try {
    await writeFile(join(root, 'notes.md'), [
      [[parserFixtures.pass[0].toUpperCase(), parserFixtures.pass.slice(1)].join(''), ': supplied by the reviewer.'].join(''),
      '```yaml',
      [parserFixtures.pass, ': ', fixtureValue].join(''),
      '```',
    ].join('\n'));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const contextualHandleUnsafeCases = [
  ['CSS at-rule name in JSON value', 'copy.json', JSON.stringify({ owner: parserFixtures.media })],
  ['scoped package in prose', 'copy.txt', `Built by ${parserFixtures.scoped}`],
  ['profile path in Markdown', 'copy.md', `Built by ${parserFixtures.reviewer}/profile`],
  ['profile path in JSON', 'copy.json', JSON.stringify({ owner: `${parserFixtures.reviewer}/profile` })],
];

for (const [label, file, value] of contextualHandleUnsafeCases) {
  test(`rejects contextual ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-contextual-handle-'));
    try {
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_IDENTITY_HANDLE/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

const contextualHandleSafeCases = [
  ['exact prism handle in prose', 'copy.txt', `Follow ${parserFixtures.prism}.`],
  ['exact creator handle in JSON', 'copy.json', JSON.stringify({ owner: parserFixtures.creator })],
  ['CSS at-rule in CSS syntax', 'styles.css', `${parserFixtures.media} screen { .card { color: white; } }`],
  ['CSS at-rule in an inline style template', 'component.tsx', ['export const Component = () => <style>{`', parserFixtures.media, ' screen {}`}</style>;'].join('')],
  ['multiline static import', 'module.ts', ['import {', '\n  safe,', '\n} from "', parserFixtures.scoped, '";'].join('')],
  ['side-effect import', 'module.ts', ['import "', parserFixtures.scoped, '";'].join('')],
  ['dynamic import', 'module.ts', ['const load = import("', parserFixtures.scoped, '");'].join('')],
  ['package dependency key', 'package.json', JSON.stringify({ dependencies: fixtureMap(parserFixtures.scoped, '1.0.0') })],
  ['package-lock dependency key', 'package-lock.json', JSON.stringify({
    name: 'fixture',
    lockfileVersion: 3,
    packages: Object.assign(
      { '': { dependencies: fixtureMap(parserFixtures.scoped, '1.0.0') } },
      fixtureMap(`node_modules/${parserFixtures.scoped}`, { version: '1.0.0' }),
    ),
  })],
];

for (const [label, file, value] of contextualHandleSafeCases) {
  test(`accepts contextual ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-source-contextual-handle-safe-'));
    try {
      await writeFile(join(root, file), value);
      const result = runGuard(root);
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test('accepts a scoped package in fenced JavaScript', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-fenced-handle-safe-'));
  try {
    await writeFile(join(root, 'notes.md'), [
      '```js',
      ['import "', parserFixtures.scoped, '";'].join(''),
      '```',
    ].join('\n'));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function assertNewBoundaryRejection(file, content, rule) {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-new-boundary-'));
  try {
    await writeFile(join(root, file), content);
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, new RegExp(`SOURCE_SHARE_SAFE_${rule}`));
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('rejects a YAML flow mapping credential value', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['{ ', parserFixtures.pass, ': ', fixtureValue, ' }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a YAML sequence flow mapping credential value', async () => {
  await assertNewBoundaryRejection(
    'config.yml',
    ['- { ', parserFixtures.pass, ': ', fixtureValue, ' }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a tilde-fenced YAML credential value', async () => {
  const fence = '~'.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), [parserFixtures.pass, ': ', fixtureValue].join(''), fence].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a three-space-indented backtick-fenced YAML credential value', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['   ', fence, 'yaml'].join(''), [parserFixtures.pass, ': ', fixtureValue].join(''), ['   ', fence].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a three-space-indented tilde-fenced YAML credential value', async () => {
  const fence = '~'.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['   ', fence, 'yaml'].join(''), [parserFixtures.pass, ': ', fixtureValue].join(''), ['   ', fence].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a computed script property credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const record = { ["', parserFixtures.pass, '"]: "', fixtureValue, '" };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a comment-separated script property credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const record = { ', parserFixtures.pass, ' /*x*/: "', fixtureValue, '" };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a destructuring default credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const { ', parserFixtures.pass, ' = "', fixtureValue, '" } = {};'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a static field credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['class C { static ', parserFixtures.pass, ' = "', fixtureValue, '"; }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a rule-suffixed credential key with an actual value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const ', ['secret', 'Rule'].join(''), ' = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a plural token key with an actual array value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const ', ['auth', 'Tokens'].join(''), ' = ["', fixtureValue, '"];'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a URL-token key with an actual value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const ', ['url', 'Token'].join(''), ' = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a function parameter object type annotation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-type-annotation-'));
  try {
    await writeFile(join(root, 'types.ts'), ['function use(o: { ', parserFixtures.pass, ': string }): void {}'].join(''));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('accepts a multiline function parameter object type annotation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-multiline-type-annotation-'));
  try {
    await writeFile(join(root, 'types.ts'), [
      'function use(',
      ['  option: { ', parserFixtures.pass, ': string }'].join(''),
      '): void {}',
    ].join('\n'));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('accepts a declared class type annotation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-declare-class-'));
  try {
    await writeFile(join(root, 'types.ts'), ['declare class O { ', parserFixtures.pass, ': string; }'].join(''));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects a brand-like JSON handle with a dot suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.json',
    JSON.stringify({ owner: `${parserFixtures.prism}.person` }),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a brand-like Markdown handle with a dot suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, '.person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a comment-laundered scoped package string', async () => {
  await assertNewBoundaryRejection(
    'copy.ts',
    ['// import', '"', parserFixtures.reviewer, '/profile";'].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a JavaScript template after a literal style-looking string', async () => {
  await assertNewBoundaryRejection(
    'copy.ts',
    ['const note = "<style>";', 'const owner = ', parserFixtures.tick, parserFixtures.media, ' screen {}', parserFixtures.tick, ';'].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a JavaScript template after a template style-looking string', async () => {
  await assertNewBoundaryRejection(
    'copy.ts',
    ['const note = ', parserFixtures.tick, '<style>', parserFixtures.tick, ';', 'const owner = ', parserFixtures.tick, parserFixtures.media, ' screen {}', parserFixtures.tick, ';'].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts an at-rule in a structurally embedded inline CSS template', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-inline-css-'));
  try {
    await writeFile(join(root, 'component.tsx'), ['export const Component = () => <style>{', parserFixtures.tick, parserFixtures.media, ' screen {}', parserFixtures.tick, '}</style>;'].join(''));
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function assertNewBoundaryAcceptance(file, content) {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-new-safe-boundary-'));
  try {
    await writeFile(join(root, file), content);
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('rejects a nested YAML credential mapping', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    [parserFixtures.pass + ':', '  inner: ' + fixtureValue].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an explicit-key YAML credential mapping', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['? ', parserFixtures.pass, '\n: ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a nested YAML credential sequence', async () => {
  await assertNewBoundaryRejection(
    'config.yml',
    [parserFixtures.pass + ':', '  - ' + fixtureValue].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a nested YAML credential map value', async () => {
  await assertNewBoundaryRejection(
    'config.yml',
    [parserFixtures.pass + ':', '  inner:', '    value: ' + fixtureValue].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an unclosed typed Markdown fence through EOF', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), [parserFixtures.pass, ': ', fixtureValue].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a blockquoted typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['> ', fence, 'yaml'].join(''), ['> ', parserFixtures.pass, ': ', fixtureValue].join(''), ['> ', fence].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a list-contained typed Markdown fence', async () => {
  const fence = '~'.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    ['- configuration', ['  ', fence, 'yaml'].join(''), ['  ', parserFixtures.pass, ': ', fixtureValue].join(''), ['  ', fence].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an instance field credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['class C { ', parserFixtures.pass, ' = "', fixtureValue, '"; }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an access-modified field credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['class C { private ', parserFixtures.pass, ' = "', fixtureValue, '"; }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a hash-private field credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['class C { #', parserFixtures.pass, ' = "', fixtureValue, '"; }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a later comma declaration credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const safe = 1, ', parserFixtures.pass, ' = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a later destructuring default credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const { safe, ', parserFixtures.pass, ' = "', fixtureValue, '" } = input;'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a function-parameter destructuring default credential value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function f({ ', parserFixtures.pass, ' = "', fixtureValue, '" }) {}'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a leading-comment object credential property', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const record = { /*x*/ ', parserFixtures.pass, ': "', fixtureValue, '" };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a computed template member credential assignment', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config[', parserFixtures.tick, parserFixtures.pass, parserFixtures.tick, '] = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential object property inside template interpolation', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const message = ', parserFixtures.tick, 'x: ${({ ', parserFixtures.pass, ': "', fixtureValue, '" })}', parserFixtures.tick, ';'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a template-interpolation credential after a regular expression', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const message = ', parserFixtures.tick, 'x: ${/}/.test("}") && ({ ', parserFixtures.pass, ': "', fixtureValue, '" })}', parserFixtures.tick, ';'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a TypeScript return object type annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['function make(): { ', parserFixtures.pass, ': string } { return {}; }'].join(''),
  );
});

test('accepts a TypeScript variable object type annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const options: { ', parserFixtures.pass, ': string } = {};'].join(''),
  );
});

test('accepts a multiline TypeScript union object alias', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['type Choice =', ['  | { ', parserFixtures.pass, ': string }'].join(''), '  | { label: string };'].join('\n'),
  );
});

test('accepts an interface with its brace on the next line', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['interface Shape', '{', ['  ', parserFixtures.pass, ': string;'].join(''), '}'].join('\n'),
  );
});

test('accepts a declared generic class with an access-modified type field', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['declare abstract class Box<T> {', ['  private ', parserFixtures.pass, ': T;'].join(''), '}'].join('\n'),
  );
});

test('rejects a member-shaped require call as a package context', async () => {
  await assertNewBoundaryRejection(
    'copy.cjs',
    ['obj.require("', parserFixtures.scoped, '");'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a member-shaped import call as a package context', async () => {
  await assertNewBoundaryRejection(
    'copy.js',
    ['obj.import("', parserFixtures.scoped, '");'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts a comment-separated side-effect import', async () => {
  await assertNewBoundaryAcceptance(
    'module.ts',
    ['import /* fixture */ "', parserFixtures.scoped, '";'].join(''),
  );
});

test('rejects an at-rule-looking token inside a CSS string', async () => {
  await assertNewBoundaryRejection(
    'styles.css',
    ['.card::before { content: "', parserFixtures.media, ' reviewer"; }'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an at-rule-looking token inside a CSS comment', async () => {
  await assertNewBoundaryRejection(
    'styles.css',
    ['/* ', parserFixtures.media, ' reviewer */'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts an actual at-rule inside fenced CSS', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [[fence, 'css'].join(''), [parserFixtures.media, ' screen { .card {} }'].join(''), fence].join('\n'),
  );
});

test('rejects the first nonempty duplicate JSON credential key', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"', parserFixtures.pass, '":"', fixtureValue, '","', parserFixtures.pass, '":""}'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a later credential property in malformed JSON', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"name":"safe","', parserFixtures.pass, '":"', fixtureValue, '",'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential field below package-lock packages metadata', async () => {
  await assertNewBoundaryRejection(
    'package-lock.json',
    JSON.stringify({ packages: fixtureMap(parserFixtures.pass, fixtureValue) }),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts package-lock package paths and dependency keys', async () => {
  await assertNewBoundaryAcceptance(
    'package-lock.json',
    JSON.stringify({
      name: 'fixture',
      lockfileVersion: 3,
      packages: fixtureMap(`node_modules/${parserFixtures.scoped}`, { version: '1.0.0' }),
      dependencies: fixtureMap(parserFixtures.scoped, '1.0.0'),
    }),
  );
});

test('rejects a doubled-dot brand handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.prism, '..person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an encoded-dot brand handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, '%2Eperson'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a Unicode-dot brand handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.prism, String.fromCodePoint(0xff0e), 'person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a zero-width brand handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, String.fromCodePoint(0x200b), 'person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('does not let an unterminated type alias hide a runtime credential assignment', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['type Shape = { ', parserFixtures.pass, ': string }', 'const ', parserFixtures.pass, ' = "', fixtureValue, '"'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('does not let a declare statement mask a later runtime credential assignment', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['declare const marker: string;', 'const ', parserFixtures.pass, ' = "', fixtureValue, '";', 'class Later {}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('reports an unterminated script string instead of hiding a later assignment', async () => {
  await assertNewBoundaryRejection(
    'broken.ts',
    ['const note = "unfinished', 'const ', parserFixtures.pass, ' = "', fixtureValue, '";'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports an unterminated script comment instead of hiding a later assignment', async () => {
  await assertNewBoundaryRejection(
    'broken.ts',
    ['/* unfinished', 'const ', parserFixtures.pass, ' = "', fixtureValue, '";'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports an unterminated script regular expression instead of hiding a later assignment', async () => {
  await assertNewBoundaryRejection(
    'broken.ts',
    ['const matcher = /unfinished', 'const ', parserFixtures.pass, ' = "', fixtureValue, '";'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports a malformed import string instead of allowing its scoped handle', async () => {
  await assertNewBoundaryRejection(
    'broken.ts',
    ['import "', parserFixtures.reviewer, '/pkg'].join(''),
    'CONTENT_PARSE_ERROR',
  );
});

test('rejects a logical-or credential assignment', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config.', parserFixtures.pass, ' ||= "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a nullish credential assignment', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config.', parserFixtures.pass, ' ??= "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a compound credential assignment', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config.', parserFixtures.pass, ' += "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a static interpolated-template computed credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config[', parserFixtures.tick, 'pass${"word"}', parserFixtures.tick, '] = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an optional-chain require member as a scoped package context', async () => {
  await assertNewBoundaryRejection(
    'copy.ts',
    ['loader?.require("', parserFixtures.reviewer, '/pkg");'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a colon-qualified prism handle', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.prism, ':person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a doubled-at prism handle', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow @', parserFixtures.prism].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an accented creator handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, String.fromCodePoint(0xe9), 'person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a combining-mark creator handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, String.fromCodePoint(0x301), 'person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a Unicode-slash creator handle suffix', async () => {
  await assertNewBoundaryRejection(
    'copy.md',
    ['Follow ', parserFixtures.creator, String.fromCodePoint(0x2215), 'person'].join(''),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a credential field below a nested dependency section', async () => {
  await assertNewBoundaryRejection(
    'package.json',
    JSON.stringify({ config: { dependencies: fixtureMap(parserFixtures.pass, fixtureValue) } }),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a scoped package below a nested dependency section', async () => {
  await assertNewBoundaryRejection(
    'package.json',
    JSON.stringify({ config: { dependencies: fixtureMap(`${parserFixtures.reviewer}/pkg`, '1.0.0') } }),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an arbitrary node-modules scoped key outside package-lock schema', async () => {
  await assertNewBoundaryRejection(
    'package-lock.json',
    JSON.stringify({ config: fixtureMap(`node_modules/${parserFixtures.reviewer}/pkg`, '1.0.0') }),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an arbitrary node-modules scoped value outside package-lock schema', async () => {
  await assertNewBoundaryRejection(
    'package-lock.json',
    JSON.stringify({ config: { location: `node_modules/${parserFixtures.reviewer}/pkg` } }),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('does not let a package dependency key allow the same scope in a script', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-package-script-context-'));
  try {
    await Promise.all([
      writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: fixtureMap(parserFixtures.scoped, '1.0.0') })),
      writeFile(join(root, 'copy.ts'), ['const label = "', parserFixtures.scoped, '";'].join('')),
    ]);
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_IDENTITY_HANDLE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects trailing JSON content containing a credential object', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-json-trailing-'));
  try {
    await writeFile(join(root, 'config.json'), ['{}{"', parserFixtures.pass, '":"', fixtureValue, '"}'].join(''));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_PARSE_ERROR/);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects a quoted YAML key containing a colon and credential family', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['"api:token": ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a nested YAML flow credential mapping', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['{ outer: { ', parserFixtures.pass, ': ', fixtureValue, ' } }'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an indentationless YAML sequence below a credential key', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    [parserFixtures.pass + ':', '- ' + fixtureValue].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a tagged YAML credential key', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['!!str ', parserFixtures.pass, ': ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a decoded quoted YAML credential key', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['"pass\\u0077ord": ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an anchored YAML credential value', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    [parserFixtures.pass, ': &saved ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a YAML alias beneath a credential key', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    [parserFixtures.pass + ':', '  - *saved'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a generic-constraint TypeScript shape', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['type Box<T extends { ', parserFixtures.pass, ': string }> = T;'].join(''),
  );
});

test('accepts an arrow TypeScript return shape', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const make = (): { ', parserFixtures.pass, ': string } => ({});'].join(''),
  );
});

test('accepts nested generic TypeScript parameter and return shapes', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['function use<T extends { ', parserFixtures.pass, ': string }>(item: Array<{ ', parserFixtures.pass, ': string }>): Promise<{ ', parserFixtures.pass, ': string }> { return Promise.resolve({}); }'].join(''),
  );
});

test('accepts a TypeScript as type assertion shape', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const shape = {} as { ', parserFixtures.pass, ': string };'].join(''),
  );
});

test('accepts a TypeScript satisfies shape', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const shape = {} satisfies { ', parserFixtures.pass, ': string };'].join(''),
  );
});

test('accepts conditional and mapped TypeScript credential-shaped properties', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['type Shape<T> = T extends string ? { [K in "', parserFixtures.pass, '"]: string } : { ', parserFixtures.pass, ': string };'].join(''),
  );
});

test('rejects a malformed backtick Markdown fence before it assigns CSS context', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'css', parserFixtures.tick].join(''), [parserFixtures.media, ' screen {}'].join(''), fence].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('does not classify an unrecognized tilde-fence info string as CSS', async () => {
  const fence = '~'.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'css', '~'].join(''), [parserFixtures.media, ' screen {}'].join(''), fence].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts a CSS at-rule separated by a valid CSS comment', async () => {
  await assertNewBoundaryAcceptance(
    'styles.css',
    [parserFixtures.media, '/**/ screen { .card {} }'].join(''),
  );
});

test('rejects a runtime credential after a semicolonless type alias', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['type Shape = { ', parserFixtures.pass, ': string }', parserFixtures.pass, ' = "', fixtureValue, '"'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a runtime credential beside an object property named type', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const record = { type: "profile", ', parserFixtures.pass, ': "', fixtureValue, '" };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a runtime credential beneath an object property named as', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const record = { as: { ', parserFixtures.pass, ': "', fixtureValue, '" } };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a concatenated static computed credential member', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config["pass" + "word"] = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a parenthesized concatenated static computed credential member', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['config[(("pass") + ("word"))] = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('fails closed for a dynamic computed member with an assigned value', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const suffix = "dynamic";', 'config["pass" + suffix] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('fails closed for a dynamic template computed member with a credential fragment', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const suffix = "dynamic";', 'config[', parserFixtures.tick, 'pass${suffix}', parserFixtures.tick, '] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts ordinary TypeScript credential-shaped type declarations', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    [
      ['function use(', parserFixtures.pass, ': string): void {}'].join(''),
      ['class C { readonly ', parserFixtures.pass, '?: string; constructor(public ', parserFixtures.pass, ': string) {} }'].join(''),
      ['let ', parserFixtures.pass, ': string;'].join(''),
      ['interface Box { readonly ', parserFixtures.pass, '?: string }'].join(''),
    ].join('\n'),
  );
});

test('rejects a typed runtime credential initializer', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['let ', parserFixtures.pass, ': string = "', fixtureValue, '";'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

const invalidJsonEscape = ['\\', 'q'].join('');

test('reports an invalid JSON escape before metadata exemptions', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"label":"bad', invalidJsonEscape, '"}'].join(''),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports an unescaped JSON newline', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"label":"first', 'second"}'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports an unescaped JSON control character', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"label":"first', String.fromCharCode(1), 'second"}'].join(''),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports a trailing JSON object comma', async () => {
  await assertNewBoundaryRejection('config.json', '{"label":"safe",}', 'CONTENT_PARSE_ERROR');
});

test('reports a trailing JSON array comma', async () => {
  await assertNewBoundaryRejection('config.json', '["safe",]', 'CONTENT_PARSE_ERROR');
});

test('accepts valid escaped JSON strings', async () => {
  await assertNewBoundaryAcceptance(
    'config.json',
    ['{"label":"line', ['\\', 'n'].join(''), 'quote', ['\\', 'u0021'].join(''), '"}'].join(''),
  );
});

test('does not exempt a malformed dependency credential value', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prism-source-malformed-package-'));
  try {
    await writeFile(join(root, 'package.json'), ['{"dependencies":{"', parserFixtures.pass, '":"', fixtureValue, '",},}'].join(''));
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_PARSE_ERROR/);
    assert.match(`${result.stdout}${result.stderr}`, /SOURCE_SHARE_SAFE_CONTENT_SECRET_VALUE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rejects a scoped handle passed through a shadowed require binding', async () => {
  await assertNewBoundaryRejection(
    'module.cjs',
    ['const require = () => undefined;', 'require("', parserFixtures.reviewer, '/pkg");'].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a blockquote fence whose CSS body leaves its container', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['> ', fence, 'css'].join(''), [parserFixtures.media, ' screen {}'].join(''), ['> ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a list fence whose CSS body leaves its container', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['- ', fence, 'css'].join(''), [parserFixtures.media, ' screen {}'].join(''), ['- ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts a blockquoted CSS fence whose body stays in its container', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['> ', fence, 'css'].join(''), ['> ', parserFixtures.media, ' screen {}'].join(''), ['> ', fence].join('')].join('\n'),
  );
});

test('accepts CommonMark CSS fence info with trailing attributes', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [[fence, 'css title=demo'].join(''), [parserFixtures.media, ' screen {}'].join(''), fence].join('\n'),
  );
});

test('rejects a runtime call named as with a credential object', async () => {
  await assertNewBoundaryRejection(
    'runtime.ts',
    ['as({ ', parserFixtures.pass, ': "', fixtureValue, '" });'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a runtime call named type with a credential object', async () => {
  await assertNewBoundaryRejection(
    'runtime.ts',
    ['type({ ', parserFixtures.pass, ': "', fixtureValue, '" });'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a runtime assignment through an identifier named type', async () => {
  await assertNewBoundaryRejection(
    'runtime.ts',
    ['let type;', 'type = { ', parserFixtures.pass, ': "', fixtureValue, '" };'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an arrow-function TypeScript parameter annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const render = (', parserFixtures.pass, ': string) => undefined;'].join(''),
  );
});

test('accepts an anonymous function-expression TypeScript parameter annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const render = function(', parserFixtures.pass, ': string) { return undefined; };'].join(''),
  );
});

test('accepts an object-method TypeScript parameter annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const record = { render(', parserFixtures.pass, ': string) { return undefined; } };'].join(''),
  );
});

test('accepts a class-expression TypeScript field annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const View = class { ', parserFixtures.pass, ': string; };'].join(''),
  );
});

test('accepts constructor and callback TypeScript parameter annotations', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    [
      ['const View = class { constructor(', parserFixtures.pass, ': string) {} };'].join(''),
      ['invoke((', parserFixtures.pass, ': string) => undefined);'].join(''),
    ].join('\n'),
  );
});

test('rejects a typed arrow parameter default with an actual value', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['const render = (', parserFixtures.pass, ': string = "', fixtureValue, '") => undefined;'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a const-bound computed credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects pure const concatenation for a computed credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const left = "pass";', 'const right = "word";', 'config[left + right] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a shadowed const credential key in its local scope', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "label";', '{', '  const key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a noncredential const key that shadows a credential-shaped outer key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', '{', '  const key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('fails closed after reassignment of a credential-shaped const key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'key = "label";', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a noncredential const key in a computed member', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "label";', 'config[key] = "', fixtureValue, '";'].join('\n'),
  );
});

test('accepts a list-continuation CSS fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['- ', fence, 'css'].join(''), ['  ', parserFixtures.media, ' screen {}'].join(''), ['  ', fence].join('')].join('\n'),
  );
});

test('accepts a blockquote CSS fence with optional marker spacing', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['>', fence, 'css'].join(''), ['> ', parserFixtures.media, ' screen {}'].join(''), ['>', fence].join('')].join('\n'),
  );
});

test('accepts a nested list-blockquote CSS fence continuation', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['> - ', fence, 'css'].join(''), ['>   ', parserFixtures.media, ' screen {}'].join(''), ['>   ', fence].join('')].join('\n'),
  );
});

test('rejects a nested list-blockquote CSS fence breakout', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['> - ', fence, 'css'].join(''), [parserFixtures.media, ' screen {}'].join(''), ['> - ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts a tilde CSS fence with a tilde in its info string', async () => {
  const fence = '~'.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [[fence, 'css title=~demo'].join(''), [parserFixtures.media, ' screen {}'].join(''), fence].join('\n'),
  );
});

const yamlUpperP = ['\\', 'U00000070'].join('');
const yamlUpperW = ['\\', 'U00000077'].join('');

test('rejects a YAML key decoded from eight-digit Unicode escapes', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['"', yamlUpperP, 'ass', yamlUpperW, 'ord": ', fixtureValue].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('reports an invalid eight-digit YAML Unicode escape', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['"', ['\\', 'U00110000'].join(''), '": safe'].join(''),
    'CONTENT_PARSE_ERROR',
  );
});

test('accepts a valid noncredential eight-digit YAML Unicode escape', async () => {
  await assertNewBoundaryAcceptance(
    'config.yaml',
    ['"label', ['\\', 'U00000021'].join(''), '": safe'].join(''),
  );
});

test('reports a tab used for YAML indentation', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['label:', '\tvalue: safe'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('reports mixed tab-and-space YAML indentation', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    ['label:', ' \tvalue: safe'].join('\n'),
    'CONTENT_PARSE_ERROR',
  );
});

test('accepts an interior tab in a quoted YAML scalar', async () => {
  await assertNewBoundaryAcceptance('config.yaml', 'label: "safe\tvalue"');
});

test('reports duplicate noncredential JSON keys', async () => {
  await assertNewBoundaryRejection('config.json', '{"label":"first","label":"second"}', 'CONTENT_PARSE_ERROR');
});

test('reports nested duplicate noncredential JSON keys', async () => {
  await assertNewBoundaryRejection('config.json', '{"outer":{"label":"first","label":"second"}}', 'CONTENT_PARSE_ERROR');
});

test('reports escaped-equivalent duplicate JSON keys', async () => {
  await assertNewBoundaryRejection(
    'config.json',
    ['{"label":"first","l', ['\\', 'u0061'].join(''), 'bel":"second"}'].join(''),
    'CONTENT_PARSE_ERROR',
  );
});

test('accepts distinct JSON keys', async () => {
  await assertNewBoundaryAcceptance('config.json', '{"label":"first","title":"second"}');
});

const zeroWidthSpace = String.fromCodePoint(0x200b);
const zeroWidthNonJoiner = String.fromCodePoint(0x200c);
const wordJoiner = String.fromCodePoint(0x2060);

test('rejects an invisible prefix before an exact prism handle', async () => {
  await assertNewBoundaryRejection('copy.md', ['Follow ', zeroWidthSpace, parserFixtures.prism].join(''), 'CONTENT_IDENTITY_HANDLE');
});

test('rejects an invisible suffix after an exact creator handle', async () => {
  await assertNewBoundaryRejection('copy.md', ['Follow ', parserFixtures.creator, wordJoiner].join(''), 'CONTENT_IDENTITY_HANDLE');
});

test('rejects a nonjoiner prefix before an exact creator handle', async () => {
  await assertNewBoundaryRejection('copy.md', ['Follow ', zeroWidthNonJoiner, parserFixtures.creator].join(''), 'CONTENT_IDENTITY_HANDLE');
});

test('rejects a nonjoiner suffix after an exact prism handle', async () => {
  await assertNewBoundaryRejection('copy.md', ['Follow ', parserFixtures.prism, zeroWidthNonJoiner].join(''), 'CONTENT_IDENTITY_HANDLE');
});

test('rejects an unchanged let-bound computed credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['let key = "', parserFixtures.pass, '";', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an unchanged var-bound computed credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['var key = "', parserFixtures.pass, '";', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a let binding that shadows an outer credential-shaped const', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', '{', '  let key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a function-local let binding that shadows an outer credential-shaped const', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'function write() {', '  let key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a function parameter that shadows an outer credential-shaped const', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'function write(key) {', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a catch parameter that shadows an outer credential-shaped const', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'try {} catch (key) {', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('rejects a parameter whose computed key name is credential-shaped', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write(', parserFixtures.pass, ') {', '  config[', parserFixtures.pass, '] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('fails closed after a let-bound computed key is reassigned', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['let key = "', parserFixtures.pass, '";', 'key = "label";', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an unchanged var-bound noncredential computed key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['var key = "label";', 'config[key] = "', fixtureValue, '";'].join('\n'),
  );
});

test('rejects a sibling unordered-list marker that leaves a CSS fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['- ', fence, 'css'].join(''), ['- ', parserFixtures.media, ' screen {}'].join(''), ['- ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects a switched unordered-list marker that leaves a CSS fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['- ', fence, 'css'].join(''), ['+ ', parserFixtures.media, ' screen {}'].join(''), ['+ ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('rejects an ordered-list sibling that leaves a CSS fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['- ', fence, 'css'].join(''), ['1. ', parserFixtures.media, ' screen {}'].join(''), ['1. ', fence].join('')].join('\n'),
    'CONTENT_IDENTITY_HANDLE',
  );
});

test('accepts a blank line inside a list-contained CSS fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['- ', fence, 'css'].join(''), '', ['  ', parserFixtures.media, ' screen {}'].join(''), ['  ', fence].join('')].join('\n'),
  );
});

test('accepts a nested-list CSS fence continuation', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryAcceptance(
    'notes.md',
    [['- parent'].join(''), ['  - ', fence, 'css'].join(''), ['    ', parserFixtures.media, ' screen {}'].join(''), ['    ', fence].join('')].join('\n'),
  );
});

test('accepts an object-method return object type annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const record = { make(): { ', parserFixtures.pass, ': string } { return {}; } };'].join(''),
  );
});

test('accepts async generic object-method return annotations', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const record = { async make<T extends { ', parserFixtures.pass, ': string }>(): Promise<{ ', parserFixtures.pass, '?: string }> { return {} as Promise<{}>; } };'].join(''),
  );
});

test('accepts a class-expression method return object type annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const View = class { make(): { ', parserFixtures.pass, '?: string } { return {}; } };'].join(''),
  );
});

test('does not let an object-method return annotation hide a runtime property', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['const record = { make(): { ', parserFixtures.pass, ': string } { return {}; }, value: { ', parserFixtures.pass, ': "', fixtureValue, '" } };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a folded multiline double-quoted YAML scalar', async () => {
  await assertNewBoundaryAcceptance('config.yaml', ['label: "first', '  second"'].join('\n'));
});

test('accepts a folded multiline single-quoted YAML scalar', async () => {
  await assertNewBoundaryAcceptance('config.yaml', ["label: 'first", "  second'"].join('\n'));
});

test('rejects a folded multiline quoted credential value', async () => {
  await assertNewBoundaryRejection(
    'config.yaml',
    [[parserFixtures.pass, ': "', fixtureValue].join(''), '  continued"'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

const yamlHighSurrogate = ['\\', 'uD83D'].join('');
const yamlLowSurrogate = ['\\', 'uDE00'].join('');
const yamlSurrogateCodePoint = ['\\', 'U0000D800'].join('');

test('accepts a paired YAML unicode surrogate escape', async () => {
  await assertNewBoundaryAcceptance('config.yaml', ['label: "', yamlHighSurrogate, yamlLowSurrogate, '"'].join(''));
});

test('reports a lone high YAML unicode surrogate escape', async () => {
  await assertNewBoundaryRejection('config.yaml', ['label: "', yamlHighSurrogate, '"'].join(''), 'CONTENT_PARSE_ERROR');
});

test('reports a lone low YAML unicode surrogate escape', async () => {
  await assertNewBoundaryRejection('config.yaml', ['label: "', yamlLowSurrogate, '"'].join(''), 'CONTENT_PARSE_ERROR');
});

test('reports a surrogate-range YAML eight-digit unicode escape', async () => {
  await assertNewBoundaryRejection('config.yaml', ['label: "', yamlSurrogateCodePoint, '"'].join(''), 'CONTENT_PARSE_ERROR');
});

test('rejects a hyphen YAML sequence inside a typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), ['- ', parserFixtures.pass, ': ', fixtureValue].join(''), fence].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a plus-looking YAML mapping inside a typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), ['+ ', parserFixtures.pass, ': ', fixtureValue].join(''), fence].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a numbered-looking YAML mapping inside a typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), ['1. ', parserFixtures.pass, ': ', fixtureValue].join(''), fence].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a nested YAML mapping inside a typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [[fence, 'yaml'].join(''), '- outer:', ['  ', parserFixtures.pass, ': ', fixtureValue].join(''), fence].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a YAML sequence inside a list-contained typed Markdown fence', async () => {
  const fence = parserFixtures.tick.repeat(3);
  await assertNewBoundaryRejection(
    'notes.md',
    [['- ', fence, 'yaml'].join(''), ['  - ', parserFixtures.pass, ': ', fixtureValue].join(''), ['  ', fence].join('')].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a function-scoped var from an inner block after the block closes', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "label";', 'function write() {', '  { var key = "', parserFixtures.pass, '"; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a function-scoped var that shadows a credential-shaped outer key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'function write() {', '  { var key = "label"; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a nested function var that shadows its enclosing function var', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function outer() {', '  var key = "', parserFixtures.pass, '";', '  function inner() {', '    var key = "label";', '    config[key] = "', fixtureValue, '";', '  }', '}'].join('\n'),
  );
});

test('rejects a branch var after its branch closes', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  if (ready) { var key = "', parserFixtures.pass, '"; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a loop var after its loop closes', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  for (var key = "', parserFixtures.pass, '"; ready;) {}', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a hoisted function var before its declaration', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  config[key] = "', fixtureValue, '";', '  var key = "', parserFixtures.pass, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a reassigned function-scoped var', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  if (ready) key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an object-method parameter that shadows an outer credential-shaped key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'const record = { write(key) { config[key] = "', fixtureValue, '"; } };'].join('\n'),
  );
});

test('accepts an async generic method parameter that shadows an outer credential-shaped key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'const record = { async write<T>(key) { config[key] = "', fixtureValue, '"; } };'].join('\n'),
  );
});

test('accepts a computed object-method parameter that shadows an outer credential-shaped key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'const record = { ["write"](key) { config[key] = "', fixtureValue, '"; } };'].join('\n'),
  );
});

test('accepts a class setter parameter that shadows an outer credential-shaped key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { set value(key) { config[key] = "', fixtureValue, '"; } }'].join('\n'),
  );
});

test('accepts a nested function return type in an object method', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const record = { make(): () => { ', parserFixtures.pass, ': string } { return () => ({}); } };'].join(''),
  );
});

test('accepts a computed object-method return object type annotation', async () => {
  await assertNewBoundaryAcceptance(
    'types.ts',
    ['const record = { ["make"](): { ', parserFixtures.pass, ': string } { return {}; } };'].join(''),
  );
});

test('does not hide a runtime property after a nested method return type', async () => {
  await assertNewBoundaryRejection(
    'types.ts',
    ['const record = { make(): () => { ', parserFixtures.pass, ': string } { return () => ({}); }, value: { ', parserFixtures.pass, ': "', fixtureValue, '" } };'].join(''),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a YAML single-quoted doubled apostrophe', async () => {
  await assertNewBoundaryAcceptance('config.yaml', "label: 'can''t'");
});

const yamlLineContinuation = ['\\'].join('');
const yamlEscapeNextLine = ['\\', 'N'].join('');
const yamlEscapeNonBreaking = ['\\', '_'].join('');
const yamlEscapeLine = ['\\', 'L'].join('');
const yamlEscapeParagraph = ['\\', 'P'].join('');

test('accepts a YAML double-quoted escaped line continuation', async () => {
  await assertNewBoundaryAcceptance('config.yaml', ['label: "first', yamlLineContinuation, '\n  second"'].join(''));
});

test('accepts standard YAML double-quoted escapes', async () => {
  await assertNewBoundaryAcceptance(
    'config.yaml',
    ['label: "', yamlEscapeNextLine, yamlEscapeNonBreaking, yamlEscapeLine, yamlEscapeParagraph, '"'].join(''),
  );
});

test('does not leak a generic function var into program scope', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write<T extends { label: string }>() { var key = "', parserFixtures.pass, '"; }', 'config[key] = "', fixtureValue, '";'].join('\n'),
  );
});

test('rejects a var initializer before access despite a later safe redeclaration', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '  var key = "label";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a safe var initializer before access despite a later credential redeclaration', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  config[key] = "', fixtureValue, '";', '  var key = "', parserFixtures.pass, '";', '}'].join('\n'),
  );
});

test('retains an earlier var initializer through a later bare redeclaration', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  var key;', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('uses a later unconditional var write before a computed-key access', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('rejects a later unconditional credential var write before access', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('fails closed for a branch-scoped var write before access', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  if (ready) key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var among multiple function-scoped declarations', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var left = "label", key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('keeps a nested function var shadow from changing its outer closure key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function outer() {', '  var key = "', parserFixtures.pass, '";', '  function inner() { var key = "label"; return key; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects an outer credential key after a private method local var', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { #write() { var key = "label"; } }', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an outer safe key after a private method credential var', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "label";', 'class View { #write() { var key = "', parserFixtures.pass, '"; } }', 'config[key] = "', fixtureValue, '";'].join('\n'),
  );
});

test('accepts a private method local var that shadows an outer credential key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { #write() { var key = "label"; config[key] = "', fixtureValue, '"; } }'].join('\n'),
  );
});

test('accepts an async static private method local var that shadows an outer credential key', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { static async #write() { var key = "label"; config[key] = "', fixtureValue, '"; } }'].join('\n'),
  );
});

test('rejects an outer credential key after a private getter local var', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { get #value() { var key = "label"; return key; } }', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an outer safe key after a private setter credential var', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['const key = "label";', 'class View { set #value(next) { var key = "', parserFixtures.pass, '"; } }', 'config[key] = "', fixtureValue, '";'].join('\n'),
  );
});

test('keeps a computed method local var from changing its outer credential key', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['const key = "', parserFixtures.pass, '";', 'class View { ["write"]() { var key = "label"; } }', 'config[key] = "', fixtureValue, '";'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var that an unbraced conditional initializer may leave reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) var key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var that an unbraced while initializer may leave reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  while (ready) var key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects credential and safe if-else var initializer alternatives', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  if (ready) var key = "', parserFixtures.pass, '"; else var key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a short-circuit and write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  ready && (key = "label");', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a for-update write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  for (; ready; key = "label") {}', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an unbraced conditional var initializer when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  if (ready) var key = "caption";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts an unbraced while var initializer when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  while (ready) var key = "caption";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts if-else var initializer alternatives when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  if (ready) var key = "label"; else var key = "caption";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a short-circuit and write when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  ready && (key = "caption");', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('accepts a for-update write when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  for (; ready; key = "caption") {}', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('rejects a credential var after a ternary write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  ready ? (key = "label") : 0;', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after an unparenthesized ternary write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  ready ? key = "label" : 0;', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts an unparenthesized ternary write when every value is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  ready ? key = "caption" : 0;', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});

test('rejects a credential var after an or short-circuit write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  ready || (key = "label");', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a nullish short-circuit write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  ready ?? (key = "label");', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a braced conditional initializer', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) { var key = "label"; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after switch alternatives', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  switch (mode) { case "safe": key = "label"; break; default: key = "caption"; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a sibling switch case bypasses a safe write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  switch (mode) { case "safe": key = "label"; break; default: config[key] = "', fixtureValue, '"; }', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a sibling switch case when every reachable key is noncredential', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "label";', '  switch (mode) { case "safe": key = "caption"; break; default: config[key] = "', fixtureValue, '"; }', '}'].join('\n'),
  );
});

test('rejects a credential var after try-catch-finally writes', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  try { if (ready) key = "label"; } catch (error) { key = "caption"; } finally { trace(); }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a do-body conditional write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  do { if (ready) key = "label"; } while (false);', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var after a for-body write with a break', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  for (; ready;) { key = "label"; break; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when an early return bypasses its safe write', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) { key = "label"; return; }', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a direct if body may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a direct else body may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) trace(); else key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a direct while body may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  while (ready) key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a direct do body may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  do key = "label"; while (ready);', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when a direct for body may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  for (; ready;) key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential var when nested direct control bodies may leave it reachable', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  if (ready) while (again) key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential write in a direct if body', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  if (ready) key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential write in a direct else body', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  if (ready) trace(); else key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential write in a direct while body', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  while (ready) key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential write in a direct do body', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  do key = "', parserFixtures.pass, '"; while (ready);', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('rejects a credential write in a direct for body', async () => {
  await assertNewBoundaryRejection(
    'config.ts',
    ['function write() {', '  var key = "label";', '  for (; ready;) key = "', parserFixtures.pass, '";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
    'CONTENT_SECRET_VALUE',
  );
});

test('accepts a straight-line safe overwrite after a credential var', async () => {
  await assertNewBoundaryAcceptance(
    'config.ts',
    ['function write() {', '  var key = "', parserFixtures.pass, '";', '  key = "label";', '  config[key] = "', fixtureValue, '";', '}'].join('\n'),
  );
});
