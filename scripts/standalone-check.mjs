#!/usr/bin/env node
// Packs each package, installs it into an empty Nest app with only its
// declared peer dependencies, and boots that app. See
// docs/README-roadmap.md#0-skeleton.
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const packagesDir = join(rootDir, 'packages');

// The app has no Nest of its own, so it needs these to exist at all. Real
// peers declared by the package under test are added on top, at the range
// the package itself declares.
const BASE_NEST_DEPENDENCIES = {
  '@nestjs/common': '*',
  '@nestjs/core': '*',
  '@nestjs/platform-fastify': '*',
  fastify: '*',
  'reflect-metadata': '*',
  rxjs: '*',
};

const BOOT_SCRIPT = `
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

require(process.env.PACKAGE_NAME);

class AppModule {}

async function main() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
  });
  await app.init();
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function packageDirs() {
  return readdirSync(packagesDir)
    .map((name) => join(packagesDir, name))
    .filter((dir) => statSync(dir).isDirectory());
}

function checkPackage(pkgDir) {
  const pkgJson = JSON.parse(
    readFileSync(join(pkgDir, 'package.json'), 'utf8'),
  );
  console.log(`\n=== standalone check: ${pkgJson.name} ===`);

  run('pnpm', ['--filter', pkgJson.name, 'run', 'build'], { cwd: rootDir });

  const workDir = mkdtempSync(join(tmpdir(), 'nest-kit-standalone-'));
  try {
    const packOutput = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', workDir],
      { cwd: pkgDir, encoding: 'utf8' },
    );
    const tarballPath = packOutput.trim().split('\n').pop();

    const appDir = join(workDir, 'app');
    mkdirSync(appDir);

    const dependencies = {
      ...BASE_NEST_DEPENDENCIES,
      ...(pkgJson.peerDependencies ?? {}),
      [pkgJson.name]: tarballPath,
    };

    writeFileSync(
      join(appDir, 'package.json'),
      JSON.stringify(
        { name: 'standalone-check-app', private: true, dependencies },
        null,
        2,
      ),
    );
    writeFileSync(join(appDir, 'main.js'), BOOT_SCRIPT);

    run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir });
    run('node', ['main.js'], {
      cwd: appDir,
      env: { ...process.env, PACKAGE_NAME: pkgJson.name },
    });

    console.log(`${pkgJson.name}: installs and boots standalone`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

for (const pkgDir of packageDirs()) {
  checkPackage(pkgDir);
}
