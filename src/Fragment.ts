import { effect } from "signal-utils/subtle/microtask-effect";
import { randId } from "./misc";
import { Signal } from "signal-polyfill";
import { Scope } from "./Scope";

/**
 * node 片段
 */
export class Fragment extends Scope {
  static FRAGMENT = Symbol("FRAGMENT");

  /**
   * global settings
   */
  static global = {
    anchor_as: "comment" as "comment" | "text",
  };
  protected static createAnchor(id: string, instance: Fragment) {
    let node: Node;
    if (Fragment.global.anchor_as === "comment") {
      node = document.createComment(id);
    } else {
      node = document.createTextNode("");
    }
    (node as any)["_id"] = id;
    (node as any)[Fragment.FRAGMENT] = instance;
    return node;
  }

  static anchorToFragment = new WeakMap<Node, Fragment>();
  static fgNodeToFragment = new WeakMap<Node, Fragment>();

  static unmount(n: Node) {
    const sub =
      Fragment.anchorToFragment.get(n) || Fragment.fgNodeToFragment.get(n);
    if (sub) {
      sub.unmount();
    } else {
      n.parentNode?.removeChild(n);
    }
  }

  static getChildren(n: Node) {
    const sub =
      Fragment.anchorToFragment.get(n) || Fragment.fgNodeToFragment.get(n);
    return sub?._children || [n];
  }
  static flatChildren(children: Node[]) {
    return children.flatMap(Fragment.getChildren);
  }

  _id = randId();
  _frag = document.createDocumentFragment();
  _anchor = Fragment.createAnchor(`fg-${this._id}`, this);

  _children = [] as Node[];
  _dispose_effect!: () => void;

  // DEBUG 用的值
  _source: any = null;

  _version = 0;

  constructor(
    readonly render: () => {
      nodes: Node[];
      cleanups: (() => void)[];
    }
  ) {
    super();

    Fragment.anchorToFragment.set(this._anchor, this);
    Fragment.fgNodeToFragment.set(this._frag, this);

    this._frag.appendChild(this._anchor);
    this._dispose_effect = Signal.subtle.untrack(() =>
      effect(() => {
        Scope.runWith(this, () => {
          this.update(this.render.bind(this));
          this._version += 1;
        });
      })
    );
  }

  _set_anchor_id(id: string) {
    (this._anchor as any)["_id"] = id;
    if (this._anchor instanceof Comment) {
      this._anchor.textContent = id;
    }
  }

  protected disconnect() {
    this._children.forEach(Fragment.unmount);
    this._children = [];
  }

  protected update(
    render: () => {
      nodes: Node[];
      cleanups: (() => void)[];
    }
  ) {
    Scope.runWith(this, () => {
      Signal.subtle.untrack(this.cleanup.bind(this));
      try {
        const { nodes, cleanups } = render();
        Signal.subtle.untrack(this.patch.bind(this, nodes));
        this._cleanups = [...this._cleanups, ...cleanups];
      } catch (error) {
        this.throw(error);
      }
    });
  }

  protected packNodes(nodes: Node[]) {
    const frag = document.createDocumentFragment();
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }

  protected patch(nodes: Node[]) {
    const { parentNode } = this._anchor;
    if (!parentNode) {
      throw new Error("Fragment is disconnect");
    }
    this.disconnect();
    const tmpFrag = this.packNodes(nodes);
    parentNode.insertBefore(tmpFrag, this._anchor);
    this._children = nodes;
  }

  unmount() {
    this.cleanup();
    this._dispose_effect();
    this.disconnect();
    this.dispose();
    this._anchor.parentNode?.removeChild(this._anchor);
    Fragment.anchorToFragment.delete(this._anchor);
    Fragment.fgNodeToFragment.delete(this._frag);
  }
}
