const MIN_AUTO_ADVANCE_INTERVAL = 2000;

export class AutoAdvance {
  constructor({
    element,
    scrollContainer,
    advanceable,
    debounce,
    listenOnce,
  }) {
    /** @private @const */
    this.element_ = element;

    /** @private @const */
    this.scrollContainer_ = scrollContainer;

    /** @private @const */
    this.advanceable_ = advanceable;

    /** @private @const */
    this.debounce_ = debounce;

    /** @private @const */
    this.listenOnce_ = listenOnce;

    /** @private {boolean} */
    this.autoAdvance_ = false;

    /** @private {number} */
    this.autoAdvanceCount_ = 1;

    /** @private {number} */
    this.autoAdvanceInterval_ = MIN_AUTO_ADVANCE_INTERVAL;

    /** @private {boolean} */
    this.paused_ = false;

    /** @private {function()} */
    this.debouncedAdvance_ = null;

    this.createDebouncedAdvance_(this.autoAdvanceInterval_);
    this.scrollContainer_.addEventListener('scroll', (e) => this.handleScroll_(e), true);
    this.scrollContainer_.addEventListener('touchstart', (e) => this.handleTouchStart_(e), true);
  }

  /**
   * @param {boolean} autoAdvance Whether or not to autoadvance. Changing this
   *    will start or stop autoadvance.
   */
  updateAutoAdvance(autoAdvance) {
    this.autoAdvance_ = autoAdvance;
    this.resetAutoAdvance_();
  }

  /**
   * @param {number} autoAdvanceCount How many items to advance by. A positive
   *    number advances forwards, a negative number advances backwards.
   */
  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvanceCount_ = autoAdvanceCount;
    this.resetAutoAdvance_();
  }

  /**
   * @param {number} autoAdvanceInterval How much time between auto advances.
   *    This time starts counting from when scrolling has stopped.
   */
  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvanceInterval_ = Math.max(
        autoAdvanceInterval, MIN_AUTO_ADVANCE_INTERVAL);
    this.createDebouncedAdvance_(this.autoAdvanceInterval_);
    this.resetAutoAdvance_();
  }

  /**
   * Creates a debounced advance function.
   * @param {number} interval 
   * @private
   */
  createDebouncedAdvance_(interval) {
    this.debouncedAdvance_ = this.debounce_(() => this.advance_(), interval);
  }

  /**
   * Handles touchstart, pausing the autoadvance until the user lets go.
   */
  handleTouchStart_() {
    this.paused_ = true;

    this.listenOnce_(window, 'touchend', () => {
      this.paused_ = false;
      this.resetAutoAdvance_();
    }, true);
  }

  /**
   * Handles scroll, resetting the auto advance.
   */
  handleScroll_() {
    this.resetAutoAdvance_();
  }

  /** 
   * Advances, as long as auto advance is still enabled and the advancing has
   * not been paused.
   */
  advance_() {
    if (!this.autoAdvance_ || this.paused_) {
      return;
    }

    this.advanceable_.advance(this.autoAdvanceCount_);
  }

  /**
   * Resets auto advance. If auto advance is disabled, this is a no-op. If it
   * is enabled, it starts a debounced timer for advancing.
   */
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
