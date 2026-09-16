import { Inject } from '@nestjs/common';

export const CONFIG_TOKEN = Symbol('CONFIG_KIT_CONFIG');

/** Injects the value `ConfigKitModule.forRoot()` parsed. Type the parameter yourself. */
export function InjectConfig(): ParameterDecorator {
  return Inject(CONFIG_TOKEN);
}
