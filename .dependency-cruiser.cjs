/**
 * Enforces the layer rule from docs/README-architecture.md: a package may only
 * import from layers below its own.
 */
const LAYER_0 = ['contract', 'http-client', 'otel'];
const LAYER_1 = [
  'nest-context',
  'nest-envelope',
  'nest-errors',
  'nest-zod',
  'nest-config',
  'nest-logging',
  'nest-http',
  'nest-cache',
  'nest-health',
  'nest-metrics',
  'nest-bootstrap',
];
const LAYER_2 = ['nest-resource', 'nest-drizzle'];
const LAYER_3 = ['nest-testing', 'cli'];

const ALL_NAMES = [...LAYER_0, ...LAYER_1, ...LAYER_2, ...LAYER_3];
const packagePath = (names) => `^packages/(${names.join('|')})/`;

const forbiddenFromLayer = (layerName, fromNames, allowedNames) => ({
  name: `no-upward-imports-from-${layerName}`,
  comment:
    'A package may only import from layers below its own (docs/README-architecture.md#packages-and-layers).',
  severity: 'error',
  from: { path: packagePath(fromNames) },
  to: {
    path: packagePath(ALL_NAMES.filter((n) => !allowedNames.includes(n))),
  },
});

module.exports = {
  forbidden: [
    forbiddenFromLayer('layer-0', LAYER_0, []),
    forbiddenFromLayer('layer-1', LAYER_1, LAYER_0),
    forbiddenFromLayer('layer-2', LAYER_2, [...LAYER_0, ...LAYER_1]),
    forbiddenFromLayer('layer-3', LAYER_3, [
      ...LAYER_0,
      ...LAYER_1,
      ...LAYER_2,
    ]),
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
