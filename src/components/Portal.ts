import { createElement } from "src/createElement";
import { onCleanup } from "src/hooks";

export function Portal({
  children,
  style,
  parentElement = document.body,
}: {
  children?: any;
  style?: CSSStyleDeclaration;
  parentElement?: HTMLElement;
}) {
  const dom = createElement(
    "div",
    {
      style: {
        position: "fixed",
        ...style,
      },
    },
    ...children
  );
  parentElement.appendChild(dom);
  onCleanup(() => parentElement.removeChild(dom));
  return null;
}
