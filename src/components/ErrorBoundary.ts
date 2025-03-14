import { createSignal, onCleanup, onCatch } from "src/hooks";
import { render } from "src/render";

function renderFunction(fn: () => any) {
  const { node, cleanup } = render(fn);
  onCleanup(cleanup);
  return node;
}

export function ErrorBoundary({
  render: _render,
  fallback,
}: {
  render: () => any;
  fallback: (states: { error: any; reset: () => void }) => any;
}) {
  const signal = createSignal(null as any);
  onCatch((err) => {
    setTimeout(() => {
      signal.set(err);
    });
  });
  return () => {
    const error = signal.get();
    if (error) {
      return renderFunction(() =>
        fallback({ error, reset: () => signal.set(null) })
      );
    }
    try {
      return renderFunction(_render);
    } catch (error) {
      signal.set(error);
      return null;
    }
  };
}
