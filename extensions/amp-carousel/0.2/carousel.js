import {AutoAdvance} from './auto-advance.js';
import {Scrollable} from './scrollable.js';
import {SnapAlignment} from './snap-alignment.js';

/**
 * @typedef {{
 *   currentIndexChanged: function(),
 * }}
 */
let Callbacks;

const defaultCallbacks = {
  currentIndexChanged: () => {},
};

/**
 * @param {function()} cb A callback function to run immediately. 
 */
function runImmediate(cb) {
  cb();
}

/**
 * @param {{
 *   element: !Element,
 *   scrollContainer: !Element,
 *   beforeSpacersRef: !Element,
 *   afterSpacersRef: !Element,
 *   callbacks: Callbacks,
 *   runMutate: ?function(function()),
 *   debounce: function(function(), number),
 *   debounceToMicrotask: function(function()),
 *   listenOnce: function(Element, string, EventListenerOptions),
 * }} config 
 */
export class Carousel {
  constructor({
    element,
    scrollContainer,
    beforeSpacersRef,
    afterSpacersRef,
    callbacks,
    runMutate = runImmediate,
    debounce,
    debounceToMicrotask,
    listenOnce,
  }) {
    /** @private @const */
    this.callbacks_ = Object.assign({}, defaultCallbacks, callbacks);

    /** @private @const */
    this.runMutate_ = runMutate;

    /** @private @const */
    this.scrollContainer_ = scrollContainer;

    /** @private @const */
    this.afterSpacersRef_ = beforeSpacersRef;

    /** @private @const */
    this.beforeSpacersRef_ = afterSpacersRef;

    /** @private @const */
    this.scrollable_ = new Scrollable({
      element,
      scrollContainer: this.scrollContainer_,
      afterSpacersRef: this.afterSpacersRef_,
      beforeSpacersRef: this.beforeSpacersRef_,
      callbacks: this.callbacks_,
      runMutate,
      debounce,
      debounceToMicrotask,
      listenOnce,
    });

    /** @private @const */
    this.autoAdvance_ = new AutoAdvance({
      scrollContainer: this.scrollContainer_,
      advanceable: this.scrollable_,
      debounce,
      listenOnce,
    });

    /** @private @const */
    this.snapAlignment_ = new SnapAlignment({
      scrollContainer: this.scrollContainer_,
      runMutate,
      debounceToMicrotask,
    });

    /** @private {number} */
    this.advanceCount_ = 1;

    /** @private {boolean} */
    this.mixedLength_ = false;

    /** @private {!Array<!Element>} */
    this.slides_ = [];

    this.updateUi();
  }

  /**
   * Moves forward by the current advance count.
   */
  next() {
    this.scrollable_.advance(this.advanceCount_);
  }

  /**
   * Moves backwards by the current advance count.
   */
  prev() {
    this.scrollable_.advance(-this.advanceCount_);
  }

  /**
   * @param {number} advanceCount How many slides to advance by. This is the
   *    number of slides moved forwards/backwards when calling prev/next.
   */
  updateAdvanceCount(advanceCount) {
    this.scrollable_.updateAdvanceCount(advanceCount);
  }

  /**
   * @param {string} alignment How to align slides when snapping or scrolling
   *    to the propgramatticaly (auto advance or next/prev).
   */
  updateAlignment(alignment) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment_.updateAlignment(alignment);
    this.scrollable_.updateAlignment(alignment);
  }

  /**
   * @param {boolean} autoAdvance Whether or not to autoadvance. Changing this
   *    will start or stop autoadvance.
   */
  updateAutoAdvance(autoAdvance) {
    this.autoAdvance_.updateAutoAdvance(autoAdvance);
  }

  /**
   * @param {number} autoAdvanceCount How many items to advance by. A positive
   *    number advances forwards, a negative number advances backwards.
   */
  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvance_.updateAutoAdvanceCount(autoAdvanceCount);
  }

  /**
   * @param {number} autoAdvanceInterval How much time between auto advances.
   *    This time starts counting from when scrolling has stopped.
   */
  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvance_.updateAutoAdvanceInterval(autoAdvanceInterval);
  }

  /**
   * @param {boolean} horizontal Whether the carousel should lay out
   *    horizontally or vertically.
   */
  updateHorizontal(horizontal) {
    this.scrollable_.updateHorizontal(horizontal);
  }

  /**
   * @param {number} initialIndex The initial index that should be shown.
   */
  updateInitialIndex(initialIndex) {
    this.scrollable_.updateInitialIndex(initialIndex);
  }

  /**
   * @param {boolean} loop Whether or not the carousel should loop when
   *    reaching the last slide.
   */
  updateLoop(loop) {
    this.scrollable_.updateLoop(loop);
  }

  /**
   * @param {boolean} mixedLength Whether the slides used mixed lengths or they
   *    should be have a length assigned in accordance to the visible count.
   */
  updateMixedLength(mixedLength) {
    this.mixedLength_ = mixedLength;
    this.updateUi();
  } 

  /**
   * @param {number} sideSlideCount The number of slides to show on either side
   *    of the current slide. This can be used to limit how far the user can
   *    swipe at a time.
   */
  updateSideSlideCount(sideSlideCount) {
    this.scrollable_.updateSideSlideCount(sideSlideCount);
  }

  /**
   * Lets the carousel know that the slides have changed. This is needed for
   * various internal calculations.
   * @param {!Array<!Element>} slides 
   */
  updateSlides(slides) {
    this.scrollable_.updateSlides(slides);
    this.snapAlignment_.updateSlides(slides);
  }

  /**
   * @param {boolean} snap Whether or not scrolling should snap on slides.
   */
  updateSnap(snap) {
    this.snapAlignment_.updateSnap(snap);
  }

  /**
   * @param {number} snapBy Tells the carousel to snap on every nth slide. This
   *    can be useful when used with the visible count to group sets of slides
   *    together.
   */
  updateSnapBy(snapBy) {
    this.snapAlignment_.updateSnapBy(snapBy);
  }
    
  /**
   * Updates the UI of the carousel. Since screen rotation can change scroll
   * position, this should be called to restore the scroll position (i.e. which
   * slide is at the start / center of the carousel, depending on alignment).
   */
  updateUi() {
    this.runMutate_(() => {
      this.scrollContainer_.setAttribute('mixed-length', this.mixedLength_);
    });
    this.scrollable_.updateUi();
  }

  /**
   * @param {number} visibleCount How many slides to show at a time within the
   *    carousel. This option is ignored if mixed lengths is set.
   */
  updateVisibleCount(visibleCount) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment_.updateVisibleCount(visibleCount);
    this.scrollable_.updateVisibleCount(visibleCount);
  }
}
