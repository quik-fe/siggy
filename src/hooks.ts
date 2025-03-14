import { batchedEffect } from "signal-utils/subtle/batched-effect";
import { Signal } from "signal-polyfill";
import { Scope } from "./Scope";

export function onCleanup(fn: () => void): void {
  Scope.recordCleanup(fn);
}

export function onCatch(cb: (err: any, next: () => any) => any) {
  if (!Scope.current) {
    throw new Error("call onErrorCatch must be inside Scope.");
  }
  Scope.current._catcher = cb;
}

export function createEffect(fn: () => void): void;
export function createEffect<T>(fn: (v: T) => T, value: T): void;
export function createEffect(
  fn: (...args: unknown[]) => unknown,
  value?: unknown
): void {
  let prev = value;
  const scope = new Scope();
  const off = Signal.subtle.untrack(() =>
    batchedEffect(() => {
      scope.cleanup();
      Scope.runWith(scope, () => {
        prev = fn(prev);
      });
    })
  );
  Scope.recordCleanup(off);
}

export function createComputed<T>(
  fn: (...args: T[]) => T,
  options?: Signal.Options<T> & { value: T }
): Signal.Computed<T>;
export function createComputed(
  fn: (...args: unknown[]) => unknown,
  options?: Signal.Options<unknown> & { value: unknown }
): Signal.Computed<unknown> {
  let prev = options?.value;
  const scope = new Scope();
  const computation = () => {
    scope.cleanup();
    return Scope.runWith(scope, () => {
      const next = fn(prev);
      prev = next;
      return next;
    });
  };
  const computed = new Signal.Computed(computation, options);
  return computed;
}

export function createSignal<T>(
  value: T,
  options?: Signal.Options<T>
): Signal.State<T> {
  return new Signal.State(value, options);
}

export function getScope() {
  return Scope.current;
}

export function createInterval(fn: () => any, ms: number) {
  const interval = setInterval(fn, ms);
  onCleanup(() => clearInterval(interval));
}

export function createTimeout(fn: () => any, ms: number) {
  const timeout = setTimeout(fn, ms);
  onCleanup(() => clearTimeout(timeout));
}
