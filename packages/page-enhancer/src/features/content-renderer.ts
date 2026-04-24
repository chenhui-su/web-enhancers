import { PLUGIN_ID } from '../constants';

export class ContentRenderer {
  private readonly processed = new WeakSet<Element>();

  enhance(): void {
    document.body.classList.add(`${PLUGIN_ID}-enabled`);

    document.querySelectorAll('main, article').forEach((element) => {
      if (this.processed.has(element)) {
        return;
      }

      element.setAttribute(`data-${PLUGIN_ID}-processed`, 'true');
      this.processed.add(element);
    });
  }

  destroy(): void {
    document.body.classList.remove(`${PLUGIN_ID}-enabled`);
    document.querySelectorAll(`[data-${PLUGIN_ID}-processed]`).forEach((element) => {
      element.removeAttribute(`data-${PLUGIN_ID}-processed`);
    });
  }
}
