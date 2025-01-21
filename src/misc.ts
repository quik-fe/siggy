import { Signal } from "signal-polyfill";

export const randId = () => Math.random().toString(36).slice(2);

export type SignalLike = Signal.State<any> | Signal.Computed<any>;

export const isSignalLike = (x: any): x is SignalLike =>
  !!x && (x instanceof Signal.State || x instanceof Signal.Computed);

export class Callable extends Function {
  constructor(f: Function) {
    super();
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}
