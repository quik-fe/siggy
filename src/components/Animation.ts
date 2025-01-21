import { Fragment } from "src/Fragment";
import { onCleanup } from "src/hooks";

interface AnimationRefState {
  keyframe: KeyframeEffect;
  animation: Animation;
}

interface Props extends EffectTiming {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  children?: any[];
  ref?: (s: AnimationRefState) => any;
  lazy?: boolean;
}

export function Animation(props: Props) {
  const { keyframes, children = [], ref, lazy, ...options } = props;

  const dom = Fragment.flatChildren(children).find((x) => x instanceof Element);
  if (!dom) return null;

  const keyframe = new window.KeyframeEffect(dom, keyframes, options);
  const animation = new window.Animation(keyframe, document.timeline);
  if (!lazy) animation.play();
  ref?.({ keyframe, animation });
  onCleanup(() => animation.cancel());
  return children;
}
