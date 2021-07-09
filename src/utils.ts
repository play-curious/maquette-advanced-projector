import { ProjectionOptions } from "maquette";

const DEFAULT_PROJECTION_OPTIONS: ProjectionOptions = {
  namespace: undefined,
  performanceLogger: () => undefined,
  eventHandlerInterceptor: undefined,
  styleApplyer: (domNode: HTMLElement, styleName: string, value: string) => {
    // Provides a hook to add vendor prefixes for browsers that still need it.
    (domNode.style as any)[styleName] = value;
  },
};

export let applyDefaultProjectionOptions = (
  projectorOptions?: ProjectionOptions
): ProjectionOptions => {
  return { ...DEFAULT_PROJECTION_OPTIONS, ...projectorOptions };
};
