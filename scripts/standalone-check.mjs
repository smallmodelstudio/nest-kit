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

function readPackageJson(pkgDir) {
  return JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
}

// Packs every package into `sharedDir` up front, so a package that depends on
// another workspace package (declared as `workspace:*`, which `pnpm pack`
// rewrites to a plain version the public registry has never heard of) can
// have that dependency swapped for the local tarball below, instead of
// `npm install` trying to fetch it from the registry.
function buildAndPackAll(sharedDir) {
  const tarballsByName = new Map();
  for (const pkgDir of packageDirs()) {
    const pkgJson = readPackageJson(pkgDir);
    run('pnpm', ['--filter', pkgJson.name, 'run', 'build'], { cwd: rootDir });
    const packOutput = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', sharedDir],
      { cwd: pkgDir, encoding: 'utf8' },
    );
    const tarballPath = packOutput.trim().split('\n').pop();
    tarballsByName.set(pkgJson.name, tarballPath);
  }
  return tarballsByName;
}

function resolveDependencies(pkgJson, tarballsByName) {
  const workspaceAware = (deps) =>
    Object.fromEntries(
      Object.entries(deps).map(([name, range]) => [
        name,
        tarballsByName.get(name) ?? range,
      ]),
    );

  return {
    ...BASE_NEST_DEPENDENCIES,
    ...(pkgJson.peerDependencies ?? {}),
    ...workspaceAware(pkgJson.dependencies ?? {}),
    [pkgJson.name]: tarballsByName.get(pkgJson.name),
  };
}

function checkPackage(pkgDir, tarballsByName) {
  const pkgJson = readPackageJson(pkgDir);
  console.log(`\n=== standalone check: ${pkgJson.name} ===`);

  const workDir = mkdtempSync(join(tmpdir(), 'nest-kit-standalone-'));
  try {
    const appDir = join(workDir, 'app');
    mkdirSync(appDir);

    const dependencies = resolveDependencies(pkgJson, tarballsByName);

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

const sharedDir = mkdtempSync(join(tmpdir(), 'nest-kit-standalone-tarballs-'));
try {
  const tarballsByName = buildAndPackAll(sharedDir);
  for (const pkgDir of packageDirs()) {
    checkPackage(pkgDir, tarballsByName);
  }
} finally {
  rmSync(sharedDir, { recursive: true, force: true });
}
