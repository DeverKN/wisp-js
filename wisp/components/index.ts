import { effect } from '@vue/reactivity';
import { makeScopedExpression, PropsObject, SlotsObject } from '../engine/engine';
import { Scope } from '../reactivity/scope';

export type CustomElementHandler = (
  attributes: PropsObject,
  scope: Scope,
  slots: SlotsObject,
  el: Element
) => Node[] | void;

export const WispComponentRegistry = new Map<string, CustomElementHandler>();

const Let: CustomElementHandler = (attrs, scope, slots) => {
  const innerScope = Scope(scope);
  Object.entries(attrs).forEach(([key, val]) => {
    effect(() => {
      scope.define(key, val());
    });
  });
  // console.log('count' in innerScope.vals);
  // console.log('count' in scope.vals);
  // console.log("pre")
  // console.log(scope.vals);
  // console.log("post")
  return slots.default(innerScope);
};

const Effect: CustomElementHandler = (_attrs, scope, _slots, el) => {
  const body = el.innerHTML
  const scopedExpression = makeScopedExpression(body)
  effect(() => {
    scopedExpression(scope)
  })
  return
};

const If: CustomElementHandler = (attrs, scope, slots, el) => {
  const { condition } = attrs
  const wrapper = document.createElement("span")

  effect(() => {
    if (condition()) {
      wrapper.replaceChildren(...slots.default(scope))
    } else {
      wrapper.replaceChildren()
    }
  })

  return [wrapper]
};

WispComponentRegistry.set('let', Let);
WispComponentRegistry.set('effect', Effect);
WispComponentRegistry.set('if', If);