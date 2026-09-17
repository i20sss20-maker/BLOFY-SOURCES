import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('bootstrap Xtream credentials work until a persistent account overrides them', () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'blofy-bootstrap-'));
  try {
    const script = `
      const mod = await import('./src/context.mjs');
      if (!mod.verifyAccount('seeduser', 'SeedPass-12345')) process.exit(11);
      if (mod.verifyAccount('seeduser', 'wrong-password')) process.exit(12);
      const next = await mod.resetAccount();
      if (mod.verifyAccount('seeduser', 'SeedPass-12345')) process.exit(13);
      if (!mod.verifyAccount(next.username, next.password)) process.exit(14);
      const account = mod.getAccount();
      if (!account || account.username !== next.username || account.bootstrap === true) process.exit(15);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DATA_DIR: dataDir,
        SESSION_SECRET: 'a'.repeat(64),
        XTREAM_USERNAME: 'seeduser',
        XTREAM_PASSWORD: 'SeedPass-12345'
      },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout || `child exited ${result.status}`);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
