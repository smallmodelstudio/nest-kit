/**
 * Runs `handler` once for each of the given process signals (default
 * SIGTERM/SIGINT), logging — rather than throwing — if it rejects.
 *
 * `otel` never imports Nest (it has to load before Nest, or anything else,
 * via `node --import`), so this logs with `console.error` rather than
 * `@nestjs/common`'s `Logger`.
 */
export function registerShutdownHandler(
  handler: () => Promise<unknown>,
  signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'],
): void {
  for (const signal of signals) {
    process.on(signal, () => {
      handler().catch((error: unknown) => {
        console.error(
          `[Shutdown] handler failed for ${signal}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    });
  }
}
