/**
 * Handles SnapAlignment for the carousel. This sets the `scroll-snap-align`
 * property correctly on each slide for different values of snapBy and
 * visibleCount.
 */
export class SnapAlignment {
  /**
   * @param {{
   *   scrollContainer: !Element,
   *   runMutate: function(function()),
   *   debounceToMicroTask: function(function()): function(),
   * }} config 
   */
  constructor({
    scrollContainer,
    runMutate,
    debounceToMicrotask,
  }) {
    /** @private @const */
    this.scrollContainer_ = scrollContainer;

    /** @private @const */
    this.runMutate_ = runMutate;

    /** @private @const */
    this.debouncedUpdateAll_ = debounceToMicrotask(() => this.updateAll_());

    /** @private {!Array<Element>} */
    this.slides_ = [];

    /** @private {string} */
    this.snapAlign_ = 'start';

    /** @private {boolean} */
    this.snap_ = true;

    /** @private {number} */
    this.snapBy_ = 1;

    /** @private {number} */
    this.visibleCount_ = 0;

    this.debouncedUpdateAll_();
  }

  /**
   * Updates the DOM for all configuration options.
   * @private
   */
  updateAll_() {
    this.runMutate_(() => {
      this.scrollContainer_.setAttribute('snap', this.snap_);
      this.scrollContainer_.style.setProperty('--snap-align', this.snapAlign_);
      this.scrollContainer_.style.setProperty('--snap-coordinate', `${this.snapAlign_ == 'start' ? '0%' : '50%'}`);
  
      this.setSlidesSnapAlign_();
    });
  }

  /**
   * Updates the snap-align for each child slide. Since the slides can exist
   * in a parent mixed with non-slides and they may not share a common tag, we
   * cannot rely on creating an :nth-of-type or :nth-child selector.
   * @private
   */
  setSlidesSnapAlign_() {
    this.slides_.forEach((slide, index) => {
      const snapAlign = this.getScrollSnapAlign_(index);
      slide.style.setProperty('scroll-snap-align', snapAlign);
    });
  }

  /**
   * Determines how to snap on a given item. This function handles grouping
   * using the snapBy option as well as edge cases on the ending few slides.
   * @param {number} index The index of an item.
   * @return {string} How to snap on the given item.
   * @private
   */
  getScrollSnapAlign_(index) {
    // Make sure when using fractional visible counts, the last item always
    // snaps on the ending edge.
    if (this.snapAlign_ == 'start' && this.slides_.length - 1 == index) {
      return 'end';
    }

    // Do not snap on items at the tail end of the group.
    if (this.snapAlign_ == 'start' && this.slides_.length - index < this.visibleCount_) {
      return 'none';
    }

    // If an item is at the start of the group, it gets an aligned.
    if (index % this.snapBy_ == 0) {
      return this.snapAlign_;
    }

    // Remaining items (in the middle of a group) do not get aligned.
    return 'none';
  }

  /**
   * @param {!Array<Element>} slides The slides to manage snapping for.
   */
  updateSlides(slides) {
    this.slides_ = slides;
    this.updateAll();
  }

  /**
   * @param {number} visibleCount How many slides are visible at a time.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount_ = Math.max(1, visibleCount);
    this.updateAll();
  }

  /**
   * @param {boolean} snap Whether or not to snap.
   */
  updateSnap(snap) {
    this.snap_ = snap;
    this.updateAll();
  }
  
  /**
   * TODO(sparhami): Document that center works differently for Firefox when
   * the visible count is odd as it prefers snapping on the center of the
   * items at the edges rather than snapping on the center of the items near
   * the middle.
   * @param {string} snapAlign How to align when snapping. Currently only start
   *    and center are supported.
   */
  updateAlignment(snapAlign) {
    this.snapAlign_ = snapAlign == 'start' ? 'start' : 'center';
    this.updateAll();
  }

  /**
   * @param {number} snapBy Snaps on every nth slide, including the zeroth
   *    slide.
   */
  updateSnapBy(snapBy) {
    this.snapBy_ = Math.max(1, snapBy);
    this.updateAll();
  }
}
