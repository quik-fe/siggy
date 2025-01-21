import { render } from "./render";
import { isSignalLike } from "./misc";
import { Signal } from "signal-polyfill";
import { Probe } from "./Sig";
import { createEffect, onCleanup } from "./hooks";

interface Props {
  children?: (Node | (() => Node))[];
  style?: string | Record<string, any>;
  value?: string | number;
  class?: any;
  className?: any;
  [key: string]: any;
}

type ComponentType = string | HTMLElement | ((props: Props) => Node);

// 定义一个接口用于描述属性更新
interface AttributeUpdater {
  update(
    element: HTMLElement,
    key: string,
    value: any,
    finalProps: Props
  ): void;
}

// 属性更新的基类，所有具体的属性更新器都应该继承此类
class BaseAttributeUpdater implements AttributeUpdater {
  update(element: HTMLElement, key: string, value: any, finalProps: Props) {
    if (isSignalLike(value) || value instanceof Probe) {
      this.handleSignalOrProbe(element, key, value);
    } else {
      this.handleAttribute(element, key, value);
    }
  }

  protected handleSignalOrProbe(element: HTMLElement, key: string, value: any) {
    const attrEffect = () => {
      const actualValue = value instanceof Probe ? value() : value.get();
      this.applyValue(element, key, actualValue);
    };
    createEffect(attrEffect);
  }

  protected handleAttribute(element: HTMLElement, key: string, value: any) {
    this.applyValue(element, key, value);
  }

  protected applyValue(element: HTMLElement, key: string, value: any) {
    if (key in element) {
      (element as any)[key] = value;
    } else {
      if (value !== undefined) element.setAttribute(key, String(value));
    }
  }
}

class StyleUpdater extends BaseAttributeUpdater {
  override update(element: HTMLElement, key: string, value: Props["style"]) {
    if (typeof value === "string") {
      element.setAttribute("style", value);
    } else if (typeof value === "object") {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        (element.style as any)[styleKey] = styleValue;
      });
    }
  }
}
function constructClassNames(args: any[]): string[] {
  const convertToString = (arg: any) => {
    if (typeof arg === "string") {
      return arg;
    }

    if (typeof arg === "number") {
      return arg.toString();
    }

    if (typeof arg === "object") {
      if (Array.isArray(arg)) {
        return arg
          .reduce((acc, arg2) => {
            if (arg2) {
              const argString = convertToString(arg2);
              if (argString) {
                return [...acc, argString];
              }
            }
            return acc;
          }, [])
          .join(" ");
      }

      return Object.entries(arg)
        .filter(([key, value]) => value)
        .map(([key]) => key)
        .join(" ");
    }

    return "";
  };

  const classNames = args.reduce((acc, arg) => {
    if (arg) {
      const argString = convertToString(arg);
      if (argString) {
        return [...acc, argString];
      }
    }
    return acc;
  }, []);

  return classNames;
}

class ClassNameUpdater extends BaseAttributeUpdater {
  override update(
    element: HTMLElement,
    key: string,
    value: any,
    finalProps: Props
  ) {
    const classNames = constructClassNames(value);
    element.classList.add(...classNames);
  }
}

class EventUpdater extends BaseAttributeUpdater {
  override update(element: HTMLElement, key: string, value: Function) {
    if (typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value as any);
    }
  }
}

class RefUpdater extends BaseAttributeUpdater {
  override update(element: HTMLElement, key: string, value: any) {
    if (typeof value === "function") {
      value(element);
    } else if (value instanceof Signal.State) {
      value.set(element);
    }
  }
}

// 创建属性更新器实例
const attributeUpdaters: Record<string, AttributeUpdater> = {
  style: new StyleUpdater(),
  class: new ClassNameUpdater(),
  className: new ClassNameUpdater(),
  ref: new RefUpdater(),
};

// 处理所有属性更新
function handleAttribute(
  element: HTMLElement,
  key: string,
  value: any,
  props: Props
) {
  const updater =
    attributeUpdaters[key] ||
    (key.startsWith("on") ? new EventUpdater() : new BaseAttributeUpdater());
  updater.update(element, key, value, props);
}

// 创建 DOM 元素并应用属性
function createDOMElement(
  type: string | HTMLElement,
  props: Props
): HTMLElement {
  const element: HTMLElement =
    type instanceof HTMLElement ? type : document.createElement(type);

  Object.entries(props).forEach(([key, value]) => {
    if (key === "children") return;
    handleAttribute(element, key, value, props);
  });
  return element;
}

// 处理子节点
function appendChildren(
  element: HTMLElement,
  children: (Node | (() => Node))[]
) {
  children?.forEach((child) => {
    const { node, cleanup } = Signal.subtle.untrack(() => render(child));
    element.appendChild(node);
    onCleanup(cleanup);
  });
}

// 主的 createElement 函数
export function createElement(
  type: ComponentType,
  props: Props = {},
  ...children: (Node | (() => Node))[]
): Node {
  props ||= {};
  const finalProps: Props = {
    ...props,
    children: children.length > 0 ? children : props.children || [],
  };
  finalProps.children = finalProps.children?.flat() || [];

  // 处理函数组件
  if (typeof type === "function") {
    const { node, cleanup, frag } = Signal.subtle.untrack(() =>
      render(type, finalProps)
    );
    onCleanup(cleanup);
    frag!._set_anchor_id(`${type.name}-${frag!._id}`);
    return node;
  }

  const element = createDOMElement(type, finalProps);
  appendChildren(element, finalProps.children);

  return element;
}
