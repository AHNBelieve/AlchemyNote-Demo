import { spawn } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
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
  throw new Error('Refusing to prepare a build outside the temporary directory.');
}

console.log('[AlchemyNote] Preparing a OneDrive-safe production build...');
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
]) {
  copyFileSync(join(sourceRoot, file), join(runtimeRoot, file));
}

symlinkSync(
  join(sourceRoot, 'node_modules'),
  join(runtimeRoot, 'node_modules'),
  'junction',
);

if (existsSync(projectEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(projectEnvFile);
}

const envFile = join(sourceRoot, '.env.local');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

const nextCli = join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'build'], {
  cwd: runtimeRoot,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    ALCHEMYNOTE_DATA_DIR: localDataRoot,
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[AlchemyNote] Build failed to start:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log(`[AlchemyNote] Production build ready in ${runtimeRoot}`);
  }
  process.exit(code ?? 0);
});
