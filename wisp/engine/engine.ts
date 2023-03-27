import { effect } from '@vue/reactivity';
import { WispComponentRegistry } from '../components';
import { Scope } from '../reactivity/scope';

export type SlotHandler = (scope: Scope) => Node[];

export type ScopedExpression<T> = (scope: Scope) => T;

export const init = () => {
  const baseScope = Scope();
  document
    .querySelectorAll('[wisp-root]')
    .forEach((root) => handleElement(root, baseScope));
};

const handleAttributes = (el: Element, scope: Scope) => {
  for (const { name, value } of Array.from(el.attributes)) {
    //: = binding
    const isBinding = name.startsWith(':');
    const scopedExpression = makeScopedExpression(value);
    if (isBinding) {
      const boundName = name.slice(1);
      effect(() => {
        el.setAttribute(boundName, scopedExpression(scope) as string);
      });
    }

    //@ = event
    const isEvent = name.startsWith('@');
    if (isEvent) {
      const eventName = name.slice(1);
      const eventScope = Scope(scope);
      el.addEventListener(eventName, (event) => {
        // console.log({event})
        eventScope.define('$event', event);
        scopedExpression(eventScope);
      });
    }
  }
};

const handleNode = (node: Node, scope: Scope): Node => {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      return handleElement(node as Element, scope);
    case Node.TEXT_NODE:
      return handleText(node as Text, scope);
    default:
      return node;
  }
};

const handleText = (el: Text, scope: Scope) => {
  const nodes = parseTextNode(el.textContent).map((segment) => {
    if (typeof segment === 'string') {
      return new Text(segment);
    } else {
      const textEl = new Text();
      effect(() => {
        textEl.textContent = segment(scope) as string;
      });
      return textEl;
    }
  });
  // const parent = el.parentElement;
  const wrapper = document.createElement('span');
  wrapper.append(...nodes);
  return wrapper;
};

const handleElement = (el: Element, scope: Scope): Element | void => {
  const tagName = el.tagName.toLowerCase();

  if (WispComponentRegistry.has(tagName)) {
    const replacementNodes = WispComponentRegistry.get(tagName)(
      getProps(el, scope),
      scope,
      getSlots(el),
      el
    );
    if (replacementNodes) {
      const wrapper = document.createElement('span');
      wrapper.append(...replacementNodes);
      el.replaceWith(wrapper);
      return wrapper;
    } else {
      el.remove();
      return;
    }
  } else {
    handleAttributes(el, scope);
    el.childNodes.forEach((child) => handleNode(child, scope));
    return el;
  }
};

export type PropsObject = Record<string, () => unknown>;
const getProps = (el: Element, scope: Scope): PropsObject => {
  return Object.fromEntries(
    Array.from(el.attributes).map(({ name, value }) => {
      const isBind = name.startsWith(':');
      if (isBind) {
        const boundPropName = name.slice(1);
        const scopedExpression = makeScopedExpression(value);
        return [boundPropName, () => scopedExpression(scope)];
      } else {
        return [name, () => value];
      }
    })
  );
};

export type SlotsObject = Record<string, SlotHandler>;
const getSlots = (el: Element): SlotsObject => {
  const slots = {};
  const defaultSlotElements: Node[] = [];
  // console.log({ el });
  // console.log(el.childNodes);

  let namedSlotFound = false;

  Array.from(el.childNodes)
    .filter(
      (childEl) =>
        !(
          childEl.nodeType === Node.TEXT_NODE &&
          (childEl as Text).textContent.trim().length === 0
        )
    )
    .forEach((childEl) => {
      if (
        childEl.nodeType === Node.ELEMENT_NODE &&
        (childEl as Element).tagName.toLowerCase() === 'slot'
      ) {
        const slotEl = childEl as Element;
        let slotName: string;
        if (slotEl.hasAttribute('name')) {
          slotName = slotEl.getAttribute('name');
        } else {
          slotName = slotEl
            .getAttributeNames()
            .find((attr) => attr.startsWith('#'))
            .slice(1);
        }
        slots[slotName] = [slotEl];
        namedSlotFound = true;
      } else {
        // console.log(childEl.textContent);
        if (namedSlotFound) {
          console.error(
            'All default slot content must appear before named slots'
          );
        } else {
          defaultSlotElements.push(childEl);
        }
      }
    });

  return Object.fromEntries(
    Object.entries({ ...slots, default: defaultSlotElements }).map(
      ([key, val]) => {
        return [key, (scope: Scope) => handleSlot(val, scope)];
      }
    )
  );
};

const AsyncFunction = (async () => {}).constructor;
export const makeScopedExpression = (
  expressionString: string
): ScopedExpression<unknown> => {
  const funcBody = `with ($$scope.vals) { return ${expressionString} }`;
  // console.log({ funcBody });
  return ((scope) => {
    // console.log(scope.variables);
    return new Function('$$scope', funcBody)(scope);
  }) as ScopedExpression<unknown>;
};

type StringPattern = (string | ScopedExpression<string>)[];
const parseTextNode = (text: string) => {
  //TODO handle nested {{}}
  const mustachePattern = /{{(.*)}}/g;
  const segments = text.split(mustachePattern);
  return segments.map((segment, index) => {
    const isStatic = index % 2 === 0;
    return isStatic ? segment : makeScopedExpression(segment);
  });
};

const handleSlot = (slotElements: Node[], scope: Scope): Node[] => {
  // console.log({ slotvars: scope.variables.count });
  return slotElements
    .map((el) => handleNode(el.cloneNode(true), scope))
    .filter((el) => el);
};

// console.log(handleCustomElement(document.querySelector('#test')));
