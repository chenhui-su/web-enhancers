import { debounce } from '../../../common/src';
import { DEBOUNCE_DELAY } from '../constants';

export class DomObserver {
  private observer: MutationObserver | undefined;

  start(callback: () => void): void {
    this.stop();
    this.observer = new MutationObserver(debounce(callback, DEBOUNCE_DELAY));
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
