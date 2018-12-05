const RESET_WINDOW_WAIT = 200;

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


export class Scrollable {
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
    this.element_ = element;
    this.scrollContainer_ = scrollContainer;
    this.afterSpacersRef_ = afterSpacersRef;
    this.beforeSpacersRef_ = beforeSpacersRef;
    this.callbacks_ = callbacks;
    this.runMutate_ = runMutate;
    this.listenOnce_ = listenOnce;
    this.beforeSpacers_ = [];
    this.afterSpacers_ = [];
    this.ignoreNextScroll_ = false;
    this.currentElementOffset_ = 0;
    this.touching_ = false;

    this.alignment_ = Alignment.START;
    this.axis_ = Axis.X;
    this.currentIndex_ = 0;
    this.horizontal_ = true;
    this.initialIndex_ = 0;
    this.loop_ = false;
    this.restingIndex_ = NaN;
    this.slides_ = [];
    this.sideSlideCount_ = Number.MAX_SAFE_INTEGER;
    this.visibleCount_ = 1;

    this.boundResetWindow = () => this.resetWindow_();
    this.debouncedResetWindow_ = debounce(this.boundResetWindow, RESET_WINDOW_WAIT);
    this.debouncedUpdateAll_ = debounceToMicrotask(() => this.updateAll_());

    this.scrollContainer_.addEventListener('scroll', (e) => this.handleScroll_(e), true);
    this.scrollContainer_.addEventListener('touchstart', (e) => this.handleTouchStart_(e), true);

    this.updateAll();
  }

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

  updateAll() {
    this.debouncedUpdateAll_();
  }

  updateSlides(slides) {
    this.slides_ = slides;
    this.updateSlides();
  }

  /**
   * TODO(sparhami) when snap = start, want to set the last `visibleCount` to
   * snap to end instead.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount_ = Math.max(1, visibleCount);
    this.updateAll();
  }

  updateLoop(loop) {
    this.loop_ = loop;
    this.updateAll();
  }
  
  updateHorizontal(horizontal) {
    this.axis_ = horizontal ? Axis.X : Axis.Y;
    this.updateAll();
  }

  /**
   * TODO(sparhami): Document that center works differently for Firefox when
   * the visible count is odd as it prefers snapping on the center of the
   * items at the edges rather than snapping on the center of the items near
   * the middle.
   */
  updateAlignment(alignment) {
    this.alignment_ = alignment == Alignment.START ? 'start' : 'center';
    this.updateAll();
  }

  updateInitialIndex(initialIndex) {
    this.initialIndex_ = initialIndex;
    this.updateAll();
  }

  updateSideSlideCount(sideSlideCount) {
    this.sideSlideCount_ = sideSlideCount > 0 ? sideSlideCount : Number.MAX_SAFE_INTEGER;
    this.updateAll();
  }

  updateSlides(slides) {
    this.slides_ = slides;
    this.updateCurrentIndex_(Math.max(0, Math.min(this.initialIndex_, this.slides_.length - 1)));
    this.updateAll();
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

  updateAll_() {
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
        .map(spacer => this.scrollContainer_.insertBefore(spacer, this.afterSpacersRef_))
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
    return !!element._delta;
  }

  updateCurrentIndex_(currentIndex) {
    this.currentIndex_ = currentIndex;
    this.callbacks_.currentIndexChanged(currentIndex);
  }

  updateCurrent_() {
    const totalWidth = this.getTotalWidth_();
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
      this.moveBufferElements_(totalWidth);
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
    const numBeforeSpacers = slides_.length <= 2 ? 0 : slides_.length - currentIndex_ - 1;
    const numAfterSpacers = slides_.length <= 2 ? 0 : currentIndex_;

    beforeSpacers_.forEach((s, i) => {
      const distance = backwardWrappingDistance(currentIndex_, i, slides_);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i < slides_.length - numBeforeSpacers;
    });
    afterSpacers_.forEach((s, i) => {
      const distance = forwardWrappingDistance(currentIndex_, i, slides_);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i >= numAfterSpacers;
    });
  }

  resetSlideTransforms_() {
    this.slides_.forEach(slide => this.setSlideTransform_(slide, 0, 0));
  }

  setSlideTransform_(slide, delta, totalWidth) {
    setTransformTranslateStyle(this.axis_, slide, delta * totalWidth);
    slide._delta = delta;
  }

  resetWindow_(force = false) {
    if (this.touching_) {
      return;
    }

    if (this.restingIndex_ == this.currentIndex_ && !force) {
      return;
    }

    const totalWidth = this.getTotalWidth_();

    this.runMutate_(() => {
      this.restingIndex_ = this.currentIndex_;

      this.resetSlideTransforms_();
      this.hideDistantSlides_();
      this.hideSpacers_();
      this.moveBufferElements_(totalWidth);
      this.updateScrollStart_();
    });
  }

  getTotalWidth_() {
    return this.slides_.map(s => getDimension(this.axis_, s).length)
      .reduce((p, c) => p + c);
  }

  adjustElements_(totalWidth, count, isNext) {
    const {currentIndex_, slides_} = this;
    const current = slides_[currentIndex_];
    const currentDelta = (current._delta || 0);
    const dir = isNext ? 1 : -1;

    for (let i = 1; i <= count; i++) {
      const elIndex = mod(currentIndex_ + (i * dir), slides_.length);
      const el = slides_[elIndex];
      const needsMove = elIndex > currentIndex_ !== isNext;
      const delta = needsMove ? currentDelta + dir : currentDelta;

      this.setSlideTransform_(el, delta, totalWidth);
    }
  }

  moveBufferElements_(totalWidth) {
    const count = (this.slides_.length - 1) / 2;

    if (!this.loop_) {
      return;
    }

    if (this.slides_.length <= 2) {
      return;
    }

    this.adjustElements_(totalWidth, Math.floor(count), false);
    this.adjustElements_(totalWidth, Math.ceil(count), true);
  }
}
