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

// One rule per package, excluding the package's own name from its forbidden
// targets, so a package's files may freely import each other. Without that
// exclusion, a blanket per-layer rule flags a package's own internal imports
// as violations, since the package's own name appears in both `from` and
// (for layers with no packages above them to exclude) `to`.
const forbiddenFromPackage = (name, allowedNames) => {
  const forbiddenNames = ALL_NAMES.filter(
    (candidate) => candidate !== name && !allowedNames.includes(candidate),
  );
  return {
    name: `no-upward-imports-from-${name}`,
    comment:
      'A package may only import from layers below its own (docs/README-architecture.md#packages-and-layers).',
    severity: 'error',
    from: { path: packagePath([name]) },
    to: { path: packagePath(forbiddenNames) },
  };
};

const forbiddenFromLayer = (layerNames, allowedNames) =>
  layerNames.map((name) => forbiddenFromPackage(name, allowedNames));

module.exports = {
  forbidden: [
    ...forbiddenFromLayer(LAYER_0, []),
    ...forbiddenFromLayer(LAYER_1, LAYER_0),
    ...forbiddenFromLayer(LAYER_2, [...LAYER_0, ...LAYER_1]),
    ...forbiddenFromLayer(LAYER_3, [...LAYER_0, ...LAYER_1, ...LAYER_2]),
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
