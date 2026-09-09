import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const sourceRoot = join(projectRoot, 'apps', 'web');
const runtimeRoot = resolve(tmpdir(), 'alchemynote-build-runtime');
const resolvedTempRoot = resolve(tmpdir());
const projectEnvFile = join(projectRoot, '.env');
const localDataRoot = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'AlchemyNote')
  : join(projectRoot, 'apps', 'api', 'data');

if (!runtimeRoot.startsWith(resolvedTempRoot + sep)) {
  throw new Error('Refusing to start a build outside the temporary directory.');
}

if (!existsSync(join(runtimeRoot, '.next', 'BUILD_ID'))) {
  console.error('[AlchemyNote] No production build found. Run `npm run build` first.');
  process.exit(1);
}

if (existsSync(projectEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(projectEnvFile);
}

const envFile = join(sourceRoot, '.env.local');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

const nextCli = join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'start', '-p', '3100'], {
  cwd: runtimeRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    ALCHEMYNOTE_DATA_DIR: localDataRoot,
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[AlchemyNote] Failed to start:', error.message);
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT', () => child.kill('SIGTERM'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
