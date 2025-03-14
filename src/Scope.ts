export class Scope {
  static current: Scope | null = null;
  static recordCleanup(cleanup: () => void) {
    if (Scope.current) {
      Scope.current._cleanups.push(cleanup);
    } else {
      // 提醒
      console.warn(
        "[Scope] cleanup function is recorded outside of Scope",
        "\n" + new Error().stack?.split("\n").slice(1).join("\n")
      );
    }
  }
  static runWith<T>(owner: Scope, fn: () => T): T {
    const prev = Scope.current;
    Scope.current = owner;
    try {
      return fn();
    } finally {
      Scope.current = prev;
    }
  }

  /**
   * WARN: 不推荐使用，可能会导致错误的行为
   */
  static async runAsyncWith<T>(
    owner: Scope,
    fn: () => Promise<T>
  ): Promise<Awaited<T>> {
    const prev = Scope.current;
    Scope.current = owner;
    try {
      return await fn();
    } finally {
      Scope.current = prev;
    }
  }

  _parent: Scope | null = null;
  _disposed = new AbortController();

  _catcher: ((err: any, next: () => any) => any) | null = null;

  constructor() {
    this._parent = Scope.current;
    if (this._parent) {
      this._parent._disposed.signal.addEventListener("abort", () => {
        this._disposed.abort();
      });
    }
  }

  throw(err1: any) {
    const next = (err2 = err1) => {
      if (this._parent) {
        this._parent.throw(err2);
        return;
      }
      throw err2;
    };
    if (this._catcher) {
      this._catcher(err1, next);
      return;
    }
    next();
  }

  dispose() {
    if (this._disposed.signal.aborted) return;
    this._disposed.abort();
    this.cleanup();
  }

  _cleanups: (() => void)[] = [];
  cleanup() {
    if (this._cleanups.length === 0) return;
    this._cleanups.map(queueMicrotask);
    this._cleanups = [];
  }
}
