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

  _cleanups: (() => void)[] = [];
  cleanup() {
    if (this._cleanups.length === 0) return;
    this._cleanups.map(queueMicrotask);
    this._cleanups = [];
  }
}
