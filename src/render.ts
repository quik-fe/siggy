import { isSignalLike, SignalLike } from "./misc";
import { effect } from "signal-utils/subtle/microtask-effect";
import { Fragment } from "./Fragment";
import { Scope } from "./Scope";
import { Probe } from "./Sig";

const noop = () => {};

type RenderedElement = {
  cleanup: () => void;
  node: Node;
  frag?: Fragment;
};

function renderSignal(signal: SignalLike): RenderedElement {
  const node = document.createTextNode("");
  const cleanup = effect(() => {
    node.textContent = String(signal.get());
  });
  return {
    cleanup,
    node,
  };
}

function renderAny(x: any): RenderedElement {
  return {
    cleanup: noop,
    node: document.createTextNode(String(x)),
  };
}

function isAsyncGenerator(fn: any): fn is AsyncGeneratorFunction {
  return fn && fn.constructor.name === "AsyncGeneratorFunction";
}

function renderFunctionResult(result: any) {
  const values = Array.isArray(result) ? result : [result];
  return values.flatMap(render).reduce(
    ({ nodes, cleanups }, cur) => ({
      nodes: [...nodes, cur.node],
      cleanups: [...cleanups, cur.cleanup].filter((x) => x !== noop),
    }),
    { nodes: [], cleanups: [] } as {
      nodes: Node[];
      cleanups: (() => void)[];
    }
  );
}

function renderFunction(fn: (props?: any) => any, props?: any) {
  const frag = new Fragment(() => {
    const value = fn(props);
    return renderFunctionResult(value);
  });
  frag._source = fn;
  return {
    cleanup: frag.unmount.bind(frag),
    node: frag._frag,
    frag,
  };
}

function renderProbe(probe: Probe<any>) {
  const frag = new Fragment(() => {
    const value = probe();
    return renderFunctionResult(value);
  });
  frag._source = probe;
  return {
    cleanup: frag.unmount.bind(frag),
    node: frag._frag,
    frag,
  };
}

class AsyncGeneratorFragment extends Fragment {
  constructor(readonly fn: AsyncGeneratorFunction, readonly props?: any) {
    super(() => {
      const generator = fn(props);
      queueMicrotask(() => this.run(generator, this._version));
      return {
        cleanups: [],
        nodes: [],
      };
    });
  }

  protected async run(generator: AsyncGenerator, version: number) {
    let done = false;
    while (!done && version === this._version) {
      // TODO: 这里不太对，这样可能有问题，但是不知道有什么办法...
      const { value, done: _done } = await Scope.runAsyncWith(
        this,
        generator.next
      );
      done = !!_done;
      this.update(() => renderFunctionResult(value));
    }
  }
}

function renderAsyncGenerator(fn: AsyncGeneratorFunction, props?: any) {
  const frag = new AsyncGeneratorFragment(fn, props);
  frag._source = fn;
  return {
    cleanup: frag.unmount.bind(frag),
    node: frag._frag,
    frag,
  };
}

// 简化逻辑使用的值，实际无任何意义
const NoopNode = document.createDocumentFragment();

/**
 * 将任意值渲染为 element
 */
export function render(value: any, props?: any): RenderedElement {
  if (value instanceof Node) {
    return {
      cleanup: noop,
      node: value,
    };
  }
  if (isSignalLike(value)) {
    return renderSignal(value);
  }
  if (value instanceof Probe) {
    return renderProbe(value);
  }
  if (typeof value === "function") {
    if (isAsyncGenerator(value)) {
      return renderAsyncGenerator(value, props);
    }
    return renderFunction(value, props);
  }
  if (value === null || value === undefined) {
    return {
      cleanup: noop,
      node: NoopNode,
    };
  }
  return renderAny(value);
}

export function unmount(node: any) {
  if (node instanceof Node) {
    Fragment.unmount(node);
  } else if (node instanceof Fragment) {
    node.unmount();
  } else {
    console.warn("[unmount] not a node or fragment", node);
  }
}
