import { reactive } from '@vue/reactivity';
import { CustomElementHandler } from '../components';

export type Scope = {
  variables: Record<string, unknown>;
  parentScope: Scope | undefined;
  customTags: Record<string, CustomElementHandler>;
  define: (name: string, val: unknown) => void;
  vals: Record<string, unknown>;
};

export const Scope = (parentScope?: Scope): Scope => {
  const variables = reactive({});

  const base = {};
  const scopeObj = {
    variables,
    parentScope,
    customTags: {},
    define: (name: string, val: unknown) => {
      variables[name] = val;
      // console.log('count' in scopeObj.variables);
    },
    vals: new Proxy(base, {
      get: (_, prop: string) => {
        if (typeof prop === 'symbol') {
          return base[prop];
        }

        if (prop in variables) {
          return variables[prop];
        } else if (prop in parentScope.vals) {
          return parentScope.vals[prop];
        } else {
          throw Error(`${String(prop)} is not defined`);
        }
      },
      set: (_, prop: string, val) => {
        // console.log({type: "set", prop, val})
        if (prop in variables) {
          variables[prop] = val;
          return true;
        } else if (parentScope) {
          parentScope.vals[prop] = val;
          return true;
        } else {
          throw Error(`${String(prop)} is not defined`);
        }
      },
      has: (_, prop) => {
        if (prop in variables) {
          return true;
        } else if (parentScope) {
          return prop in parentScope.vals;
        } else {
          return false;
        }
      },
    }),
  };

  return scopeObj;
};
