import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url).pathname;

test('local environment files cannot be added to the repository', () => {
  const candidates = ['.env', '.env.production', '.env.preview.local'];
  const result = spawnSync('git', ['check-ignore', '--no-index', ...candidates], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), candidates);
});
