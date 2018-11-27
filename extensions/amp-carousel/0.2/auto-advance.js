const MIN_AUTO_ADVANCE_INTERVAL = 2000;

import {
  debounce,
  listenOnce,
} from './util.js';

export class AutoAdvance {
  constructor({
    element,
    scrollContainer,
    advanceable,
  }) {
    this.element = element;
    this.scrollContainer = scrollContainer;
    this.advanceable = advanceable;

    this.autoAdvance = false;
    this.autoAdvanceCount = 1;
    this.autoAdvanceInterval = MIN_AUTO_ADVANCE_INTERVAL;
    this.paused = false;

    this.debouncedAdvance = null;
    this.createDebouncedAdvance(this.autoAdvanceInterval);

    this.scrollContainer.addEventListener('scroll', (e) => this.handleScroll(e), true);
    this.scrollContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), true);
  }

  createDebouncedAdvance(interval) {
    this.debouncedAdvance = debounce(() => this.advance_(), interval);
  }

  handleTouchStart() {
    this.paused = true;

    listenOnce(window, 'touchend', () => {
      this.paused = false;
      this.resetAutoAdvance();
    }, true);
  }

  handleScroll() {
    this.resetAutoAdvance();
  }

  advance_() {
    if (!this.autoAdvance || this.paused) {
      return;
    }

    this.advanceable.advance(this.autoAdvanceCount);
  }

  resetAutoAdvance() {
    if (!this.autoAdvance) {
      return;
    }

    // For auto advance, we simply set a timeout to advance once. When
    // scrolling stops, we will get called again. This makes sure we do not
    // advance while the user is scrolling (either by touching, mousewheel or
    // momentum).
    this.debouncedAdvance();
  }

  updateAutoAdvance(autoAdvance) {
    this.autoAdvance = autoAdvance;
    this.resetAutoAdvance();
  }

  /**
   * @param autoAdvanceCount A positive number advances forwards, a negative
   *    number advances backwards.
   */
  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvanceCount = autoAdvanceCount;
    this.resetAutoAdvance();
  }

  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvanceInterval = Math.max(
        autoAdvanceInterval, MIN_AUTO_ADVANCE_INTERVAL);
    this.createDebouncedAdvance(this.autoAdvanceInterval);
    this.resetAutoAdvance();
  }
}
