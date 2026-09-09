import { spawn } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const sourceRoot = join(projectRoot, 'apps', 'web');
const configuredPort = Number.parseInt(process.env.ALCHEMYNOTE_PORT ?? '', 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort < 65536
  ? configuredPort
  : 3100;
const runtimeRoot = resolve(tmpdir(), `alchemynote-dev-runtime-${process.pid}`);
const resolvedTempRoot = resolve(tmpdir());
const projectEnvFile = join(projectRoot, '.env');
const configuredDataRoot = process.env.ALCHEMYNOTE_DATA_DIR?.trim();
const localDataRoot = configuredDataRoot
  ? resolve(configuredDataRoot)
  : process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'AlchemyNote')
    : join(projectRoot, 'apps', 'api', 'data');

if (existsSync(projectEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(projectEnvFile);
}

if (!runtimeRoot.startsWith(resolvedTempRoot + sep)) {
  throw new Error('Refusing to prepare a runtime outside the temporary directory.');
}

const portIsAvailable = await new Promise((resolveAvailability, reject) => {
  const probe = createServer();

  probe.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      resolveAvailability(false);
      return;
    }

    reject(error);
  });

  probe.once('listening', () => {
    probe.close(() => resolveAvailability(true));
  });

  probe.listen(port);
});

if (!portIsAvailable) {
  console.log(`[AlchemyNote] Already running at http://localhost:${port}`);
  process.exit(0);
}

console.log('[AlchemyNote] Preparing a OneDrive-safe local runtime...');
rmSync(runtimeRoot, { recursive: true, force: true });
mkdirSync(runtimeRoot, { recursive: true });

for (const directory of ['app', 'components', 'lib', 'public']) {
  cpSync(join(sourceRoot, directory), join(runtimeRoot, directory), {
    recursive: true,
  });
}

for (const file of [
  'package.json',
  'next.config.ts',
  'postcss.config.mjs',
  'tsconfig.json',
  'next-env.d.ts',
  '.env.local',
]) {
  const source = join(sourceRoot, file);
  if (existsSync(source)) {
    copyFileSync(source, join(runtimeRoot, file));
  }
}

symlinkSync(
  join(sourceRoot, 'node_modules'),
  join(runtimeRoot, 'node_modules'),
  'junction',
);

const nextCli = join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(
  process.execPath,
  [nextCli, 'dev', '-p', String(port)],
  {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      ALCHEMYNOTE_DATA_DIR: localDataRoot,
    },
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error('[AlchemyNote] Failed to start:', error.message);
  rmSync(runtimeRoot, { recursive: true, force: true });
  process.exit(1);
});

child.on('exit', (code) => {
  rmSync(runtimeRoot, { recursive: true, force: true });
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGTERM'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
