export { RequestContext, type RequestContextData } from './request-context';
export {
  CORRELATION_ID_HEADER,
  registerCorrelationIdHook,
} from './correlation-id.hook';
// Side-effect import: applies the `FastifyRequest.correlationId` type
// augmentation to any consumer that imports from this package.
import './fastify';
