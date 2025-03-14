import { Fragment } from "src/Fragment";
import { createSignal, onCleanup, onCatch } from "src/hooks";
import { render } from "src/render";

function renderFunction(fn: () => any) {
  const { node, cleanup } = render(fn);
  onCleanup(cleanup);
  return node;
}

export function Suspense({
  render: _render,
  fallback,
}: {
  render: () => any;
  fallback: () => any;
}) {
  const loaded = createSignal(false);
  onCatch((promise, next) => {
    if (!(promise instanceof Promise)) return next();
    setTimeout(() => {
      loaded.set(false);
      promise.finally(() => loaded.set(true)).catch(next);
    });
  });
  const children = renderFunction(_render);
  return () => {
    if (!loaded.get()) {
      return renderFunction(() => fallback());
    }
    return children;
  };
}
