/**
 * Confirms that the package pipeline (build, publish, install) produced a
 * working module. Real packages replace this with their own exports.
 */
export function ping(): 'pong' {
  return 'pong';
}
