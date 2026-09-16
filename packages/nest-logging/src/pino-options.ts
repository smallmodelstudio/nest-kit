// `pino-pretty` is meant to be a devDependency, stripped from a production
// image — so whether it's available depends on how the process was started,
// not on NODE_ENV (an environment can validly run a pruned production image
// with NODE_ENV=development, e.g. to get a more verbose log level). Gating
// the transport on NODE_ENV instead is a real trap: pino's transport loader
// throws synchronously if the target module can't be resolved, crashing the
// app on boot rather than merely logging less prettily.
export function isPinoPrettyAvailable(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

/** silent in test (no log spam from a full app boot in specs), info in
 * production, debug everywhere else. Override via `NestKitLoggerModule.forRoot({ level })`. */
export function defaultLevel(): string {
  switch (process.env['NODE_ENV']) {
    case 'test':
      return 'silent';
    case 'production':
      return 'info';
    default:
      return 'debug';
  }
}

interface ResponseLike {
  statusCode: number;
}

export function customLogLevel(
  _req: unknown,
  res: ResponseLike,
  err?: Error,
): string {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}
