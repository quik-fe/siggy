import { Fragment } from "./Fragment";

const CONTEXT = Symbol("CONTEXT");

interface InjectionConstraint<T> {}
export type InjectionKey<T> = symbol & InjectionConstraint<T>;

const GLOBAL = {} as Record<InjectionKey<any> | string, any>;

export function provide<T>(key: InjectionKey<T> | string, value: T): void {
  const current = Fragment.current as Fragment & {
    [CONTEXT]: Record<InjectionKey<T> | string, any>;
  };
  if (!current) {
    GLOBAL[key] = value;
    return;
  }
  current[CONTEXT] = current[CONTEXT] || {};
  current[CONTEXT][key] = value;
}

// without default value
export function inject<T>(key: InjectionKey<T> | string): T | undefined;
// with default value
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T;
// with factory
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: () => T,
  treatDefaultAsFactory: true
): T;
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  let current = Fragment.current as
    | (Fragment & {
        [CONTEXT]: Record<InjectionKey<any> | string, any>;
      })
    | null;
  while (current) {
    const ctx = current[CONTEXT];
    if (ctx && key in ctx) {
      return ctx[key];
    }
    current = current._parent as any;
  }
  if (key in GLOBAL) {
    return GLOBAL[key];
  }
  if (treatDefaultAsFactory) {
    if (typeof defaultValue !== "function") {
      throw new Error(
        "treatDefaultAsFactory must be used with a factory function"
      );
    }
    return defaultValue();
  }
  return defaultValue as any;
}
