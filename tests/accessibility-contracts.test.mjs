import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, projectRoot), 'utf8');
}

function openingTagContaining(contents, marker) {
  const markerIndex = contents.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing source marker: ${marker}`);
  const start = contents.lastIndexOf('<', markerIndex);
  let end = contents.indexOf('>', markerIndex);
  while (end !== -1 && contents[end - 1] === '=') end = contents.indexOf('>', end + 1);
  assert.notEqual(start, -1, `Missing opening tag before: ${marker}`);
  assert.notEqual(end, -1, `Missing opening tag end after: ${marker}`);
  return contents.slice(start, end + 1).replaceAll(/\s+/g, ' ');
}

test('primary market, asset, and suggestion actions use native buttons', async () => {
  const [home, assetDetail, ask] = await Promise.all([
    source('src/screens/Home.tsx'),
    source('src/screens/AssetDetail.tsx'),
    source('src/screens/Ask.tsx'),
  ]);

  for (const [contents, marker] of [
    [home, 'key={a.symbol}'],
    [assetDetail, 'key={a.label}'],
    [ask, 'key={c.label}'],
  ]) {
    const tag = openingTagContaining(contents, marker);
    assert.match(tag, /^<button\b/);
    assert.match(tag, /\btype="button"/);
    assert.match(tag, /\bonClick=/);
  }
});

test('shared Sheet exposes a labelled modal wired to focus management', async () => {
  const sheet = await source('src/components/Sheet.tsx');
  const dialogTag = openingTagContaining(sheet, 'ref={dialogRef}');

  assert.match(sheet, /useModalFocus\s*\(\s*open\s*,\s*onClose/);
  assert.match(dialogTag, /\brole="dialog"/);
  assert.match(dialogTag, /\baria-modal="true"/);
  assert.match(dialogTag, /\baria-label=/);
  assert.match(dialogTag, /\btabIndex=\{-1\}/);
});

test('RiskAlert uses a labelled modal and starts focus on the dialog', async () => {
  const riskAlert = await source('src/components/RiskAlert.tsx');
  const dialogTag = openingTagContaining(riskAlert, 'ref={dialogRef}');

  assert.match(riskAlert, /useModalFocus\s*\(\s*true\s*,\s*onDismiss/);
  assert.match(riskAlert, /initialFocus\s*:\s*'dialog'/);
  assert.match(dialogTag, /\brole="dialog"/);
  assert.match(dialogTag, /\baria-modal="true"/);
  assert.match(dialogTag, /\baria-label=/);
  assert.match(dialogTag, /\btabIndex=\{-1\}/);
});

test('modal focus helper traps both Tab directions, closes on Escape, and restores focus', async () => {
  const modalFocus = await source('src/lib/useModalFocus.ts');

  assert.match(modalFocus, /document\.activeElement/);
  assert.match(modalFocus, /event\.key\s*===\s*'Escape'/);
  assert.match(modalFocus, /event\.key\s*!==\s*'Tab'/);
  assert.match(modalFocus, /event\.shiftKey/);
  assert.match(modalFocus, /dialog\.contains\s*\(/);
  assert.match(modalFocus, /previousFocusRef\.current\?\.focus\s*\(\s*\)/);
  assert.match(modalFocus, /cancelAnimationFrame\s*\(/);
});
