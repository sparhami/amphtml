const MIN_AUTO_ADVANCE_INTERVAL = 2000;

export class AutoAdvance {
  constructor({
    element,
    scrollContainer,
    advanceable,
    debounce,
    listenOnce,
  }) {
    this.element_ = element;
    this.scrollContainer_ = scrollContainer;
    this.advanceable_ = advanceable;
    this.debounce_ = debounce;
    this.listenOnce_ = listenOnce;

    this.autoAdvance_ = false;
    this.autoAdvanceCount_ = 1;
    this.autoAdvanceInterval_ = MIN_AUTO_ADVANCE_INTERVAL;
    this.paused_ = false;

    this.debouncedAdvance_ = null;
    this.createDebouncedAdvance_(this.autoAdvanceInterval_);

    this.scrollContainer_.addEventListener('scroll', (e) => this.handleScroll_(e), true);
    this.scrollContainer_.addEventListener('touchstart', (e) => this.handleTouchStart_(e), true);
  }

  updateAutoAdvance(autoAdvance) {
    this.autoAdvance_ = autoAdvance;
    this.resetAutoAdvance_();
  }

  /**
   * @param autoAdvanceCount A positive number advances forwards, a negative
   *    number advances backwards.
   */
  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvanceCount_ = autoAdvanceCount;
    this.resetAutoAdvance_();
  }

  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvanceInterval_ = Math.max(
        autoAdvanceInterval, MIN_AUTO_ADVANCE_INTERVAL);
    this.createDebouncedAdvance_(this.autoAdvanceInterval_);
    this.resetAutoAdvance_();
  }
  
  createDebouncedAdvance_(interval) {
    this.debouncedAdvance_ = this.debounce_(() => this.advance_(), interval);
  }

  handleTouchStart_() {
    this.paused_ = true;

    this.listenOnce_(window, 'touchend', () => {
      this.paused_ = false;
      this.resetAutoAdvance_();
    }, true);
  }

  handleScroll_() {
    this.resetAutoAdvance_();
  }

  advance_() {
    if (!this.autoAdvance_ || this.paused_) {
      return;
    }

    this.advanceable_.advance(this.autoAdvanceCount_);
  }

  resetAutoAdvance_() {
    if (!this.autoAdvance_) {
      return;
    }

    // For auto advance, we simply set a timeout to advance once. When
    // scrolling stops, we will get called again. This makes sure we do not
    // advance while the user is scrolling (either by touching, mousewheel or
    // momentum).
    this.debouncedAdvance_();
  }
}
