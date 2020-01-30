import { AdvancedProjector, createAdvancedProjector } from '../src/projector';
import { expect, sinon } from './test-utilities';
import { h, VNode } from 'maquette';
import { SinonSpy, SinonStub } from 'sinon';

describe('advanced projector', () => {
  beforeEach(() => {
    global.requestAnimationFrame = sinon.stub().returns(5);
    global.cancelAnimationFrame = sinon.stub();
  });

  afterEach(() => {
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  it('can choose not to schedule render automatically from an event handler', () => {
    let advancedProjector = createAdvancedProjector({
      handleInterceptedEvent: (projector: AdvancedProjector, vNode: VNode, node: Node, evt: Event) => {
        // simplest implementation ignoring return value
        vNode.properties[`on${evt.type}`](evt);
      }
    });

    let parentElement = { appendChild: sinon.stub(), ownerDocument: document };
    let handleClick = sinon.stub();
    let renderFunction = () => h('button', { onclick: handleClick });
    advancedProjector.append(parentElement as any, renderFunction);

    let button = parentElement.appendChild.lastCall.args[0] as HTMLElement;
    let clickEvent = { currentTarget: button, type: 'click' } as object as MouseEvent;

    button.onclick.apply(button, [clickEvent]);
    expect(handleClick).to.be.calledWith(clickEvent);

    expect(global.requestAnimationFrame).not.to.be.called;
  });

  it('can replace the internal render function', () => {
    let afterFirstVNodeRendered = sinon.spy();
    let doRenderSpy: SinonSpy<any>;
    let advancedProjector = createAdvancedProjector({
      afterFirstVNodeRendered,
      modifyDoRenderImplementation: (doRender: () => void) => doRenderSpy = sinon.spy(doRender)
    });
    let renderFunction = () => h('div');
    let parentElement = { appendChild: sinon.stub(), ownerDocument: document };
    advancedProjector.append(parentElement as any, renderFunction);
    expect(afterFirstVNodeRendered).to.have.been.calledOnce;
    advancedProjector.scheduleRender();
    let render: Function = (global.requestAnimationFrame as SinonStub).lastCall.args[0];
    expect(doRenderSpy).to.not.have.been.called;
    render();
    expect(doRenderSpy).to.have.been.calledOnce;
  });
});
