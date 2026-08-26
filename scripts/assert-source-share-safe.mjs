import { lstat, readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, basename, extname, join } from 'node:path';

const root = resolve(process.argv[2] ?? new URL('..', import.meta.url).pathname);
const ignoredDirectories = new Set(['.git', '.superpowers', 'node_modules', 'dist']);
const findings = new Map();

const genericBackendRoutePattern = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b|\[::1\]|\/(?:backend|server|worker|agent)(?=\/|[?#'"`\s]|$)/i;
const genericWalletCapabilityPattern = /\bwindow\.ethereum(?:\.request)?\b|\bethereum\.request\b|\b(?:signer|requestAccounts|signTransaction|sendTransaction|signTypedData|personal_sign|eth_requestAccounts|eth_sendTransaction)\b/i;
const genericCredentialIdentifierPattern = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*(?:_API_KEY|_PRIVATE_KEY|_SECRET|_TOKEN|_MNEMONIC|_SIGNER|_API_URL|_USER_ADDRESS)\b|\b(?:mnemonic|privateKey)\b/;
const contentRules = [
  ['CONTENT_BACKEND', genericBackendRoutePattern],
  ['CONTENT_SENSITIVE', genericWalletCapabilityPattern],
  ['CONTENT_SENSITIVE', genericCredentialIdentifierPattern],
  ['CONTENT_PRIVACY', /\/Users\/|0x[a-fA-F0-9]{40}\b/],
  ['CONTENT_API_ROUTE', /\/api(?=\/|[?#'"`\s]|$)/i],
  ['CONTENT_REMOTE_FONT', /fonts\.|fontshare|font-src[^;]*(https?:)?\/\//i],
  ['CONTENT_PWA', /VitePWA|workbox|generateSW|injectManifest|registerRoute|precacheAndRoute|registerSW|virtual:pwa|service-worker|serviceWorker|runtimeCaching/i],
  ['CONTENT_NETWORK_PRIMITIVE', /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|navigator\.sendBeacon\b/],
  ['CONTENT_EXTERNAL_RUNTIME', /\bfetch\s*\(|https?:\/\/[^\s'"`<>\\]+|(?<!:)\/\/(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9][A-Za-z0-9.-]*)(?::\d+)?(?:\/[^\s'"`<>\\]*)?/i],
];

// These patterns are intentionally scanned in every file, including binary
// asset metadata. Ordinary source-only rules stay limited to text files.
const metadataPrivacyRules = [
  ['CONTENT_PRIVACY_EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['CONTENT_PRIVACY_PHONE', /\+\d{1,3}[ .-]?(?:\d[ .-]?){7,}\d\b/],
  ['CONTENT_PRIVACY_PATH', /\/Users\//],
  ['CONTENT_PRIVACY_ADDRESS', /0x[a-fA-F0-9]{40}\b/],
];
const repositoryTextRules = [
  ['CONTENT_IDENTITY_NAME', /\b(?:Hi|Hello),\s+[A-Z][a-z]{2,}\b/],
  ['CONTENT_PROVENANCE', new RegExp(['cl', 'aude\\.ai'].join(''), 'i')],
  ['CONTENT_PROVENANCE', new RegExp(['Exact', '\\s+', 'port'].join(''), 'i')],
];
const allowedCssAtRules = new Set(['charset', 'container', 'counter-style', 'font-face', 'font-feature-values', 'import', 'keyframes', 'layer', 'media', 'namespace', 'page', 'property', 'supports']);
const moduleExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const dependencySections = new Set(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']);

function report(rule, path) {
  if (!findings.has(rule)) findings.set(rule, path);
}

function inspectPath(path) {
  const name = basename(path);
  if (name === 'api') report('PATH_API', path);
  if (name.startsWith('.env')) report('PATH_ENV', path);
  if (name === '.vercel' || name === '.vercelignore') report('PATH_VERCEL', path);
  if (/^(?:service-worker|sw|workbox|registerSW)(?:[._-]|$)|^manifest(?:\.webmanifest|\.json)?$/i.test(name)) report('PATH_PWA', path);
}

function scopedPackageAt(content, index) {
  return content.slice(index).match(/^@([A-Za-z][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*)/)?.[0];
}

function syntaxForPath(path) {
  const extension = extname(path).toLowerCase();
  if (extension === '.json') return 'json';
  if (extension === '.yaml' || extension === '.yml') return 'yaml';
  if (extension === '.md' || extension === '.mdx') return 'markdown';
  if (extension === '.css') return 'css';
  if (moduleExtensions.has(extension)) return 'script';
  return 'text';
}

function isScriptWordStart(character) {
  return /[A-Za-z_$]/.test(character ?? '');
}

function isScriptWordPart(character) {
  return /[A-Za-z0-9_$]/.test(character ?? '');
}

function skipSourceRegex(content, start, limit = content.length) {
  let cursor = start + 1;
  let inClass = false;
  while (cursor < limit) {
    if (content[cursor] === '\\') {
      cursor += 2;
    } else if (content[cursor] === '[') {
      inClass = true;
      cursor += 1;
    } else if (content[cursor] === ']') {
      inClass = false;
      cursor += 1;
    } else if (content[cursor] === '/' && !inClass) {
      cursor += 1;
      while (/[A-Za-z]/.test(content[cursor] ?? '')) cursor += 1;
      return { end: cursor, closed: true };
    } else {
      cursor += 1;
    }
  }
  return { end: limit, closed: false };
}

function sourceRegexOpening(content, index, start) {
  for (let cursor = index - 1; cursor >= start; cursor -= 1) {
    if (/\s/.test(content[cursor])) continue;
    if (/[=(:,[!&|?;{}]/.test(content[cursor])) return true;
    const word = content.slice(start, cursor + 1).match(/([A-Za-z_$][A-Za-z0-9_$]*)$/)?.[1];
    return new Set(['return', 'case', 'throw', 'typeof', 'delete', 'void', 'yield', 'await']).has(word);
  }
  return true;
}

function sourceBraceClose(content, start, limit = content.length) {
  let cursor = start + 1;
  let depth = 1;
  while (cursor < limit) {
    const character = content[cursor];
    if (character === '"' || character === "'") {
      const quoted = readQuotedText(content, cursor, character, limit);
      if (!quoted.closed) return { end: limit, closed: false };
      cursor = quoted.end;
    } else if (character === '`') {
      const shape = templateShape(content, cursor, limit);
      if (!shape.closed) return { end: limit, closed: false };
      cursor = shape.end;
    } else if (character === '/' && content[cursor + 1] === '/') {
      cursor = content.indexOf('\n', cursor + 2);
      if (cursor === -1) return { end: limit, closed: false };
    } else if (character === '/' && content[cursor + 1] === '*') {
      const end = content.indexOf('*/', cursor + 2);
      if (end === -1) return { end: limit, closed: false };
      cursor = end + 2;
    } else if (character === '/' && sourceRegexOpening(content, cursor, start)) {
      const expression = skipSourceRegex(content, cursor, limit);
      if (!expression.closed) return { end: limit, closed: false };
      cursor = expression.end;
    } else if (character === '{') {
      depth += 1;
      cursor += 1;
    } else if (character === '}') {
      depth -= 1;
      if (!depth) return { end: cursor, closed: true };
      cursor += 1;
    } else {
      cursor += 1;
    }
  }
  return { end: limit, closed: false };
}

function templateShape(content, start, limit = content.length) {
  let cursor = start + 1;
  let hasText = false;
  const expressions = [];
  while (cursor < limit) {
    const character = content[cursor];
    if (character === '`') return { end: cursor + 1, closed: true, hasText, expressions };
    if (character === '\\') {
      hasText = true;
      cursor += 2;
    } else if (character === '$' && content[cursor + 1] === '{') {
      const close = sourceBraceClose(content, cursor + 1, limit);
      expressions.push({ start: cursor + 2, end: close });
      hasText = true;
      if (!close.closed) return { end: limit, closed: false, hasText, expressions };
      expressions[expressions.length - 1].end = close.end;
      cursor = Math.min(close.end + 1, limit);
    } else {
      if (!/\s/.test(character)) hasText = true;
      cursor += 1;
    }
  }
  return { end: limit, closed: false, hasText, expressions };
}

function staticTemplateValue(content, start, shape) {
  if (!shape.closed) return undefined;
  let cursor = start + 1;
  let value = '';
  for (const expression of shape.expressions) {
    while (cursor < expression.start - 2) {
      if (content[cursor] === '\\') {
        value += content[cursor + 1] ?? '';
        cursor += 2;
      } else {
        value += content[cursor];
        cursor += 1;
      }
    }
    const quote = content[expression.start];
    if (quote !== '"' && quote !== "'" && quote !== '`') return undefined;
    const quoted = readQuotedText(content, expression.start, quote, expression.end);
    if (!quoted.closed || quoted.end !== expression.end) return undefined;
    value += quoted.value;
    cursor = expression.end + 1;
  }
  while (cursor < shape.end - 1) {
    if (content[cursor] === '\\') {
      value += content[cursor + 1] ?? '';
      cursor += 2;
    } else {
      value += content[cursor];
      cursor += 1;
    }
  }
  return value;
}

function isRegexOpening(pieces) {
  const before = pieces.at(-1)?.value;
  return before === undefined || new Set(['=', ':', '(', '[', '{', ',', ';', '!', '&', '|', '?', '=>', 'return', 'case', 'throw', 'typeof', 'delete', 'void', 'yield', 'await']).has(before);
}

function isJsxTextQuote(content, index, pieces) {
  const tagEnd = content.lastIndexOf('>', index - 1);
  if (tagEnd === -1) return false;
  if (pieces.some(piece => (piece.kind === 'string' || piece.kind === 'template' || piece.kind === 'regex') && tagEnd >= piece.start && tagEnd < piece.end)) return false;
  const tagStart = content.lastIndexOf('<', tagEnd);
  if (tagStart === -1) return false;
  const tag = content.slice(tagStart + 1, tagEnd);
  if (!/^\/?[A-Za-z][A-Za-z0-9._:-]*(?:\s[^<>]*)?\/?$/.test(tag) && tag !== '/') return false;
  const text = content.slice(tagEnd + 1, index);
  return !/[<{};]/.test(text);
}

function scriptPieces(content) {
  const pieces = [];
  const diagnostics = [];
  const diagnose = (kind, start) => diagnostics.push({ kind, start });

  const scan = (from, limit) => {
    for (let cursor = from; cursor < limit;) {
      const character = content[cursor];
      if (/\s/.test(character)) {
        cursor += 1;
      } else if (character === '/' && content[cursor + 1] === '/') {
        const end = content.indexOf('\n', cursor + 2);
        cursor = end === -1 ? limit : end + 1;
      } else if (character === '/' && content[cursor + 1] === '*') {
        const end = content.indexOf('*/', cursor + 2);
        if (end === -1) {
          diagnose('comment', cursor);
          cursor = limit;
        } else {
          cursor = end + 2;
        }
      } else if ((character === '"' || character === "'") && !isJsxTextQuote(content, cursor, pieces)) {
        const quoted = readQuotedText(content, cursor, character, limit);
        if (!quoted.closed) diagnose('string', cursor);
        pieces.push({ kind: 'string', value: quoted.value, start: cursor, end: quoted.end });
        cursor = quoted.end;
      } else if (character === '`') {
        const shape = templateShape(content, cursor, limit);
        if (!shape.closed) diagnose('template', cursor);
        const staticValue = staticTemplateValue(content, cursor, shape);
        pieces.push({
          kind: staticValue === undefined ? 'template' : 'string',
          // Keep literal template text for conservative computed-key analysis;
          // nested expressions are scanned separately below.
          value: staticValue ?? content.slice(cursor + 1, Math.max(cursor + 1, shape.end - 1)),
          start: cursor,
          end: shape.end,
        });
        for (const expression of shape.expressions) scan(expression.start, expression.end);
        cursor = shape.end;
      } else if (character === '/' && content[cursor + 1] !== '>' && isRegexOpening(pieces)) {
        const expression = skipSourceRegex(content, cursor, limit);
        if (!expression.closed) diagnose('regex', cursor);
        pieces.push({ kind: 'regex', value: content.slice(cursor, expression.end), start: cursor, end: expression.end });
        cursor = expression.end;
      } else if (isScriptWordStart(character)) {
        const start = cursor;
        cursor += 1;
        while (cursor < limit && isScriptWordPart(content[cursor])) cursor += 1;
        pieces.push({ kind: 'word', value: content.slice(start, cursor), start, end: cursor });
      } else if (/[0-9]/.test(character)) {
        const start = cursor;
        cursor += 1;
        while (cursor < limit && /[A-Za-z0-9._]/.test(content[cursor])) cursor += 1;
        pieces.push({ kind: 'number', value: content.slice(start, cursor), start, end: cursor });
      } else {
        const triple = content.slice(cursor, cursor + 3);
        const pair = content.slice(cursor, cursor + 2);
        const value = ['>>=', '<<=', '===', '!==', '||=', '??=', '&&=', '=>', '?.', '??', '...', '**', '&&', '||', '++', '--', '<=', '>=', '==', '!=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='].includes(triple)
          ? triple
          : ['=>', '?.', '??', '**', '&&', '||', '++', '--', '<=', '>=', '==', '!=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='].includes(pair)
            ? pair
            : character;
        pieces.push({ kind: 'punctuation', value, start: cursor, end: cursor + value.length });
        cursor += value.length;
      }
    }
  };

  scan(0, content.length);
  pieces.sort((left, right) => left.start - right.start || left.end - right.end);
  return { pieces, diagnostics };
}

function isSourceScopedPackage(analysis, index, syntax) {
  if (syntax !== 'script') return false;
  if (analysis.diagnostics.length) return false;
  const { pieces } = analysis;
  const stringIndex = pieces.findIndex(piece => piece.kind === 'string' && piece.start === index - 1);
  if (stringIndex === -1) return false;
  const previous = pieces[stringIndex - 1]?.value;
  const beforePrevious = pieces[stringIndex - 2]?.value;
  if (previous === 'import' && beforePrevious !== '.' && beforePrevious !== '?.') return true;
  if (previous === 'from') {
    for (let cursor = stringIndex - 2; cursor >= 0; cursor -= 1) {
      const value = pieces[cursor].value;
      if (value === ';') break;
      if ((value === 'import' || value === 'export') && pieces[cursor - 1]?.value !== '.' && pieces[cursor - 1]?.value !== '?.') return true;
    }
  }
  // This project is ESM. A bare `require` can be locally shadowed, while the
  // parser can prove that `import(...)` is the language loader form.
  if (previous === '(' && beforePrevious === 'import' && pieces[stringIndex - 3]?.value !== '.' && pieces[stringIndex - 3]?.value !== '?.') return true;
  return false;
}

function packageRecordPath(value) {
  return value === '' || /^node_modules\/(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+(?:\/node_modules\/(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+)*$/.test(value);
}

function dependencyContainerPath(path, file) {
  if (file === 'package.json') return path.length === 1 && dependencySections.has(path[0]);
  if (file !== 'package-lock.json') return false;
  if (path.length === 1 && dependencySections.has(path[0])) return true;
  return path.length === 3 && path[0] === 'packages' && packageRecordPath(path[1]) && dependencySections.has(path[2]);
}

function packageNameContainerPath(path, file) {
  if (dependencyContainerPath(path, file)) return true;
  if (file === 'package.json') return path.length === 1 && path[0] === 'peerDependenciesMeta';
  return file === 'package-lock.json' && path.length === 3 && path[0] === 'packages' && packageRecordPath(path[1]) && path[2] === 'peerDependenciesMeta';
}

function isPackageScopedPackage(content, index, path) {
  const file = basename(path);
  if (file !== 'package.json' && file !== 'package-lock.json') return false;
  const specifier = scopedPackageAt(content, index);
  if (!specifier) return false;
  const document = jsonDocument(content, path);
  if (document.diagnostics.length) return false;

  let allowed = false;
  const visit = (node, nodePath = []) => {
    if (!node || allowed || node.kind !== 'object') return;
    for (const entry of node.entries) {
      const childPath = [...nodePath, entry.key];
      if (entry.key === specifier && index >= entry.keyStart + 1 && index < entry.keyEnd - 1 && packageNameContainerPath(nodePath, file)) {
        allowed = true;
        return;
      }
      const keyOffset = index - (entry.keyStart + 1);
      const packageSegment = entry.key.slice(keyOffset, keyOffset + specifier.length) === specifier
        && (keyOffset === 'node_modules/'.length || entry.key.slice(Math.max(0, keyOffset - '/node_modules/'.length), keyOffset) === '/node_modules/');
      if (file === 'package-lock.json' && nodePath.length === 1 && nodePath[0] === 'packages'
        && packageRecordPath(entry.key) && packageSegment
        && index >= entry.keyStart + 1 && index < entry.keyEnd - 1) {
        allowed = true;
        return;
      }
      if (file === 'package-lock.json' && nodePath.length === 2 && nodePath[0] === 'packages' && packageRecordPath(nodePath[1])
        && entry.key === 'resolved' && entry.value.kind === 'scalar'
        && index >= entry.value.start + 1 && index < entry.value.end - 1
        && entry.value.value.startsWith(`https://registry.npmjs.org/${specifier}/`)) {
        allowed = true;
        return;
      }
      visit(entry.value, childPath);
      if (allowed) return;
    }
  };
  visit(document.root);
  return allowed;
}

function markdownContainer(line) {
  let value = line;
  let quotes = 0;
  let lists = 0;
  let continuationIndent = 0;
  let hasListMarker = false;
  let changed = true;
  while (changed) {
    changed = false;
    const quote = value.match(/^ {0,3}>[ \t]?/);
    if (quote) {
      quotes += 1;
      value = value.slice(quote[0].length);
      changed = true;
      continue;
    }
    const list = value.match(/^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/);
    if (list) {
      lists += 1;
      hasListMarker = true;
      continuationIndent += list[0].length;
      value = value.slice(list[0].length);
      changed = true;
    }
  }
  return {
    content: value,
    quotes,
    lists,
    hasListMarker,
    continuationIndent,
    leadingIndent: value.match(/^ */)?.[0].length ?? 0,
  };
}

function activeFenceBodyLine(text, activeFence) {
  let value = text;
  for (let quote = 0; quote < activeFence.container.quotes; quote += 1) {
    const marker = value.match(/^ {0,3}>[ \t]?/);
    if (!marker) return undefined;
    value = value.slice(marker[0].length);
  }

  if (!activeFence.container.lists) return value;
  if (!value.trim()) return '';
  const indent = value.match(/^ */)?.[0].length ?? 0;
  if (indent < activeFence.container.continuationIndent) return undefined;
  return value.slice(activeFence.container.continuationIndent);
}

function markdownFences(content) {
  const fences = [];
  const diagnostics = [];
  let activeFence;
  let offset = 0;

  const finishFence = (end) => {
    fences.push({
      language: activeFence.language,
      content: activeFence.body,
      start: activeFence.start,
      end,
    });
    activeFence = undefined;
  };

  const openFence = (container, offset, lineLength) => {
    const opening = container.content.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
    if (!opening) return;
    const character = opening[2][0];
    const rawInfo = opening[3] ?? '';
    // A fence marker cannot appear in its own info string. Other trailing
    // CommonMark info words are opaque attributes; only the first token is
    // used to select a structured scanner.
    if (character === '`' && rawInfo.includes(character)) {
      diagnostics.push({ kind: 'fence', start: offset });
      return;
    }
    const language = rawInfo.trim().split(/[ \t]+/, 1)[0]?.toLowerCase() ?? '';
    activeFence = {
      character,
      length: opening[2].length,
      language,
      container,
      start: offset + lineLength,
      body: '',
    };
  };

  for (const lineWithEnding of content.matchAll(/.*(?:\r?\n|$)/g)) {
    const line = lineWithEnding[0];
    if (!line) continue;
    const text = line.replace(/\r?\n$/, '');
    const lineEnding = line.slice(text.length);
    if (!activeFence) {
      const container = markdownContainer(text);
      openFence(container, offset, line.length);
    } else {
      const normalized = activeFenceBodyLine(text, activeFence);
      if (normalized === undefined) {
        // A line that cannot retain the opening quote/list container starts
        // a new Markdown context. Only this structural breakout may end a
        // fence before a closing marker; list-looking fence body text stays
        // available to the typed content scanner.
        finishFence(offset);
        openFence(markdownContainer(text), offset, line.length);
        offset += line.length;
        continue;
      }
      const closing = new RegExp(`^ {0,3}${activeFence.character}{${activeFence.length},}[ \\t]*$`);
      if (closing.test(normalized)) {
        finishFence(offset);
      } else {
        activeFence.body += normalized + lineEnding;
      }
    }
    offset += line.length;
  }
  if (activeFence) finishFence(content.length);
  return { fences, diagnostics };
}

function fencedSyntax(language) {
  if (language === 'json') return 'json';
  if (language === 'yaml' || language === 'yml') return 'yaml';
  if (language === 'js' || language === 'javascript' || language === 'jsx' || language === 'ts' || language === 'typescript' || language === 'tsx' || language === 'mjs' || language === 'cjs') return 'script';
  if (language === 'css') return 'css';
  return 'text';
}

function inFence(index, fences) {
  return fences.some(fence => index >= fence.start && index < fence.end);
}

function cssCodeMask(content) {
  const mask = Array(content.length).fill(true);
  const hide = (from, to) => {
    for (let cursor = from; cursor < to; cursor += 1) mask[cursor] = false;
  };
  for (let cursor = 0; cursor < content.length; cursor += 1) {
    if (content[cursor] === '/' && content[cursor + 1] === '*') {
      const end = content.indexOf('*/', cursor + 2);
      hide(cursor, end === -1 ? content.length : end + 2);
      cursor = end === -1 ? content.length : end + 1;
    } else if (content[cursor] === '"' || content[cursor] === "'") {
      const end = readQuotedText(content, cursor, content[cursor]).end;
      hide(cursor, end);
      cursor = end - 1;
    }
  }
  return mask;
}

function inlineCssRanges(content, pieces) {
  const ranges = [];
  const literalAt = (index) => pieces.some(piece => (piece.kind === 'string' || piece.kind === 'template' || piece.kind === 'regex') && index >= piece.start && index < piece.end);
  for (const match of content.matchAll(/<style(?:\s[^>]*)?>\s*\{\s*/gi)) {
    const start = match.index ?? 0;
    if (literalAt(start)) continue;
    const templateStart = start + match[0].length;
    const template = pieces.find(piece => piece.start === templateStart && (piece.kind === 'string' || piece.kind === 'template'));
    if (!template || content[templateStart] !== '`') continue;
    const closing = content.slice(template.end).match(/^\s*\}\s*<\/style\s*>/i);
    if (!closing) continue;
    ranges.push({ start: template.start + 1, end: template.end - 1 });
  }
  return ranges;
}

function previousCssCodeCharacter(content, index, mask) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!mask[cursor] || /\s/.test(content[cursor])) continue;
    return content[cursor];
  }
  return '';
}

function nextCssCodeCharacter(content, index, mask) {
  for (let cursor = index; cursor < content.length; cursor += 1) {
    if (!mask[cursor] || /\s/.test(content[cursor])) continue;
    return { character: content[cursor], index: cursor };
  }
  return { character: '', index: content.length };
}

function isCssAtRuleCode(content, index, matchEnd, handle, mask) {
  if (!allowedCssAtRules.has(handle) || !mask[index]) return false;
  for (let cursor = index; cursor < matchEnd; cursor += 1) {
    if (!mask[cursor]) return false;
  }
  const next = nextCssCodeCharacter(content, matchEnd, mask);
  const hasTrivia = next.index > matchEnd;
  if (!hasTrivia && next.character && !/[{('";]/.test(next.character)) return false;
  const before = previousCssCodeCharacter(content, index, mask);
  return !before || '{};'.includes(before);
}

function isCssAtRule(content, index, matchEnd, syntax, handle, inlineRanges) {
  if (syntax === 'css') return isCssAtRuleCode(content, index, matchEnd, handle, cssCodeMask(content));
  if (syntax !== 'script') return false;
  for (const range of inlineRanges) {
    if (index < range.start || matchEnd > range.end) continue;
    const css = content.slice(range.start, range.end);
    return isCssAtRuleCode(css, index - range.start, matchEnd - range.start, handle, cssCodeMask(css));
  }
  return false;
}

function hasBrandQualifier(content, index, matchEnd) {
  const previous = content[index - 1] ?? '';
  const invisible = /[\p{Cf}\uFE00-\uFE0F]/u;
  if (previous === '@' || /[\p{L}\p{N}\p{M}_-]/u.test(previous) || invisible.test(previous)) return true;
  const suffix = content.slice(matchEnd);
  if (/^%[0-9a-f]{2}/i.test(suffix)) return true;
  if (invisible.test(suffix[0] ?? '')) return true;
  return /^(?:[\p{L}\p{N}\p{M}_-]|[:/\\\u2044\u2215\uFF0F]|(?:[.\u2024\uFE52\uFF0E\u3002\uFF61]+|[\u200B-\u200D\u2060]+)[\p{L}\p{N}\p{M}_%-])/u.test(suffix);
}

function inspectHandles(content, path, syntax = syntaxForPath(path)) {
  const analysis = syntax === 'script' ? scriptAnalysis(content) : { pieces: [], diagnostics: [] };
  if (analysis.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
  const inlineRanges = syntax === 'script' ? inlineCssRanges(content, analysis.pieces) : [];
  const fenced = syntax === 'markdown' ? markdownFences(content) : { fences: [], diagnostics: [] };
  if (fenced.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
  const fences = fenced.fences;
  if (syntax === 'json' && jsonDocument(content, path).diagnostics.length) report('CONTENT_PARSE_ERROR', path);
  for (const match of content.matchAll(/@([A-Za-z][A-Za-z0-9_-]*)/g)) {
    const handle = match[1].toLowerCase();
    const index = match.index ?? 0;
    if (inFence(index, fences)) continue;
    const matchEnd = index + match[0].length;
    const scopedPackage = content[matchEnd] === '/';
    const exactBrandHandle = (handle === 'prism' || handle === 'creator') && !scopedPackage && !hasBrandQualifier(content, index, matchEnd);
    const isAllowed = exactBrandHandle
      || isCssAtRule(content, index, matchEnd, syntax, handle, inlineRanges)
      || (scopedPackage && (isSourceScopedPackage(analysis, index, syntax) || isPackageScopedPackage(content, index, path)));
    if (!isAllowed) report('CONTENT_IDENTITY_HANDLE', path);
  }
  for (const fence of fences) inspectHandles(fence.content, path, fencedSyntax(fence.language));
}

function isCredentialKey(rawKey) {
  const normalized = rawKey.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  if (!normalized) return false;
  return ['secret', 'password', 'passwd', 'mnemonic', 'credential', 'apikey', 'privatekey', 'accesskey', 'token']
    .some(family => normalized.includes(family));
}

function isIntentionalCredentialHelper(rawKey, expression) {
  const normalized = rawKey.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  if (!/(?:rule|rules|case|cases|pattern|patterns)$/.test(normalized)) return false;
  const value = expression.trim();
  return /^(?:\/(?:\\.|[^/\r\n])+\/[A-Za-z]*|new\s+RegExp\s*\([^\r\n]*\)|\[\s*\]|\{\s*\})\s*(?:[;,}\]]|$)/.test(value);
}

function readQuotedText(content, start, quote, limit = content.length) {
  let cursor = start + 1;
  let value = '';
  while (cursor < limit) {
    const character = content[cursor];
    if (character === quote) return { value, end: cursor + 1, closed: true };
    if (character !== '\\') {
      value += character;
      cursor += 1;
      continue;
    }
    const escape = content[cursor + 1];
    if (escape === 'u' && content[cursor + 2] === '{') {
      const closing = content.indexOf('}', cursor + 3);
      const code = closing === -1 ? Number.NaN : Number.parseInt(content.slice(cursor + 3, closing), 16);
      if (Number.isFinite(code)) {
        value += String.fromCodePoint(code);
        cursor = closing + 1;
        continue;
      }
    }
    if (escape === 'u' && /^[0-9A-Fa-f]{4}$/.test(content.slice(cursor + 2, cursor + 6))) {
      value += String.fromCharCode(Number.parseInt(content.slice(cursor + 2, cursor + 6), 16));
      cursor += 6;
      continue;
    }
    if (escape === 'x' && /^[0-9A-Fa-f]{2}$/.test(content.slice(cursor + 2, cursor + 4))) {
      value += String.fromCharCode(Number.parseInt(content.slice(cursor + 2, cursor + 4), 16));
      cursor += 4;
      continue;
    }
    const escaped = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' }[escape];
    value += escaped ?? escape ?? '';
    cursor += 2;
  }
  return { value, end: limit, closed: false };
}

function readYamlDoubleQuotedText(content, start, limit = content.length) {
  let cursor = start + 1;
  let value = '';
  let valid = true;
  while (cursor < limit) {
    const character = content[cursor];
    if (character === '"') return { value, end: cursor + 1, closed: true, valid };
    if (character !== '\\') {
      value += character;
      cursor += 1;
      continue;
    }
    const escape = content[cursor + 1];
    if (escape === '\n' || escape === '\r') {
      let next = cursor + 1;
      if (content[next] === '\r' && content[next + 1] === '\n') next += 2;
      else next += 1;
      while (content[next] === ' ' || content[next] === '\t') next += 1;
      cursor = next;
      continue;
    }
    if (escape === 'U') {
      const digits = content.slice(cursor + 2, cursor + 10);
      const code = /^[0-9A-Fa-f]{8}$/.test(digits) ? Number.parseInt(digits, 16) : Number.NaN;
      if (Number.isInteger(code) && code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) {
        value += String.fromCodePoint(code);
      } else {
        valid = false;
      }
      cursor += /^[0-9A-Fa-f]{8}$/.test(digits) ? 10 : Math.min(10, limit - cursor);
      continue;
    }
    if (escape === 'u' && /^[0-9A-Fa-f]{4}$/.test(content.slice(cursor + 2, cursor + 6))) {
      const code = Number.parseInt(content.slice(cursor + 2, cursor + 6), 16);
      if (code >= 0xd800 && code <= 0xdbff) {
        const lowDigits = content.slice(cursor + 8, cursor + 12);
        const low = content[cursor + 6] === '\\' && content[cursor + 7] === 'u' && /^[0-9A-Fa-f]{4}$/.test(lowDigits)
          ? Number.parseInt(lowDigits, 16)
          : Number.NaN;
        if (low >= 0xdc00 && low <= 0xdfff) {
          value += String.fromCodePoint(0x10000 + ((code - 0xd800) * 0x400) + (low - 0xdc00));
          cursor += 12;
          continue;
        }
        valid = false;
        cursor += 6;
        continue;
      }
      if (code >= 0xdc00 && code <= 0xdfff) {
        valid = false;
        cursor += 6;
        continue;
      }
      value += String.fromCharCode(code);
      cursor += 6;
      continue;
    }
    if (escape === 'x' && /^[0-9A-Fa-f]{2}$/.test(content.slice(cursor + 2, cursor + 4))) {
      value += String.fromCharCode(Number.parseInt(content.slice(cursor + 2, cursor + 4), 16));
      cursor += 4;
      continue;
    }
    const escaped = { '"': '"', '\\': '\\', '/': '/', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', a: '\x07', e: '\x1b', ' ': ' ', N: '\u0085', _: '\u00a0', L: '\u2028', P: '\u2029' }[escape];
    if (escaped === undefined) valid = false;
    value += escaped ?? escape ?? '';
    cursor += escape === undefined ? 1 : 2;
  }
  return { value, end: limit, closed: false, valid };
}

function readYamlSingleQuotedText(content, start, limit = content.length) {
  let cursor = start + 1;
  let value = '';
  while (cursor < limit) {
    if (content[cursor] !== "'") {
      value += content[cursor];
      cursor += 1;
      continue;
    }
    if (content[cursor + 1] === "'") {
      value += "'";
      cursor += 2;
      continue;
    }
    return { value, end: cursor + 1, closed: true };
  }
  return { value, end: limit, closed: false };
}

function readJsonString(content, start, limit = content.length) {
  let cursor = start + 1;
  let value = '';
  let valid = true;
  while (cursor < limit) {
    const character = content[cursor];
    if (character === '"') return { value, end: cursor + 1, closed: true, valid };
    if (character.charCodeAt(0) <= 0x1f) {
      valid = false;
      value += character;
      cursor += 1;
      continue;
    }
    if (character !== '\\') {
      value += character;
      cursor += 1;
      continue;
    }
    const escape = content[cursor + 1];
    const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
    if (Object.hasOwn(simple, escape)) {
      value += simple[escape];
      cursor += 2;
      continue;
    }
    if (escape === 'u' && /^[0-9A-Fa-f]{4}$/.test(content.slice(cursor + 2, cursor + 6))) {
      value += String.fromCharCode(Number.parseInt(content.slice(cursor + 2, cursor + 6), 16));
      cursor += 6;
      continue;
    }
    valid = false;
    value += escape ?? '';
    cursor += escape === undefined ? 1 : 2;
  }
  return { value, end: limit, closed: false, valid };
}

function jsonPieces(content, allowComments = false) {
  const pieces = [];
  const diagnostics = [];
  for (let cursor = 0; cursor < content.length;) {
    const character = content[cursor];
    if (/\s/.test(character)) {
      cursor += 1;
    } else if (character === '/' && content[cursor + 1] === '/') {
      if (!allowComments) diagnostics.push({ kind: 'comment', start: cursor });
      const end = content.indexOf('\n', cursor + 2);
      cursor = end === -1 ? content.length : end + 1;
    } else if (character === '/' && content[cursor + 1] === '*') {
      if (!allowComments) diagnostics.push({ kind: 'comment', start: cursor });
      const end = content.indexOf('*/', cursor + 2);
      if (end === -1) {
        diagnostics.push({ kind: 'comment', start: cursor });
        cursor = content.length;
      } else {
        cursor = end + 2;
      }
    } else if (character === '"') {
      const quoted = readJsonString(content, cursor);
      if (!quoted.closed || !quoted.valid) diagnostics.push({ kind: 'string', start: cursor });
      pieces.push({ kind: 'string', value: quoted.value, start: cursor, end: quoted.end });
      cursor = quoted.end;
    } else if ('{}[]:,' .includes(character)) {
      pieces.push({ kind: 'punctuation', value: character, start: cursor, end: cursor + 1 });
      cursor += 1;
    } else {
      const start = cursor;
      while (cursor < content.length && !/\s/.test(content[cursor]) && !'{}[]:,'.includes(content[cursor])) cursor += 1;
      pieces.push({ kind: 'bare', value: content.slice(start, cursor), start, end: cursor });
    }
  }
  return { pieces, diagnostics };
}

function jsonDocument(content, path = '') {
  const file = basename(path);
  const lexed = jsonPieces(content, /^tsconfig(?:\..+)?\.json$/i.test(file) || file.endsWith('.jsonc'));
  const { pieces } = lexed;
  const diagnostics = [...lexed.diagnostics];
  const diagnose = (kind, index) => diagnostics.push({ kind, start: pieces[index]?.start ?? content.length });

  const parseValue = (start) => {
    const piece = pieces[start];
    if (!piece) {
      diagnose('value', start);
      return { node: { kind: 'missing', start: content.length, end: content.length }, next: start + 1 };
    }
    if (piece.value === '{') {
      const entries = [];
      const keys = new Set();
      let cursor = start + 1;
      let closed = false;
      let afterComma = false;
      while (cursor < pieces.length) {
        if (pieces[cursor].value === '}') {
          if (afterComma && entries.length) diagnose('object-trailing-comma', cursor);
          closed = true;
          cursor += 1;
          break;
        }
        if (pieces[cursor].value === ',') {
          diagnose('object-comma', cursor);
          cursor += 1;
          continue;
        }
        afterComma = false;
        const key = pieces[cursor];
        if (key.kind !== 'string' || pieces[cursor + 1]?.value !== ':') {
          diagnose('object-member', cursor);
          cursor += 1;
          continue;
        }
        if (keys.has(key.value)) diagnose('object-duplicate-key', cursor);
        keys.add(key.value);
        const child = parseValue(cursor + 2);
        entries.push({ key: key.value, keyStart: key.start, keyEnd: key.end, value: child.node });
        cursor = Math.max(child.next, cursor + 2);
        if (pieces[cursor]?.value === ',') {
          cursor += 1;
          afterComma = true;
        } else if (pieces[cursor]?.value !== '}') {
          diagnose('object-separator', cursor);
          afterComma = false;
        }
      }
      if (!closed) diagnose('object-close', cursor);
      return { node: { kind: 'object', entries, start: piece.start, end: pieces[Math.max(start, cursor - 1)]?.end ?? content.length }, next: cursor };
    }
    if (piece.value === '[') {
      const items = [];
      let cursor = start + 1;
      let closed = false;
      let afterComma = false;
      while (cursor < pieces.length) {
        if (pieces[cursor].value === ']') {
          if (afterComma && items.length) diagnose('array-trailing-comma', cursor);
          closed = true;
          cursor += 1;
          break;
        }
        if (pieces[cursor].value === ',') {
          diagnose('array-comma', cursor);
          cursor += 1;
          continue;
        }
        afterComma = false;
        const child = parseValue(cursor);
        items.push(child.node);
        cursor = Math.max(child.next, cursor + 1);
        if (pieces[cursor]?.value === ',') {
          cursor += 1;
          afterComma = true;
        } else if (pieces[cursor]?.value !== ']') {
          diagnose('array-separator', cursor);
          afterComma = false;
        }
      }
      if (!closed) diagnose('array-close', cursor);
      return { node: { kind: 'array', items, start: piece.start, end: pieces[Math.max(start, cursor - 1)]?.end ?? content.length }, next: cursor };
    }
    if (piece.kind === 'string' || piece.kind === 'bare') {
      if (piece.kind === 'bare' && !/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(piece.value)) diagnose('literal', start);
      return { node: { kind: 'scalar', value: piece.value, scalarKind: piece.kind, start: piece.start, end: piece.end }, next: start + 1 };
    }
    diagnose('value', start);
    return { node: { kind: 'missing', start: piece.start, end: piece.end }, next: start + 1 };
  };

  const roots = [];
  let cursor = 0;
  if (!pieces.length) diagnostics.push({ kind: 'empty', start: 0 });
  while (cursor < pieces.length) {
    const parsed = parseValue(cursor);
    roots.push(parsed.node);
    if (parsed.next <= cursor) {
      diagnose('progress', cursor);
      cursor += 1;
    } else {
      cursor = parsed.next;
    }
    if (cursor < pieces.length) diagnostics.push({ kind: 'trailing', start: pieces[cursor].start });
  }
  return { pieces, diagnostics, root: roots[0], roots };
}

function jsonNodeHasValue(node) {
  if (!node || node.kind === 'missing') return false;
  if (node.kind === 'scalar') return node.value.trim().length > 0 && node.value !== 'null';
  if (node.kind === 'array') return node.items.some(jsonNodeHasValue);
  return node.entries.length > 0;
}

function inspectJsonCredentials(content, path) {
  const document = jsonDocument(content, path);
  if (document.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
  const file = basename(path);
  const canUseMetadataExemptions = document.diagnostics.length === 0;
  const visit = (node, nodePath = []) => {
    if (!node) return;
    if (node.kind === 'object') {
      for (const entry of node.entries) {
        const packageRecord = file === 'package-lock.json' && nodePath.length === 1 && nodePath[0] === 'packages' && packageRecordPath(entry.key);
        if (isCredentialKey(entry.key) && jsonNodeHasValue(entry.value)
          && (!canUseMetadataExemptions || (!packageRecord && !dependencyContainerPath(nodePath, file)))) {
          report('CONTENT_SECRET_VALUE', path);
        }
        visit(entry.value, [...nodePath, entry.key]);
      }
    } else if (node.kind === 'array') {
      for (const item of node.items) visit(item, nodePath);
    }
  };
  for (const rootNode of document.roots) visit(rootNode);
}

function indentation(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function hasIndentedBlock(lines, lineIndex, baseIndent) {
  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    if (indentation(lines[index]) <= baseIndent) return false;
    if (!trimmed.startsWith('#')) return true;
  }
  return false;
}

function scalarValue(value) {
  return value.replace(/(?:\s+#.*)?[;,}\]]*\s*$/, '').trim();
}

function yamlCommentFree(value) {
  let quote = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === "'" && quote === "'" && value[index + 1] === "'") {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '#' && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }
  return value;
}

function yamlScalarInput(rawValue) {
  let value = yamlCommentFree(rawValue).trim();
  while (/^(?:!(?:<[^>]*>|[^\s]+)|&[^\s]+)\s*/.test(value)) value = value.replace(/^(?:!(?:<[^>]*>|[^\s]+)|&[^\s]+)\s*/, '');
  return value;
}

function yamlQuotedCandidate(rawValue) {
  const value = yamlScalarInput(rawValue);
  if (value[0] !== '"' && value[0] !== "'") return undefined;
  return {
    value,
    quoted: value[0] === '"' ? readYamlDoubleQuotedText(value, 0) : readYamlSingleQuotedText(value, 0),
  };
}

function yamlScalar(rawValue) {
  const value = yamlScalarInput(rawValue);
  if (value[0] === '"' || value[0] === "'") {
    const quoted = yamlQuotedCandidate(rawValue).quoted;
    return { value: quoted.value, diagnostics: quoted.closed && quoted.valid !== false && !value.slice(quoted.end).trim() ? [] : [{ kind: 'scalar' }] };
  }
  return { value: scalarValue(value), diagnostics: [] };
}

function yamlMultilineScalar(lines, lineIndex, rawValue, indent) {
  let combined = rawValue;
  let scalar = yamlScalar(combined);
  let candidate = yamlQuotedCandidate(combined);
  let end = lineIndex;
  if (!candidate || candidate.quoted.closed || !scalar.diagnostics.length) return { scalar, end };

  while (end + 1 < lines.length) {
    const next = lines[end + 1];
    if (next.trim() && indentation(next) <= indent) break;
    combined += `\n${next}`;
    end += 1;
    scalar = yamlScalar(combined);
    candidate = yamlQuotedCandidate(combined);
    if (candidate?.quoted.closed) return { scalar, end };
  }
  return { scalar, end };
}

function yamlMappingColon(value) {
  const stack = [];
  let quote = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === "'" && quote === "'" && value[index + 1] === "'") {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '{' || character === '[') {
      stack.push(character);
    } else if (character === '}' || character === ']') {
      const expected = character === '}' ? '{' : '[';
      if (stack.at(-1) !== expected) return { index: -1, diagnostics: [{ kind: 'flow-close' }] };
      stack.pop();
    } else if (character === ':' && !stack.length) {
      return { index, diagnostics: [] };
    }
  }
  return { index: -1, diagnostics: quote || stack.length ? [{ kind: 'flow-open' }] : [] };
}

function yamlKey(rawValue) {
  const scalar = yamlScalar(rawValue);
  return { key: scalar.value || undefined, diagnostics: scalar.diagnostics };
}

function yamlLine(line) {
  const indent = indentation(line);
  let body = line.slice(indent).trimEnd();
  const diagnostics = [];
  if (!body || body.startsWith('#')) return undefined;
  const sequence = /^-\s+(?:.*)$/.test(body);
  if (sequence) body = body.replace(/^-\s+/, '');
  const explicitKey = body.match(/^\?\s+(.+?)\s*$/);
  if (explicitKey) {
    const key = yamlKey(explicitKey[1]);
    return { kind: 'explicit-key', indent, sequence, key: key.key, diagnostics: key.diagnostics };
  }
  const explicitValue = body.match(/^:\s*(.*)$/);
  if (explicitValue) return { kind: 'explicit-value', indent, sequence, value: explicitValue[1], diagnostics };
  const colon = yamlMappingColon(body);
  diagnostics.push(...colon.diagnostics);
  if (colon.index === -1) return { kind: 'other', indent, sequence, diagnostics };
  const key = yamlKey(body.slice(0, colon.index).trim());
  diagnostics.push(...key.diagnostics);
  if (!key.key) return { kind: 'other', indent, sequence, diagnostics };
  return { kind: 'mapping', indent, sequence, key: key.key, value: body.slice(colon.index + 1), diagnostics };
}

function yamlFlowAssignments(value) {
  const assignments = [];
  const diagnostics = [];
  const stack = [];
  let quote = '';
  let rootStart = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === "'" && quote === "'" && value[index + 1] === "'") {
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[') {
      stack.push({ opening: character, segmentStart: index + 1 });
      continue;
    }
    if (character === '}' || character === ']') {
      const expected = character === '}' ? '{' : '[';
      if (stack.at(-1)?.opening !== expected) diagnostics.push({ kind: 'flow-close' });
      else stack.pop();
      continue;
    }
    if (character === ',') {
      if (stack.length) stack.at(-1).segmentStart = index + 1;
      else rootStart = index + 1;
      continue;
    }
    if (character !== ':') continue;
    const start = stack.length ? stack.at(-1).segmentStart : rootStart;
    const key = yamlKey(value.slice(start, index).trim());
    diagnostics.push(...key.diagnostics);
    if (key.key) assignments.push({ key: key.key, value: value.slice(index + 1) });
  }
  if (quote || stack.length) diagnostics.push({ kind: 'flow-open' });
  return { assignments, diagnostics };
}

function inspectYamlCredentials(content, path) {
  const lines = content.split(/\r?\n/);
  const active = [];
  let explicit;

  const inspectAssignment = (key, scalar, indent) => {
    if (scalar.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
    if (!isCredentialKey(key)) return;
    const block = /^(?:[|>][-+0-9]*)$/.test(scalar.value);
    if (block || !scalar.value) {
      active.push({ indent });
    } else {
      report('CONTENT_SECRET_VALUE', path);
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (/^[ \t]*\t/.test(lines[lineIndex])) report('CONTENT_PARSE_ERROR', path);
    const entry = yamlLine(lines[lineIndex]);
    if (!entry) continue;
    if (entry.diagnostics.length) report('CONTENT_PARSE_ERROR', path);

    const nestedChild = active.length && (entry.indent > active.at(-1).indent || (entry.sequence && entry.indent === active.at(-1).indent));
    if (nestedChild) report('CONTENT_SECRET_VALUE', path);
    while (active.length && !nestedChild && entry.indent <= active.at(-1).indent) active.pop();

    if (entry.kind === 'explicit-key') {
      explicit = entry.key ? { indent: entry.indent, key: entry.key } : undefined;
    } else if (entry.kind === 'explicit-value' && explicit?.indent === entry.indent) {
      const detail = yamlMultilineScalar(lines, lineIndex, entry.value, entry.indent);
      inspectAssignment(explicit.key, detail.scalar, entry.indent);
      lineIndex = detail.end;
      explicit = undefined;
    } else if (entry.kind === 'mapping') {
      explicit = undefined;
      const detail = yamlMultilineScalar(lines, lineIndex, entry.value, entry.indent);
      inspectAssignment(entry.key, detail.scalar, entry.indent);
      lineIndex = detail.end;
    } else if (entry.kind !== 'other') {
      explicit = undefined;
    }

    if (/[{[]/.test(lines[lineIndex])) {
      const flow = yamlFlowAssignments(yamlCommentFree(lines[lineIndex]));
      if (flow.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
      for (const assignment of flow.assignments) {
        if (isCredentialKey(assignment.key) && yamlScalar(assignment.value).value) report('CONTENT_SECRET_VALUE', path);
      }
    }
  }
}

function inspectGeneralCredentials(content, path) {
  const lines = content.split(/\r?\n/);
  const assignment = /^\s*(?:[-{,]\s*)?(?:export\s+)?(?:(?:const|let|var)\s+)?(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][A-Za-z0-9_$.-]*))\s*[:=]\s*(.*)$/;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const match = lines[lineIndex].match(assignment);
    if (!match) continue;
    const key = match[1] ?? match[2] ?? match[3];
    if (!isCredentialKey(key)) continue;
    const value = scalarValue(match[4]);
    if (/^[|>]-?$/.test(value)) {
      if (hasIndentedBlock(lines, lineIndex, indentation(lines[lineIndex]))) report('CONTENT_SECRET_VALUE', path);
    } else if (value) {
      report('CONTENT_SECRET_VALUE', path);
    }
  }
}

function piecePairs(pieces) {
  const pairs = new Map();
  const diagnostics = [];
  const opening = new Map([['(', ')'], ['[', ']'], ['{', '}']]);
  const closing = new Map([[')', '('], [']', '['], ['}', '{']]);
  const stack = [];
  for (let index = 0; index < pieces.length; index += 1) {
    if (pieces[index].kind !== 'punctuation') continue;
    const value = pieces[index].value;
    if (opening.has(value)) {
      stack.push(index);
    } else if (closing.has(value)) {
      const expected = closing.get(value);
      const start = stack.pop();
      if (start === undefined || pieces[start].value !== expected) {
        diagnostics.push({ kind: 'delimiter', start: pieces[index].start });
      } else {
        pairs.set(start, index);
        pairs.set(index, start);
      }
    }
  }
  for (const index of stack) diagnostics.push({ kind: 'delimiter', start: pieces[index].start });
  return { pairs, diagnostics };
}

function scriptAnalysis(content) {
  const lexed = scriptPieces(content);
  const paired = piecePairs(lexed.pieces);
  return { pieces: lexed.pieces, pairs: paired.pairs, diagnostics: [...lexed.diagnostics, ...paired.diagnostics] };
}

function markPieceRange(marks, from, to) {
  for (let index = from; index <= to; index += 1) marks.add(index);
}

function hasLineBreak(content, left, right) {
  return /\r?\n/.test(content.slice(left?.end ?? 0, right?.start ?? content.length));
}

function statementEnd(content, pieces, start) {
  const stack = [];
  const opening = new Set(['(', '[', '{']);
  const closing = new Set([')', ']', '}']);
  const runtimeStarters = new Set(['const', 'let', 'var', 'class', 'function', 'export', 'declare', 'interface', 'type', 'enum', 'namespace']);
  const assignmentOperators = new Set(['=', '||=', '??=', '&&=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
  for (let index = start; index < pieces.length; index += 1) {
    const value = pieces[index].value;
    if (opening.has(value)) stack.push(value);
    else if (closing.has(value)) stack.pop();
    else if (value === ';' && !stack.length) return index;
    const runtimeAssignment = pieces[index].kind === 'word' && assignmentOperators.has(pieces[index + 1]?.value);
    if (!stack.length && index > start && hasLineBreak(content, pieces[index - 1], pieces[index])
      && (runtimeStarters.has(value) || runtimeAssignment)) return index - 1;
  }
  return pieces.length - 1;
}

function declarationStart(pieces, index) {
  const before = pieces[index - 1]?.value;
  // A leading object member may be named `type`; it is never a declaration.
  return before === undefined || before === 'export' || before === 'declare' || [';', '}'].includes(before);
}

function braceAfter(pieces, start, limit = pieces.length) {
  for (let index = start; index < limit; index += 1) {
    if (pieces[index].value === '{') return index;
    if (pieces[index].value === ';') return -1;
  }
  return -1;
}

function topLevelTypeEnd(pieces, start, limit) {
  const stack = [];
  let angles = 0;
  for (let index = start; index < limit; index += 1) {
    const value = pieces[index].value;
    if (value === '<') {
      angles += 1;
      continue;
    }
    if (value === '>' && angles) {
      angles -= 1;
      continue;
    }
    if (value === '(' || value === '[' || value === '{') {
      if (!stack.length && value === '{' && index > start && !['&', '|', ':', ',', '<', '(', '=>'].includes(pieces[index - 1]?.value)) return index;
      stack.push(value);
      continue;
    }
    if (value === ')' || value === ']' || value === '}') {
      if (stack.length) stack.pop();
      else return index;
      continue;
    }
    if (!stack.length && !angles && value === '=>' && pieces[index - 1]?.value === ')') continue;
    if (!stack.length && !angles && [';', '=', ',', '=>'].includes(value)) return index;
  }
  return limit;
}

function markParameterTypes(pieces, pairs, marks, parameterOpen, parameterClose) {
  const parameterStack = [];
  for (let index = parameterOpen + 1; index < parameterClose; index += 1) {
    const value = pieces[index].value;
    if (['(', '[', '{'].includes(value)) {
      parameterStack.push(value);
      continue;
    }
    if ([')', ']', '}'].includes(value)) {
      parameterStack.pop();
      continue;
    }
    if (value !== ':' || parameterStack.length) continue;
    const end = topLevelTypeEnd(pieces, index + 1, parameterClose);
    markPieceRange(marks, index + 1, Math.max(index + 1, end - 1));
    index = Math.max(index, end - 1);
  }
}

function markFunctionTypes(content, pieces, pairs, marks, functionIndex) {
  let parameterOpen = -1;
  for (let index = functionIndex + 1; index < pieces.length; index += 1) {
    if (pieces[index].value === '(' && pairs.has(index)) {
      parameterOpen = index;
      break;
    }
    if (pieces[index].value === ';' || (index > functionIndex && hasLineBreak(content, pieces[index - 1], pieces[index]) && pieces[index].value === 'const')) return;
  }
  if (parameterOpen === -1) return;
  const parameterClose = pairs.get(parameterOpen);
  for (let index = functionIndex + 1; index < parameterOpen; index += 1) {
    if (pieces[index].value === 'extends') markPieceRange(marks, index + 1, parameterOpen - 1);
  }
  markParameterTypes(pieces, pairs, marks, parameterOpen, parameterClose);

  if (pieces[parameterClose + 1]?.value === ':') {
    const end = topLevelTypeEnd(pieces, parameterClose + 2, pieces.length);
    markPieceRange(marks, parameterClose + 2, Math.max(parameterClose + 2, end - 1));
  }
}

function markClassFieldTypes(pieces, pairs, marks, opening) {
  const closing = pairs.get(opening) ?? opening;
  const stack = [];
  for (let index = opening + 1; index < closing; index += 1) {
    const value = pieces[index].value;
    if (['(', '[', '{'].includes(value)) {
      if (value === '(' && !stack.length && pairs.has(index)) markParameterTypes(pieces, pairs, marks, index, pairs.get(index));
      stack.push(value);
      continue;
    }
    if ([')', ']', '}'].includes(value)) {
      stack.pop();
      continue;
    }
    if (value !== ':' || stack.length) continue;
    const end = topLevelTypeEnd(pieces, index + 1, closing);
    markPieceRange(marks, index + 1, Math.max(index + 1, end - 1));
    index = Math.max(index, end - 1);
  }
}

function markVariableTypes(content, pieces, marks) {
  for (let start = 0; start < pieces.length; start += 1) {
    if (!['const', 'let', 'var'].includes(pieces[start].value)) continue;
    const end = statementEnd(content, pieces, start + 1);
    const stack = [];
    for (let index = start + 1; index <= end; index += 1) {
      const value = pieces[index].value;
      if (['(', '[', '{'].includes(value)) {
        stack.push(value);
        continue;
      }
      if ([')', ']', '}'].includes(value)) {
        stack.pop();
        continue;
      }
      if (value !== ':' || stack.length) continue;
      const typeEnd = topLevelTypeEnd(pieces, index + 1, end + 1);
      markPieceRange(marks, index + 1, Math.max(index + 1, typeEnd - 1));
      index = Math.max(index, typeEnd - 1);
    }
    start = Math.max(start, end);
  }
}

function isTypeAliasDeclaration(pieces, index) {
  if (!declarationStart(pieces, index) || pieces[index + 1]?.kind !== 'word') return false;
  const nesting = [];
  let angles = 0;
  for (let cursor = index + 2; cursor < pieces.length; cursor += 1) {
    const value = pieces[cursor].value;
    if (['(', '[', '{'].includes(value)) {
      nesting.push(value);
      continue;
    }
    if ([')', ']', '}'].includes(value)) {
      nesting.pop();
      continue;
    }
    if (nesting.length) continue;
    if (value === '<') {
      angles += 1;
      continue;
    }
    if (value === '>' && angles) {
      angles -= 1;
      continue;
    }
    if (!angles && value === '=') return true;
    if (!angles && (value === ';' || value === '=>')) return false;
  }
  return false;
}

function isInterfaceDeclaration(pieces, index) {
  return declarationStart(pieces, index) && pieces[index + 1]?.kind === 'word';
}

function isDeclareDeclaration(pieces, index) {
  if (!declarationStart(pieces, index)) return false;
  return new Set(['const', 'let', 'var', 'function', 'class', 'abstract', 'namespace', 'module', 'enum', 'interface', 'type']).has(pieces[index + 1]?.value);
}

function isTypeAssertionToken(pieces, index) {
  const before = pieces[index - 1];
  const after = pieces[index + 1];
  const valueLike = before && (before.kind === 'word' || before.kind === 'string' || before.kind === 'number' || [')', ']', '}'].includes(before.value));
  if (!valueLike || !after || ['.', '?.', ':', '=', ';', ','].includes(before.value)) return false;
  return ![':', '=', ';', ',', ')', ']'].includes(after.value);
}

function classBodyOpening(pieces, index) {
  if (pieces[index + 1]?.value === ':') return -1;
  for (let cursor = index + 1; cursor < pieces.length; cursor += 1) {
    const value = pieces[cursor].value;
    if (value === '{') return cursor;
    if ([';', '=', ',', ')', '=>'].includes(value)) return -1;
  }
  return -1;
}

function genericMethodNameIndex(pieces, open) {
  let cursor = open - 1;
  if (pieces[cursor]?.value !== '>') return cursor;
  let depth = 0;
  for (; cursor >= 0; cursor -= 1) {
    if (pieces[cursor].value === '>') depth += 1;
    else if (pieces[cursor].value === '<') {
      depth -= 1;
      if (!depth) return cursor - 1;
    }
  }
  return -1;
}

function genericMethodStart(pieces, open) {
  if (pieces[open - 1]?.value !== '>') return -1;
  let depth = 0;
  for (let cursor = open - 1; cursor >= 0; cursor -= 1) {
    if (pieces[cursor].value === '>') depth += 1;
    else if (pieces[cursor].value === '<') {
      depth -= 1;
      if (!depth) return cursor;
    }
  }
  return -1;
}

function methodNameShape(pieces, pairs, open) {
  const nameIndex = genericMethodNameIndex(pieces, open);
  if (pieces[nameIndex]?.kind === 'word') {
    const beforeIndex = pieces[nameIndex - 1]?.value === '#' ? nameIndex - 2 : nameIndex - 1;
    return { nameIndex, beforeIndex };
  }
  if (pieces[nameIndex]?.value !== ']' || !pairs.has(nameIndex)) return undefined;
  const opening = pairs.get(nameIndex);
  return pieces[opening]?.value === '[' ? { nameIndex, beforeIndex: opening - 1 } : undefined;
}

function objectMethodSignature(pieces, pairs, open, close) {
  let body = close + 1;
  let returnStart = -1;
  if (pieces[body]?.value === ':') {
    returnStart = body + 1;
    body = topLevelTypeEnd(pieces, returnStart, pieces.length);
  }
  if (pieces[body]?.value !== '{') return undefined;

  const shape = methodNameShape(pieces, pairs, open);
  if (!shape) return undefined;
  const name = pieces[shape.nameIndex];
  if (name.kind === 'word' && new Set(['if', 'for', 'while', 'switch', 'catch', 'with']).has(name.value)) return undefined;
  const beforeName = pieces[shape.beforeIndex]?.value;
  if (!['{', ',', ';'].includes(beforeName)
    && !new Set(['public', 'private', 'protected', 'static', 'async', 'get', 'set', 'readonly', 'abstract']).has(beforeName)) return undefined;
  return { body, returnStart, genericStart: genericMethodStart(pieces, open) };
}

function typePieceMarks(content, pieces, pairs) {
  const marks = new Set();
  for (let index = 0; index < pieces.length; index += 1) {
    const value = pieces[index].value;
    if (value === 'type' && isTypeAliasDeclaration(pieces, index)) {
      markPieceRange(marks, index, statementEnd(content, pieces, index + 1));
    } else if (value === 'interface' && isInterfaceDeclaration(pieces, index)) {
      const opening = braceAfter(pieces, index + 1);
      if (opening !== -1) markPieceRange(marks, index, pairs.get(opening) ?? opening);
    } else if (value === 'declare' && isDeclareDeclaration(pieces, index)) {
      const end = statementEnd(content, pieces, index + 1);
      const classIndex = pieces.slice(index + 1, end + 1).findIndex(piece => piece.value === 'class');
      const opening = classIndex === -1 ? -1 : braceAfter(pieces, index + classIndex + 2, end + 1);
      markPieceRange(marks, index, opening === -1 ? end : pairs.get(opening) ?? opening);
    } else if (value === 'function') {
      markFunctionTypes(content, pieces, pairs, marks, index);
    } else if (value === 'class') {
      const opening = classBodyOpening(pieces, index);
      if (opening !== -1) markClassFieldTypes(pieces, pairs, marks, opening);
    }
  }

  markVariableTypes(content, pieces, marks);

  for (let index = 0; index < pieces.length; index += 1) {
    if (pieces[index].value === '(' && pairs.has(index)) {
      const closing = pairs.get(index);
      if (pieces[closing + 1]?.value === '=>') markParameterTypes(pieces, pairs, marks, index, closing);
      else {
        const method = objectMethodSignature(pieces, pairs, index, closing);
        if (method) {
          if (method.genericStart !== -1) markPieceRange(marks, method.genericStart, index - 1);
          markParameterTypes(pieces, pairs, marks, index, closing);
          if (method.returnStart !== -1) markPieceRange(marks, method.returnStart, Math.max(method.returnStart, method.body - 1));
        }
      }
    }
    if (pieces[index].value === ')' && pieces[index + 1]?.value === ':' && pieces[index + 2]) {
      const end = topLevelTypeEnd(pieces, index + 2, pieces.length);
      if (pieces[end]?.value === '=>') markPieceRange(marks, index + 2, Math.max(index + 2, end - 1));
    }
    if ((pieces[index].value === 'as' || pieces[index].value === 'satisfies') && isTypeAssertionToken(pieces, index)) {
      const end = topLevelTypeEnd(pieces, index + 1, pieces.length);
      markPieceRange(marks, index + 1, Math.max(index + 1, end - 1));
    }
    if (pieces[index].value === ':' && pieces[index + 1]?.value === '{' && pairs.has(index + 1)) {
      const closing = pairs.get(index + 1);
      if (['=', ';', '=>'].includes(pieces[closing + 1]?.value)) markPieceRange(marks, index + 1, closing);
    }
  }
  return marks;
}

function staticScriptKey(piece) {
  if (!piece || (piece.kind !== 'word' && piece.kind !== 'string')) return undefined;
  return piece.value;
}

function nextSyntacticPieceIndex(pieces, index) {
  const container = pieces[index];
  let cursor = index + 1;
  while (cursor < pieces.length && pieces[cursor].start >= container.start && pieces[cursor].end <= container.end) cursor += 1;
  return cursor;
}

const scriptAssignmentOperators = new Set(['=', ':', '||=', '??=', '&&=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);

function assignedValueIndex(pieces, index, marks = new Set()) {
  const assignmentOperators = new Set(['=', ':', '||=', '??=', '&&=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
  const nextIndex = nextSyntacticPieceIndex(pieces, index);
  const next = pieces[nextIndex]?.value;
  if (next === ':' && marks.has(nextIndex + 1)) {
    let cursor = nextIndex + 1;
    while (cursor < pieces.length && marks.has(cursor)) cursor += 1;
    return assignmentOperators.has(pieces[cursor]?.value) ? cursor + 1 : -1;
  }
  if (assignmentOperators.has(next)) return nextIndex + 1;
  if (pieces[index - 1]?.value === '[' && next === ']' && assignmentOperators.has(pieces[nextIndex + 1]?.value)) return nextIndex + 2;
  return -1;
}

function staticScriptExpressionValue(pieces, pairs, from, to, resolveIdentifier = undefined) {
  const readTerm = (start, end) => {
    const piece = pieces[start];
    if (!piece || start >= end) return undefined;
    if (piece.value === '(' && pairs.has(start)) {
      const close = pairs.get(start);
      if (close >= end) return undefined;
      const value = staticScriptExpressionValue(pieces, pairs, start + 1, close, resolveIdentifier);
      return value === undefined ? undefined : { value, next: close + 1 };
    }
    if (piece.kind === 'string') return { value: piece.value, next: nextSyntacticPieceIndex(pieces, start) };
    if (piece.kind === 'word' && resolveIdentifier) {
      const value = resolveIdentifier(piece.value, start);
      return value === undefined ? undefined : { value, next: nextSyntacticPieceIndex(pieces, start) };
    }
    return undefined;
  };

  let cursor = from;
  let value = '';
  let hasTerm = false;
  while (cursor < to) {
    const term = readTerm(cursor, to);
    if (!term) return undefined;
    value += term.value;
    hasTerm = true;
    cursor = term.next;
    if (cursor === to) return value;
    if (pieces[cursor]?.value !== '+') return undefined;
    cursor += 1;
  }
  return hasTerm ? value : undefined;
}

function computedKeyFragments(pieces, from, to) {
  const fragments = [];
  for (let index = from; index < to; index += 1) {
    const piece = pieces[index];
    if (piece.kind === 'string' || piece.kind === 'template') {
      fragments.push(piece.kind === 'template' ? piece.value.replace(/\$\{[^}]*\}/g, ' ') : piece.value);
      index = nextSyntacticPieceIndex(pieces, index) - 1;
    }
  }
  return fragments.join('').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

function potentiallyCredentialFragment(value) {
  if (!value) return false;
  return ['secret', 'password', 'passwd', 'mnemonic', 'credential', 'apikey', 'privatekey', 'accesskey', 'token']
    .some(family => family.startsWith(value) || family.endsWith(value) || value.includes(family));
}

function scopePathAt(pieces, pairs, index) {
  const path = [];
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (pieces[cursor].value === '{' && pairs.has(cursor) && pairs.get(cursor) >= index) path.push(cursor);
  }
  return path;
}

function callableBodyAfterParameters(pieces, close) {
  if (pieces[close + 1]?.value === '{') return close + 1;
  if (pieces[close + 1]?.value !== ':') return -1;
  const body = topLevelTypeEnd(pieces, close + 2, pieces.length);
  return pieces[body]?.value === '{' ? body : -1;
}

function functionParameterOpening(pieces, pairs, functionIndex) {
  let angles = 0;
  for (let cursor = functionIndex + 1; cursor < pieces.length; cursor += 1) {
    const value = pieces[cursor].value;
    if (value === '<') {
      angles += 1;
      continue;
    }
    if (value === '>' && angles) {
      angles -= 1;
      continue;
    }
    if (value === '(' && !angles && pairs.has(cursor)) return cursor;
    if (angles && ['(', '[', '{'].includes(value) && pairs.has(cursor)) {
      cursor = pairs.get(cursor);
      continue;
    }
    if (!angles && ['{', ';', '=>'].includes(value)) return -1;
  }
  return -1;
}

function functionBodyOpenings(pieces, pairs) {
  const openings = new Set();
  for (let index = 0; index < pieces.length; index += 1) {
    if (pieces[index].value === 'function') {
      const parameters = functionParameterOpening(pieces, pairs, index);
      if (parameters !== -1) {
        const body = callableBodyAfterParameters(pieces, pairs.get(parameters));
        if (body !== -1) openings.add(body);
      }
    }
    if (pieces[index].value === '=>' && pieces[index + 1]?.value === '{') openings.add(index + 1);
    if (pieces[index].value === '(' && pairs.has(index)) {
      const method = objectMethodSignature(pieces, pairs, index, pairs.get(index));
      if (method) openings.add(method.body);
    }
  }
  return openings;
}

function functionScopePathAt(pieces, pairs, functionBodies, index) {
  const path = [];
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (functionBodies.has(cursor) && pairs.get(cursor) >= index) path.push(cursor);
  }
  return path;
}

function isScopePrefix(scope, path) {
  return scope.length <= path.length && scope.every((value, index) => path[index] === value);
}

function sameScope(left, right) {
  return left.length === right.length && left.every((value, index) => right[index] === value);
}

function nextTopLevelBoundary(pieces, pairs, start, limit, values) {
  for (let cursor = start; cursor < limit; cursor += 1) {
    const piece = pieces[cursor];
    if (['(', '[', '{'].includes(piece.value) && pairs.has(cursor)) {
      cursor = pairs.get(cursor);
      continue;
    }
    if (values.has(piece.value)) return cursor;
  }
  return limit;
}

function variableBindings(content, pieces, pairs, functionBodies) {
  const bindings = [];
  const existingVarBinding = (name, scope) => bindings.find(binding => (
    binding.declarationKind === 'var' && binding.name === name && sameScope(binding.scope, scope)
  ));
  for (let index = 0; index < pieces.length; index += 1) {
    const declarationKind = pieces[index].value;
    if (!['const', 'let', 'var'].includes(declarationKind)) continue;
    const statementLimit = statementEnd(content, pieces, index + 1);
    let cursor = index + 1;
    while (cursor <= statementLimit) {
      const name = pieces[cursor];
      if (name?.kind !== 'word') break;
      const equals = nextTopLevelBoundary(pieces, pairs, cursor + 1, statementLimit + 1, new Set(['=', ',', ';']));
      const scopeKind = declarationKind === 'var' ? 'function' : 'lexical';
      const scope = scopeKind === 'function'
        ? functionScopePathAt(pieces, pairs, functionBodies, cursor)
        : scopePathAt(pieces, pairs, cursor);
      const hasInitializer = pieces[equals]?.value === '=';
      const expressionStart = hasInitializer ? equals + 1 : -1;
      const expressionEnd = hasInitializer
        ? nextTopLevelBoundary(pieces, pairs, expressionStart, statementLimit + 1, new Set([',', ';']))
        : -1;
      if (declarationKind === 'var') {
        // JavaScript `var` declarations share one function/program binding.
        // Each initializer is a source-ordered write; a bare redeclaration is
        // deliberately not a write and must not discard an earlier value.
        const binding = existingVarBinding(name.value, scope) ?? {
          name: name.value,
          declaration: cursor,
          declarations: new Set(),
          initializers: [],
          scope,
          scopeKind,
          declarationKind,
          expressionStart: -1,
          expressionEnd: -1,
          scanFrom: scope.at(-1) === undefined ? 0 : scope.at(-1) + 1,
        };
        if (!bindings.includes(binding)) bindings.push(binding);
        binding.declarations.add(cursor);
        if (hasInitializer) {
          binding.initializers.push({
            index: equals,
            operator: '=',
            valueIndex: expressionStart,
            expressionEnd,
            lexicalScope: scopePathAt(pieces, pairs, equals),
            functionScope: functionScopePathAt(pieces, pairs, functionBodies, equals),
          });
        }
      } else {
        bindings.push({
          name: name.value,
          declaration: cursor,
          declarations: new Set([cursor]),
          scope,
          scopeKind,
          declarationKind,
          expressionStart,
          expressionEnd,
          scanFrom: hasInitializer ? expressionStart : cursor + 1,
        });
      }
      if (pieces[equals]?.value !== '=') {
        if (pieces[equals]?.value !== ',') break;
        cursor = equals + 1;
        continue;
      }
      cursor = expressionEnd + 1;
    }
    index = Math.max(index, statementLimit);
  }
  return bindings;
}

function parameterBodyOpening(pieces, open, close) {
  const previous = pieces[open - 1]?.value;
  const nameIndex = genericMethodNameIndex(pieces, open);
  const namedFunction = pieces[nameIndex - 1]?.value === 'function' && pieces[nameIndex]?.kind === 'word';
  const anonymousFunction = previous === 'function';
  const catchParameter = previous === 'catch';
  if (!namedFunction && !anonymousFunction && !catchParameter) return -1;
  return callableBodyAfterParameters(pieces, close);
}

function simpleParameterBindings(pieces, pairs, functionBodies) {
  const bindings = [];
  for (let open = 0; open < pieces.length; open += 1) {
    if (pieces[open].value !== '(' || !pairs.has(open)) continue;
    const close = pairs.get(open);
    const body = parameterBodyOpening(pieces, open, close);
    const method = body < 0 ? objectMethodSignature(pieces, pairs, open, close) : undefined;
    const parameterBody = body < 0 ? method?.body ?? -1 : body;
    if (parameterBody < 0) continue;
    const scopeKind = pieces[open - 1]?.value === 'catch' ? 'lexical' : 'function';

    const scope = scopeKind === 'function'
      ? functionScopePathAt(pieces, pairs, functionBodies, parameterBody + 1)
      : scopePathAt(pieces, pairs, parameterBody + 1);
    let segmentStart = open + 1;
    let nesting = 0;
    for (let cursor = open + 1; cursor <= close; cursor += 1) {
      const piece = pieces[cursor];
      const boundary = cursor === close || (nesting === 0 && piece.value === ',');
      if (boundary) {
        const nameOffset = pieces.slice(segmentStart, cursor).findIndex(candidate => candidate.kind === 'word');
        const name = nameOffset === -1 ? undefined : pieces[segmentStart + nameOffset];
        if (name && !['this', 'public', 'private', 'protected', 'readonly'].includes(name.value)) {
          bindings.push({
            name: name.value,
            declaration: segmentStart + nameOffset,
            scope,
            scopeKind,
            declarationKind: 'parameter',
            expressionStart: -1,
            expressionEnd: -1,
            scanFrom: parameterBody + 1,
          });
        }
        segmentStart = cursor + 1;
        continue;
      }
      if (['(', '[', '{', '<'].includes(piece.value)) nesting += 1;
      if ([')', ']', '}', '>'].includes(piece.value)) nesting -= 1;
    }
  }
  return bindings;
}

function scriptBindingResolver(content, pieces, pairs) {
  const functionBodies = functionBodyOpenings(pieces, pairs);
  const bindings = [...variableBindings(content, pieces, pairs, functionBodies), ...simpleParameterBindings(pieces, pairs, functionBodies)];
  const findBinding = (name, useIndex) => {
    return bindings
      .filter((binding) => {
        if (binding.name !== name) return false;
        if (binding.declarationKind !== 'var' && binding.declaration >= useIndex) return false;
        const path = binding.scopeKind === 'function'
          ? functionScopePathAt(pieces, pairs, functionBodies, useIndex)
          : scopePathAt(pieces, pairs, useIndex);
        return isScopePrefix(binding.scope, path);
      })
      .sort((left, right) => right.scope.length - left.scope.length || right.declaration - left.declaration)[0];
  };

  const isDeclaration = index => bindings.some(candidate => (
    candidate.declaration === index || candidate.declarations?.has(index)
  ));
  const writesFor = (binding, useIndex) => {
    const writes = [];
    for (let index = binding.scanFrom; index < useIndex; index += 1) {
      if (pieces[index]?.kind !== 'word' || pieces[index].value !== binding.name) continue;
      if (isDeclaration(index)) continue;
      if (findBinding(binding.name, index) !== binding) continue;
      const valueIndex = assignedValueIndex(pieces, index);
      if (valueIndex !== -1) writes.push({ index, valueIndex });
    }
    return writes;
  };

  const insideExpressionDelimiter = index => {
    for (let cursor = 0; cursor < index; cursor += 1) {
      if (!['(', '['].includes(pieces[cursor]?.value) || !pairs.has(cursor)) continue;
      if (pairs.get(cursor) >= index) return true;
    }
    return false;
  };

  const unbracedControlBody = index => {
    const controls = new Set(['if', 'for', 'while', 'with']);
    const contains = start => {
      if (start > index || pieces[start]?.value === '{') return false;
      const end = nextTopLevelBoundary(pieces, pairs, start, pieces.length, new Set([';']));
      return index >= start && index <= end;
    };
    for (let cursor = 0; cursor < index; cursor += 1) {
      const value = pieces[cursor]?.value;
      if (value === 'else' || value === 'do') {
        if (contains(cursor + 1)) return true;
        continue;
      }
      if (!controls.has(value) || pieces[cursor + 1]?.value !== '(' || !pairs.has(cursor + 1)) continue;
      const close = pairs.get(cursor + 1);
      if (close < index && contains(close + 1)) return true;
    }
    return false;
  };

  const insideSwitchBody = index => {
    for (let cursor = 0; cursor < index; cursor += 1) {
      if (pieces[cursor]?.value !== 'switch' || pieces[cursor + 1]?.value !== '(' || !pairs.has(cursor + 1)) continue;
      const body = pairs.get(cursor + 1) + 1;
      if (pieces[body]?.value === '{' && pairs.has(body) && pairs.get(body) >= index) return true;
    }
    return false;
  };

  const ternaryArmWrite = index => {
    // A write in either arm is not a dominating overwrite. Scan only the
    // containing statement, so a completed earlier conditional cannot taint
    // a later ordinary statement-level assignment.
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const value = pieces[cursor]?.value;
      if ([';', '{', '}'].includes(value)) return false;
      if (value === '?') return true;
    }
    return false;
  };

  // Only an ordinary statement-level write can remove earlier possibilities.
  // Expression, loop-header, unbraced-control, switch-arm, and ternary-arm
  // writes are path-dependent. Treat them as possible values rather than
  // overwrites.
  const straightLineWrite = index => (
    !insideExpressionDelimiter(index)
    && !unbracedControlBody(index)
    && !insideSwitchBody(index)
    && !ternaryArmWrite(index)
  );

  const varWritesFor = (binding, useIndex) => {
    const writes = binding.initializers
      .filter(write => write.index < useIndex)
      .map(write => ({ ...write, straightLine: straightLineWrite(write.index) }));
    for (let index = binding.scanFrom; index < useIndex; index += 1) {
      if (pieces[index]?.kind !== 'word' || pieces[index].value !== binding.name || binding.declarations.has(index)) continue;
      if (findBinding(binding.name, index) !== binding) continue;
      const valueIndex = assignedValueIndex(pieces, index);
      if (valueIndex === -1) continue;
      writes.push({
        index,
        operator: pieces[nextSyntacticPieceIndex(pieces, index)]?.value,
        valueIndex,
        expressionEnd: nextTopLevelBoundary(pieces, pairs, valueIndex, useIndex, new Set([';', ','])),
        lexicalScope: scopePathAt(pieces, pairs, index),
        functionScope: functionScopePathAt(pieces, pairs, functionBodies, index),
        straightLine: straightLineWrite(index),
      });
    }
    return writes.sort((left, right) => left.index - right.index);
  };

  const varWriteState = (binding, useIndex) => {
    const useFunctionScope = functionScopePathAt(pieces, pairs, functionBodies, useIndex);
    const useLexicalScope = scopePathAt(pieces, pairs, useIndex);
    const definite = [];
    const uncertain = [];
    for (const write of varWritesFor(binding, useIndex)) {
      if (!sameScope(write.functionScope, useFunctionScope)) {
        if (isScopePrefix(write.functionScope, useFunctionScope)) uncertain.push(write);
        continue;
      }
      if (!write.straightLine || !isScopePrefix(write.lexicalScope, useLexicalScope)) uncertain.push(write);
      else definite.push(write);
    }
    const latest = definite.at(-1);
    return {
      latest,
      uncertain: uncertain.filter(write => !latest || write.index > latest.index),
    };
  };

  const writeValue = (write, stack) => {
    if (write.operator !== '=') return undefined;
    return staticScriptExpressionValue(pieces, pairs, write.valueIndex, write.expressionEnd, dependency => resolve(dependency, write.index, stack));
  };

  const writeIsSensitive = (write, stack) => {
    const value = writeValue(write, stack);
    if (value !== undefined) {
      const normalized = value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      return isCredentialKey(value) || potentiallyCredentialFragment(normalized);
    }
    return write.operator !== '=' || potentiallyCredentialFragment(computedKeyFragments(pieces, write.valueIndex, write.expressionEnd));
  };

  const initialValue = (binding, stack = new Set()) => {
    if (binding.expressionStart < 0) return undefined;
    if (stack.has(binding.declaration)) return undefined;
    const nextStack = new Set(stack).add(binding.declaration);
    return staticScriptExpressionValue(pieces, pairs, binding.expressionStart, binding.expressionEnd, name => {
      const dependency = findBinding(name, binding.declaration);
      return dependency ? initialValue(dependency, nextStack) : undefined;
    });
  };
  const resolve = (name, useIndex, stack = new Set()) => {
    const binding = findBinding(name, useIndex);
    if (binding?.declarationKind === 'var') {
      if (stack.has(binding.declaration)) return undefined;
      const state = varWriteState(binding, useIndex);
      if (!state.latest || state.uncertain.length) return undefined;
      return writeValue(state.latest, new Set(stack).add(binding.declaration));
    }
    if (!binding || binding.expressionStart < 0 || writesFor(binding, useIndex).length || stack.has(binding.declaration)) return undefined;
    const nextStack = new Set(stack).add(binding.declaration);
    return staticScriptExpressionValue(pieces, pairs, binding.expressionStart, binding.expressionEnd, dependency => resolve(dependency, binding.declaration, nextStack));
  };
  const isSensitiveBinding = (name, useIndex) => {
    const binding = findBinding(name, useIndex);
    if (!binding) return false;
    if (binding.declarationKind === 'var') {
      const state = varWriteState(binding, useIndex);
      if (state.latest && writeIsSensitive(state.latest, new Set([binding.declaration]))) return true;
      if (state.uncertain.some(write => writeIsSensitive(write, new Set([binding.declaration])))) return true;
      // A read before the first initializer is unknown, not a preview-safe
      // proof. Preserve the existing fail-closed treatment when a future
      // initializer is visibly credential-shaped without resolving to it.
      if (!state.latest && !state.uncertain.length) {
        return binding.initializers
          .filter(write => write.index >= useIndex)
          .some(write => writeIsSensitive(write, new Set([binding.declaration])));
      }
      return false;
    }
    if (isCredentialKey(binding.name)) return true;
    const initial = initialValue(binding);
    if (initial !== undefined && (isCredentialKey(initial) || potentiallyCredentialFragment(initial.replace(/[^A-Za-z0-9]/g, '').toLowerCase()))) return true;
    if (binding.expressionStart >= 0 && potentiallyCredentialFragment(computedKeyFragments(pieces, binding.expressionStart, binding.expressionEnd))) return true;
    for (const write of writesFor(binding, useIndex)) {
      const end = nextTopLevelBoundary(pieces, pairs, write.valueIndex, useIndex, new Set([';', ',']));
      const value = staticScriptExpressionValue(pieces, pairs, write.valueIndex, end, resolve);
      if (value !== undefined && (isCredentialKey(value) || potentiallyCredentialFragment(value.replace(/[^A-Za-z0-9]/g, '').toLowerCase()))) return true;
      if (potentiallyCredentialFragment(computedKeyFragments(pieces, write.valueIndex, end))) return true;
    }
    return false;
  };
  return { resolve, isSensitiveBinding };
}

function computedExpressionUsesCredentialishBinding(pieces, pairs, from, to, resolver) {
  for (let index = from; index < to; index += 1) {
    const piece = pieces[index];
    if (piece.kind === 'word' && resolver.isSensitiveBinding(piece.value, index)) return true;
    if (['(', '[', '{'].includes(piece.value) && pairs.has(index)) index = pairs.get(index);
  }
  return false;
}

function computedCredentialAssignments(content, pieces, pairs, marks) {
  const resolver = scriptBindingResolver(content, pieces, pairs);
  const assignments = [];
  for (let index = 0; index < pieces.length; index += 1) {
    if (pieces[index].value !== '[' || !pairs.has(index) || marks.has(index)) continue;
    const close = pairs.get(index);
    if (close < index || !scriptAssignmentOperators.has(pieces[close + 1]?.value)) continue;
    const valueIndex = close + 2;
    if (!scriptPieceHasValue(pieces, valueIndex)) continue;
    const staticKey = staticScriptExpressionValue(pieces, pairs, index + 1, close, resolver.resolve);
    const fragments = computedKeyFragments(pieces, index + 1, close);
    if (staticKey !== undefined && (isCredentialKey(staticKey) || potentiallyCredentialFragment(fragments))) {
      assignments.push({ valueIndex });
      continue;
    }
    // A dynamic computed key with credential-shaped static material cannot be
    // safely classified, so fail closed without flagging ordinary array slots.
    if (staticKey === undefined && (potentiallyCredentialFragment(fragments)
      || computedExpressionUsesCredentialishBinding(pieces, pairs, index + 1, close, resolver))) assignments.push({ valueIndex });
  }
  return assignments;
}

function scriptPieceHasValue(pieces, index) {
  const piece = pieces[index];
  if (!piece || [';', ',', '}', ']'].includes(piece.value)) return false;
  if (piece.kind === 'string') return piece.value.trim().length > 0;
  if (piece.kind === 'template' || piece.kind === 'regex') return true;
  if (piece.value === '[') return pieces[index + 1]?.value !== ']';
  if (piece.value === '{') return pieces[index + 1]?.value !== '}';
  return true;
}

function inspectScriptCredentials(content, path) {
  const analysis = scriptAnalysis(content);
  if (analysis.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
  const { pieces } = analysis;
  const marks = typePieceMarks(content, pieces, analysis.pairs);
  if (computedCredentialAssignments(content, pieces, analysis.pairs, marks).length) report('CONTENT_SECRET_VALUE', path);
  for (let index = 0; index < pieces.length; index += 1) {
    const key = staticScriptKey(pieces[index]);
    const valueIndex = assignedValueIndex(pieces, index, marks);
    if (valueIndex === -1 || marks.has(index) || !key || !isCredentialKey(key) || !scriptPieceHasValue(pieces, valueIndex)) continue;
    const expression = content.slice(pieces[valueIndex].start);
    if (isIntentionalCredentialHelper(key, expression)) continue;
    report('CONTENT_SECRET_VALUE', path);
  }
}

function inspectCredentials(content, path, syntax = syntaxForPath(path)) {
  if (syntax === 'json') {
    inspectJsonCredentials(content, path);
  } else if (syntax === 'yaml') {
    inspectYamlCredentials(content, path);
  } else if (syntax === 'script') {
    inspectScriptCredentials(content, path);
  } else if (syntax === 'markdown') {
    const fenced = markdownFences(content);
    if (fenced.diagnostics.length) report('CONTENT_PARSE_ERROR', path);
    for (const fence of fenced.fences) inspectCredentials(fence.content, path, fencedSyntax(fence.language));
  } else {
    inspectGeneralCredentials(content, path);
  }
}

function isText(buffer) {
  return !buffer.includes(0) && buffer.subarray(0, 4096).every(byte => byte === 9 || byte === 10 || byte === 13 || byte >= 32);
}

async function inspectFile(path) {
  const info = await lstat(path);
  if (info.mode & 0o111) report('PATH_EXECUTABLE', path);
  const buffer = await readFile(path);
  const metadata = buffer.toString('latin1');
  for (const [rule, pattern] of metadataPrivacyRules) {
    if (pattern.test(metadata)) report(rule, path);
  }
  const syntax = syntaxForPath(path);
  if (!isText(buffer) && syntax === 'text') return;
  if (!isText(buffer)) report('CONTENT_PARSE_ERROR', path);
  const content = buffer.toString('utf8');
  for (const [rule, pattern] of repositoryTextRules) {
    if (pattern.test(content)) report(rule, path);
  }
  inspectHandles(content, path);
  inspectCredentials(content, path);
  const rel = relative(root, path);
  if (basename(path) !== 'package-lock.json' && !rel.startsWith('scripts/') && !rel.startsWith('tests/') && !rel.endsWith('.svg')) {
    for (const [rule, pattern] of contentRules) {
      if (pattern.test(content)) report(rule, path);
    }
  }
}

async function inspectDirectory(directory, isRoot = false) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    inspectPath(path);
    if (entry.isSymbolicLink()) {
      report('PATH_SYMLINK', path);
    } else if (entry.isDirectory()) {
      if (!(isRoot && ignoredDirectories.has(entry.name))) await inspectDirectory(path);
    } else if (entry.isFile()) {
      await inspectFile(path);
    } else {
      report('PATH_NON_REGULAR', path);
    }
  }
}

try {
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error('Root must be a directory');
  await inspectDirectory(root, true);
} catch (error) {
  console.error(`SOURCE_SHARE_SAFE_ERROR ${error.message}`);
  process.exitCode = 1;
}

for (const [rule, path] of findings) {
  console.error(`SOURCE_SHARE_SAFE_${rule} ${relative(root, path) || '.'}`);
}
if (findings.size > 0) process.exitCode = 1;
