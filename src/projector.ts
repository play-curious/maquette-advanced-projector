import { dom, Projection, ProjectionOptions, Projector, VNode, VNodeProperties } from 'maquette';
import { applyDefaultProjectionOptions } from './utils';
import { AdvancedProjectorOptions, AllAdvancedProjectorOptions, defaultAdvancedProjectorOptions } from './advanced-projector-options';

export interface AdvancedProjector extends Projector {
  // No extra API thus far.
}

let createParentNodePath = (node: Node, rootNode: Element) => {
  let parentNodePath: Node[] = [];
  while (node !== rootNode) {
    parentNodePath.push(node);
    node = node.parentNode!;
  }
  return parentNodePath;
};

let find: <T>(items: T[], predicate: (item: T) => boolean) => T | undefined;
if (Array.prototype.find) {
  find = (items, predicate) => items.find(predicate);
} else {
  find = (items, predicate) => items.filter(predicate)[0];
}

let findVNodeByParentNodePath = (vnode: VNode, parentNodePath: Node[]): VNode | undefined => {
  let result: VNode | undefined = vnode;
  parentNodePath.forEach(node => {
    result = (result && result.children) ? find(result.children, child => child.domNode === node) : undefined;
  });
  return result;
};

export let createAdvancedProjector = (options: AdvancedProjectorOptions): AdvancedProjector => {
  let projector: Projector;
  let projectorOptions: AllAdvancedProjectorOptions = { ...defaultAdvancedProjectorOptions, ...options };
  let projectionOptions = applyDefaultProjectionOptions(projectorOptions);
  let performanceLogger = projectionOptions.performanceLogger!;
  let renderCompleted = true;
  let scheduled: number | undefined;
  let stopped = false;
  let projections = [] as Projection[];
  let renderFunctions = [] as (() => VNode)[]; // matches the projections array

  let addProjection = (
    /* one of: dom.append, dom.insertBefore, dom.replace, dom.merge */
    domFunction: (node: Element, vnode: VNode, projectionOptions: ProjectionOptions) => Projection,
    /* the parameter of the domFunction */
    node: Element,
    renderFunction: () => VNode
  ): void => {
    let projection!: Projection;
    projectionOptions.eventHandlerInterceptor = (propertyName: string, eventHandler: Function, domNode: Node, properties: VNodeProperties) => {
      return function(this: Node, evt: Event) {
        performanceLogger('domEvent', evt);
        let parentNodePath = createParentNodePath(evt.currentTarget as Element, projection.domNode);
        parentNodePath.reverse();
        let matchingVNode = findVNodeByParentNodePath(projection.getLastRender(), parentNodePath);

        let result: any;
        if (matchingVNode) {
          result = projectorOptions.handleInterceptedEvent(projector, matchingVNode, this, evt);
        }
        performanceLogger('domEventProcessed', evt);
        return result;
      };
    };
    projectorOptions.postProcessProjectionOptions?.(projectionOptions);
    let firstVNode = renderFunction();
    projection = domFunction(node, firstVNode, projectionOptions);
    projections.push(projection);
    renderFunctions.push(renderFunction);
    if (projectorOptions.afterFirstVNodeRendered) {
      projectorOptions.afterFirstVNodeRendered(projection, firstVNode);
    }
  };

  let doRender = () => {
    scheduled = undefined;
    if (!renderCompleted) {
      return; // The last render threw an error, it should have been logged in the browser console.
    }
    renderCompleted = false;
    performanceLogger('renderStart', undefined);
    for (let i = 0; i < projections.length; i++) {
      let updatedVnode = renderFunctions[i]();
      performanceLogger('rendered', undefined);
      projections[i].update(updatedVnode);
      performanceLogger('patched', undefined);
    }
    performanceLogger('renderDone', undefined);
    renderCompleted = true;
  };

  if (projectorOptions.modifyDoRenderImplementation) {
    doRender = projectorOptions.modifyDoRenderImplementation(doRender, projections, renderFunctions);
  }

  projector = {
    renderNow: doRender,
    scheduleRender: () => {
      if (!scheduled && !stopped) {
        scheduled = requestAnimationFrame(doRender);
      }
    },
    stop: () => {
      if (scheduled) {
        cancelAnimationFrame(scheduled);
        scheduled = undefined;
      }
      stopped = true;
    },

    resume: () => {
      stopped = false;
      renderCompleted = true;
      projector.scheduleRender();
    },

    append: (parentNode, renderFunction) => {
      addProjection(dom.append, parentNode, renderFunction);
    },

    insertBefore: (beforeNode, renderFunction) => {
      addProjection(dom.insertBefore, beforeNode, renderFunction);
    },

    merge: (domNode, renderFunction) => {
      addProjection(dom.merge, domNode, renderFunction);
    },

    replace: (domNode, renderFunction) => {
      addProjection(dom.replace, domNode, renderFunction);
    },

    detach: (renderFunction) => {
      for (let i = 0; i < renderFunctions.length; i++) {
        if (renderFunctions[i] === renderFunction) {
          renderFunctions.splice(i, 1);
          return projections.splice(i, 1)[0];
        }
      }
      throw new Error('renderFunction was not found');
    }

  };
  return projector;
};
