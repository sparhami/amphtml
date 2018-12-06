import {
  Alignment,
  Axis,
  findOverlappingIndex,
  getDimension,
  getOffsetStart,
  setScrollPosition,
  updateLengthStyle,
  setTransformTranslateStyle,
} from './dimensions.js';
import {mod} from "./mod";
import {
  backwardWrappingDistance,
  forwardWrappingDistance,
  wrappingDistance,
} from './array-util.js';
import {
  runDisablingSmoothScroll,
  scrollContainerToElement,
} from './scrolling-util.js';

/**
 * How long to wait prior to resetting the scrolling window after the last
 * scroll event. Ideally this should be low, so that once the user stops
 * scrolling, things are immediately centered again. Since there can be some
 * delay between scroll events, and we do not want to move things during a
 * scroll, it cannot be too small.
 */
const RESET_WINDOW_WAIT = 200;

/**
 * @typedef {{
 *   currentIndexChanged: function(),
 * }}
 */
export let Callbacks;

export class Scrollable {
  /**
   * @param {{
   *   element: !Element,
   *   scrollContainer: !Element,
   *   beforeSpacersRef: !Element,
   *   afterSpacersRef: !Element,
   *   callbacks: !Callbacks,
   *   runMutate: ?function(function()),
   *   debounce: function(function(), number),
   *   debounceToMicrotask: function(function()),
   *   listenOnce: function(Element, string, EventListenerOptions),
   * }} config 
   */
  constructor({
    element,
    scrollContainer,
    afterSpacersRef,
    beforeSpacersRef,
    callbacks,
    runMutate,
    debounce,
    debounceToMicrotask,
    listenOnce,
  }) {
    /** @private @const */
    this.element_ = element;

    /** @private @const */
    this.scrollContainer_ = scrollContainer;

    /** @private @const */
    this.afterSpacersRef_ = afterSpacersRef;

    /** @private @const */
    this.beforeSpacersRef_ = beforeSpacersRef;

    /** @private @const */
    this.callbacks_ = callbacks;

    /** @private @const */
    this.runMutate_ = runMutate;

    /** @private @const */
    this.listenOnce_ = listenOnce;

    /** @private @const */
    this.debouncedResetWindow_ = debounce(
      () => this.resetWindow_(), RESET_WINDOW_WAIT);

    /** @private @const */
    this.debouncedUpdateUi_ = debounceToMicrotask(() => this.updateUi_());

    /** @private {!Array<Element>} */
    this.beforeSpacers_ = [];

    /** @private {!Array<Element>} */
    this.afterSpacers_ = [];

    /**
     * Set from sources of programmatic scrolls to avoid doing work associated
     * with regular scrolling.
     * @private {boolean}
     */
    this.ignoreNextScroll_ = false;

    /**
     * The offset from the start edge for the element at the current index.
     * This is used to preserve relative scroll position when updating the UI
     * after things have moved (e.g. on rotate).
     * @private {number}
     */
    this.currentElementOffset_ = 0;

    /**
     * The reference index where the the scrollable area last stopped
     * scrolling. This slide is not translated and other slides are translated
     * to move before  or after as needed. This is also used when looping to
     * prevent a single swipe from wrapping past the starting point.
     * @private {number}
     */
    this.restingIndex_ = NaN;

    /**
     * Whether or not the user is currently touching the scrollable area. This
     * is used to avoid resetting the resting point while the user is touching
     * (e.g. they have dragged part way to the next slide, but have not yet
     * released their finger).
     * @private {boolean}
     */
    this.touching_ = false;

    /** @private {!Alignment} */
    this.alignment_ = Alignment.START;

    /** @private {!Axis} */
    this.axis_ = Axis.X;

    /** @private {number} */
    this.currentIndex_ = 0;

    /** @private {boolean} */
    this.horizontal_ = true;

    /** @private {number} */
    this.initialIndex_ = 0;

    /** @private {boolean} */
    this.loop_ = false;

    /** @private {!Array<!Element>} */
    this.slides_ = [];

    /** @private {number} */
    this.sideSlideCount_ = Number.MAX_SAFE_INTEGER;
    
    /** @private {number} */
    this.visibleCount_ = 1;

    this.scrollContainer_.addEventListener('scroll', (e) => this.handleScroll_(e), true);
    this.scrollContainer_.addEventListener('touchstart', (e) => this.handleTouchStart_(e), true);
    this.updateUi();
  }

  /**
   * Moves the current index forward/backwards by a given delta and scrolls
   * the new index into view. There are a few cases where this behaves
   * differently than might be expected when not looping:
   * 
   * 1. The current index is in the last group, then the new index will be the
   * zeroth index. For example, say you have four slides, 'a', 'b', 'c' and 'd',
   * you are showing two at a time, start aligning slides and are advancing one
   * slide at a time. If you are on slide 'c', advancing will move back to 'a'
   * instead of moving to 'd', which would cause no scrolling since 'd' is
   * already visible and cannot start align itself.
   * 2. The delta would go past the start or the end and the the current index
   * is not at the start or end, then the advancement is capped to the start
   * or end respectively.
   * 3. The delta would go past the start or the end and the current index is
   * at the start or end, then the next index will be the opposite end of the
   * carousel.
   * 
   * TODO(sparhami) How can we make this work well for accessibility?
   * @param {number} delta 
   */
  advance(delta) {
    const slides = this.slides_;
    const {currentIndex_} = this;
    const newIndex = currentIndex_ + delta;
    const endIndex = slides.length - 1;
    const atStart = currentIndex_ === 0;
    const atEnd = currentIndex_ === endIndex;
    const passingStart = newIndex < 0;
    const passingEnd = newIndex > endIndex;

    if (this.loop_) {
      this.updateCurrentIndex_(mod(newIndex, endIndex + 1));
    } else if (delta > 0 && this.inLastWindow_(currentIndex_) && this.inLastWindow_(newIndex)) {
      this.updateCurrentIndex_(0);
    } else if (passingStart && atStart || passingEnd && !atEnd) {
      this.updateCurrentIndex_(endIndex);
    } else if (passingStart && !atStart || passingEnd && atEnd) {
      this.updateCurrentIndex_(0);
    } else {
      this.updateCurrentIndex_(newIndex);
    }

    this.scrollCurrentIntoView_();
  }

  /**
   * Updates the UI of the scrollable. Since screen rotation can change scroll
   * position, this should be called to restore the scroll position (i.e. which
   * slide is at the start / center of the scrollable, depending on alignment).
   */
  updateUi() {
    this.debouncedUpdateUi_();
  }
  
  /**
   * @param {string} alignment How to align slides when snapping or scrolling
   *    to the propgramatticaly (auto advance or next/prev).
   */
  updateAlignment(alignment) {
    this.alignment_ = alignment == Alignment.START ? 'start' : 'center';
    this.updateUi();
  }

  /**
   * @param {boolean} horizontal Whether the scrollable should lay out
   *    horizontally or vertically.
   */
  updateHorizontal(horizontal) {
    this.axis_ = horizontal ? Axis.X : Axis.Y;
    this.updateUi();
  }

  /**
   * @param {number} initialIndex The initial index that should be shown.
   */
  updateInitialIndex(initialIndex) {
    this.initialIndex_ = initialIndex;
    this.updateUi();
  }

  /**
   * @param {boolean} loop Whether or not the scrollable should loop when
   *    reaching the last slide.
   */
  updateLoop(loop) {
    this.loop_ = loop;
    this.updateUi();
  }
  
  /**
   * @param {number} sideSlideCount The number of slides to show on either side
   *    of the current slide. This can be used to limit how far the user can
   *    swipe at a time.
   */
  updateSideSlideCount(sideSlideCount) {
    this.sideSlideCount_ = sideSlideCount > 0 ? sideSlideCount : Number.MAX_SAFE_INTEGER;
    this.updateUi();
  }

  /**
   * Lets the scrollable know that the slides have changed. This is needed for
   * various internal calculations.
   * @param {!Array<!Element>} slides 
   */
  updateSlides(slides) {
    this.slides_ = slides;
    this.updateUi();
  }

  /**
   * @param {number} visibleCount How many slides to show at a time within the
   *    scrollable. This option is ignored if mixed lengths is set.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount_ = Math.max(1, visibleCount);
    this.updateUi();
  }

  findOverlappingIndex_() {
    return findOverlappingIndex(
      this.axis_,
      this.alignment_,
      this.element_,
      this.slides_,
      this.currentIndex_
    );
  }

  updateUi_() {
    this.runMutate_(() => {
      this.scrollContainer_.setAttribute('horizontal', this.axis_ == Axis.X);
      this.scrollContainer_.setAttribute('loop', this.loop_);
      this.scrollContainer_.style.setProperty('--visible-count', this.visibleCount_);
  
      if (!this.slides_.length) {
        return;
      }
  
      this.updateSpacers_();
      this.hideDistantSlides_();
      this.resetWindow_(true);
      this.ignoreNextScroll_ = true;
      runDisablingSmoothScroll(this.scrollContainer_, () => this.scrollCurrentIntoView_());
    });
  }

  createSpacer_() {
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    return spacer;
  }

  updateSpacers_() {
    const {axis_, slides_} = this;
    const lengths = slides_.map(slide => getDimension(axis_, slide).length);
    const count = this.loop_ ? slides_.length : 0;

    this.beforeSpacers_.forEach(spacer => this.scrollContainer_.removeChild(spacer));
    this.afterSpacers_.forEach(spacer => this.scrollContainer_.removeChild(spacer));

    this.beforeSpacers_ = new Array(count).fill(0)
        .map(() => this.createSpacer_())
        .map(spacer => this.scrollContainer_.insertBefore(spacer, this.beforeSpacersRef_));
    this.afterSpacers_ = new Array(count).fill(0)
        .map(() => this.createSpacer_())
        .map(spacer => this.scrollContainer_.insertBefore(spacer, this.afterSpacersRef_.nextSibling))
        .reverse();

    this.beforeSpacers_.forEach((spacer, i) => updateLengthStyle(axis_, spacer, lengths[i]));
    this.afterSpacers_.forEach((spacer, i) => updateLengthStyle(axis_, spacer, lengths[i]));
  }

  scrollCurrentIntoView_() {
    scrollContainerToElement(
      this.slides_[this.currentIndex_],
      this.scrollContainer_,
      this.axis_,
      this.alignment_,
    );
  }

  inLastWindow_(index) {
    const {alignment_, slides_, visibleCount_} = this;
    const startAligned = alignment_ == Alignment.START;
    const lastWindowSize = startAligned ? visibleCount_ : visibleCount_ / 2;

    return index >= slides_.length - lastWindowSize;
  }


  handleTouchStart_() {
    this.touching_ = true;

    this.listenOnce_(window, 'touchend', () => {
      this.touching_ = false;
      this.debouncedResetWindow_();
    }, true);
  }

  handleScroll_() {
    if (this.ignoreNextScroll_) {
      this.ignoreNextScroll_ = false;
      return;
    }

    this.updateCurrent_();
    this.debouncedResetWindow_();
  }

  updateScrollStart_() {
    // Need to handle non-snapping by preserving exact scroll position.
    const {axis_, currentElementOffset_} = this;
    const currentElement = this.slides_[this.currentIndex_];
    const {length, start} = getDimension(axis_, this.scrollContainer_);
    const currentElementStart = Math.abs(currentElementOffset_) <= length ? currentElementOffset_ : 0;
    const offsetStart = getOffsetStart(axis_, currentElement);
    const pos = offsetStart - currentElementStart + start;

    this.ignoreNextScroll_ = true;
    runDisablingSmoothScroll(this.scrollContainer_, () => setScrollPosition(axis_, this.scrollContainer_, pos));
  }

  isTransformed_(element) {
    return !!element._revolutions;
  }

  updateCurrentIndex_(currentIndex) {
    this.currentIndex_ = currentIndex;
    this.callbacks_.currentIndexChanged(currentIndex);
  }

  updateCurrent_() {
    const totalLength = this.getTotalLength_();
    const currentIndex = this.findOverlappingIndex_();
    const currentElement = this.slides_[currentIndex];

    // Currently not over a slide (e.g. on top of overscroll area).
    if (!currentElement) {
      return;
    }

    // Update the current offset on each scroll so that we have it up to date
    // in case of a resize.
    const dimension = getDimension(this.axis_, currentElement);
    this.currentElementOffset_ = dimension.start;

    if (currentIndex == this.currentIndex_) {
      return;
    }

    // Do not update the currentIndex if we have looped back.
    if (currentIndex == this.restingIndex_ && this.isTransformed_(currentElement)) {
      return;
    }

    this.runMutate_(() => {
      this.updateCurrentIndex_(currentIndex);
      this.moveSlides_(totalLength);
    });
  }

  hideDistantSlides_() {
    const {currentIndex_, loop_, slides_} = this;
    const sideSlideCount = Math.min(this.slides_.length, this.sideSlideCount_);

    slides_.forEach((s, i) => {
      const distance = loop_ ?
          wrappingDistance(currentIndex_, i, slides_) :
          Math.abs(currentIndex_ - i);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar;
    });
  }

  hideSpacers_() {
    const {
      afterSpacers_,
      beforeSpacers_,
      currentIndex_,
      slides_,
    } = this;
    const sideSlideCount = Math.min(this.slides_.length, this.sideSlideCount_);
    const numBeforeSpacers = slides_.length <= 2 ? 0 : slides_.length - currentIndex_;
    const numAfterSpacers = slides_.length <= 2 ? 0 : currentIndex_ - 1;

    beforeSpacers_.forEach((s, i) => {
      const distance = backwardWrappingDistance(currentIndex_, i, slides_);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i <= slides_.length - numBeforeSpacers;
    });
    afterSpacers_.forEach((s, i) => {
      const distance = forwardWrappingDistance(currentIndex_, i, slides_);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i > numAfterSpacers;
    });
  }

  resetSlideTransforms_() {
    this.slides_.forEach(slide => this.setSlideTransform_(slide, 0, 0));
  }

  /**
   * @param {!Element} slide The slide to move.
   * @param {number} revolutions How many revolutions forwards (or backwards)
   *    the slide should move.
   * @param {number} revolutionLength The length of a single revolution around
   *    the scrollable area.
   */
  setSlideTransform_(slide, revolutions, revolutionLength) {
    setTransformTranslateStyle(
        this.axis_, slide, revolutions * revolutionLength);
    slide._revolutions = revolutions;
  }

  /**
   * Resets the frame of reference for scrolling, centering things around the
   * current index and moving things as appropriate.
   * @param {boolean} force Whether or not to force the window reset, ignoring
   *    whether or not the resting index has changed.
   */
  resetWindow_(force = false) {
    // Make sure if the user is in the middle of a drag, we do not move
    // anything.
    if (this.touching_) {
      return;
    }

    // We are still on the same slide, so nothing needs to move.
    if (this.restingIndex_ == this.currentIndex_ && !force) {
      return;
    }

    const totalLength = this.getTotalLength_();

    this.runMutate_(() => {
      this.restingIndex_ = this.currentIndex_;

      this.resetSlideTransforms_();
      this.hideDistantSlides_();
      this.hideSpacers_();
      this.moveSlides_(totalLength);
      this.updateScrollStart_();
    });
  }

  /**
   * Gets the total length of all the slides. This is used to determine how far
   * slides need to be translated when moving them to be before/after the
   * current slide.
   * @return {number} The total length, in pixels.
   */
  getTotalLength_() {
    return this.slides_.map(s => getDimension(this.axis_, s).length)
      .reduce((p, c) => p + c);
  }

  /**
   * Moves slides before or after the current index by setting setting a
   * translate.
   * @param {number} totalLength The total length of all the slides.
   * @param {number} count How many slides to move.
   * @param {boolean} isAfter Whether the slides should move after or before.
   */
  moveSlidesBeforeOrAfter__(totalLength, count, isAfter) {
    const {currentIndex_, restingIndex_, slides_} = this;
    const current = slides_[currentIndex_];
    const currentRevolutions = (current._revolutions || 0);
    const dir = isAfter ? 1 : -1;

    for (let i = 1; i <= count; i++) {
      const elIndex = mod(currentIndex_ + (i * dir), slides_.length);

      if (elIndex === restingIndex_ && currentIndex_ !== restingIndex_) {
        break;
      }

      const el = slides_[elIndex];
      const needsMove = elIndex > currentIndex_ !== isAfter;
      const revolutions = needsMove ? currentRevolutions + dir :
          currentRevolutions;

      this.setSlideTransform_(el, revolutions, totalLength);
    }
  }

  /**
   * Moves slides that are not at the current index before or after by
   * translating them if necessary.
   * @param {number} totalLength The total length of all the slides.
   */
  moveSlides_(totalLength) {
    const count = (this.slides_.length - 1) / 2;

    if (!this.loop_) {
      return;
    }

    if (this.slides_.length <= 2) {
      return;
    }

    this.moveSlidesBeforeOrAfter__(totalLength, Math.floor(count), false);
    this.moveSlidesBeforeOrAfter__(totalLength, Math.ceil(count), true);
  }
}
