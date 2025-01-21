import { Signal } from "signal-polyfill";
import { Callable } from "./misc";
import { createComputed } from "./hooks";

export class Probe<T> extends Callable {
  static NONE = Symbol("NONE");
  constructor(readonly getter: () => T, readonly setter: (value: T) => void) {
    const untrack = () => Signal.subtle.untrack(() => getter());
    super(function (value: T | (() => T) = Probe.NONE as any) {
      if (value === Probe.NONE && arguments.length === 0) {
        return getter();
      }
      if (typeof value === "function") {
        const prev = untrack();
        setter((value as any)(prev));
      } else {
        setter(value as any);
      }
      return untrack();
    });
  }

  static fromState<T>(value: Signal.State<T>) {
    return new Probe(
      () => value.get(),
      (v) => value.set(v)
    );
  }
  static fromComputed<T>(value: Signal.Computed<T>) {
    return new Probe(
      () => value.get(),
      (v) => {
        throw new Error("Cannot set a computed value");
      }
    );
  }
  static fromProbe<T>(value: Probe<T>) {
    return new Probe(
      () => value(),
      (v) => value(v)
    );
  }
}

export function sig<T>(value: (prev: T) => T): Probe<T>;
export function sig<T>(value: T): Probe<T>;
export function sig<T>(value: Signal.State<T>): Probe<T>;
export function sig<T>(value: Signal.Computed<T>): Probe<T>;
export function sig(value: any) {
  if (Signal.isState(value)) {
    return Probe.fromState(value);
  }
  if (Signal.isComputed(value)) {
    return Probe.fromComputed(value);
  }
  if (value instanceof Probe) {
    return Probe.fromProbe(value);
  }
  if (typeof value === "function") {
    const memo = createComputed(value);
    return Probe.fromComputed(memo);
  }
  const state = new Signal.State(value);
  return Probe.fromState(state);
}
