const RESET_WINDOW_WAIT = 200;

import {
  Alignment,
  Axis,
  findOverlappingIndex,
  getDimension,
  getOffsetStart,
  setScrollPos,
  updateLengthStyle,
  updateTransformTranslateStyle,
} from './dimensions.js';
import {
  mod,
  debounce,
  debounceWithPromise,
  wrappingDistance,
  forwardWrappingDistance,
  backwardWrappingDistance,
} from './util.js';
import {
  runDisablingSmoothScroll,
  scrollIntoView,
} from './dom-util.js';


export class Scrollable {
  constructor({
    element,
    scrollContainer,
    afterSpacersRef,
    beforeSpacersRef,
    callbacks,
    runMutate,
  }) {
    this.element = element;
    this.scrollContainer = scrollContainer;
    this.afterSpacersRef = afterSpacersRef;
    this.beforeSpacersRef = beforeSpacersRef;
    this.callbacks = callbacks;
    this.runMutate = runMutate;
    this.beforeSpacers = [];
    this.afterSpacers = [];
    this.ignoreNextScroll = false;
    this.currentElementOffset = 0;

    this.alignment = Alignment.START;
    this.currentIndex = 0;
    this.axis = Axis.X;
    this.horizontal = true;
    this.initialIndex = 0;
    this.loop = false;
    this.restingIndex = NaN;
    this.slides = [];
    this.sideSlideCount = Number.MAX_SAFE_INTEGER;
    this.visibleCount = 1;

    this.boundResetWindow = () => this.resetWindow();
    this.debouncedResetWindow_ = debounce(this.boundResetWindow, RESET_WINDOW_WAIT);
    this.debouncedUpdateAll_ = debounceWithPromise(() => this.updateAll_());

    this.scrollContainer.addEventListener('scroll', (e) => this.handleScroll(e), true);
    this.scrollContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e), true);

    this.updateAll();
  }

  setSlides(slides) {
    this.slides = slides;
    this.updateSlides();
  }

  findOverlappingIndex() {
    return findOverlappingIndex(
      this.axis,
      this.alignment,
      this.element,
      this.slides,
      this.currentIndex
    );
  }

  updateAll_() {
    this.runMutate(() => {
      this.scrollContainer.setAttribute('horizontal', this.axis == Axis.X);
      this.scrollContainer.setAttribute('loop', this.loop);
      this.scrollContainer.style.setProperty('--visible-count', this.visibleCount);
  
      if (!this.slides.length) {
        return;
      }
  
      this.updateSpacers();
      this.hideDistantSlides();
      this.resetWindow(true);
      this.ignoreNextScroll = true;
      runDisablingSmoothScroll(this.scrollContainer, () => this.scrollCurrentIntoView());
    });
  }

  updateAll() {
    this.debouncedUpdateAll_();
  }

  createSpacer() {
    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    return spacer;
  }

  updateSpacers() {
    const {axis, slides} = this;
    const lengths = slides.map(slide => getDimension(axis, slide).length);
    const count = this.loop ? slides.length : 0;

    this.beforeSpacers.forEach(spacer => this.scrollContainer.removeChild(spacer));
    this.afterSpacers.forEach(spacer => this.scrollContainer.removeChild(spacer));

    this.beforeSpacers = new Array(count).fill(0)
        .map(() => this.createSpacer())
        .map(spacer => this.scrollContainer.insertBefore(spacer, this.beforeSpacersRef));
    this.afterSpacers = new Array(count).fill(0)
        .map(() => this.createSpacer())
        .map(spacer => this.scrollContainer.insertBefore(spacer, this.afterSpacersRef))
        .reverse();

    this.beforeSpacers.forEach((spacer, i) => updateLengthStyle(axis, spacer, lengths[i]));
    this.afterSpacers.forEach((spacer, i) => updateLengthStyle(axis, spacer, lengths[i]));
  }

  scrollCurrentIntoView() {
    scrollIntoView(
      this.slides[this.currentIndex],
      this.scrollContainer,
      this.axis,
      this.alignment,
    );
  }

  inLastWindow(index) {
    const {alignment, slides, visibleCount} = this;
    const startAligned = alignment == Alignment.START;
    const lastWindowSize = startAligned ? visibleCount : visibleCount / 2;

    return index >= slides.length - lastWindowSize;
  }

  advance(delta) {
    const slides = this.slides;
    const {currentIndex} = this;
    const newIndex = currentIndex + delta;
    const endIndex = slides.length - 1;
    const atStart = currentIndex === 0;
    const atEnd = currentIndex === endIndex;
    const passingStart = newIndex < 0;
    const passingEnd = newIndex > endIndex;

    if (this.loop) {
      this.updateCurrentIndex(mod(newIndex, endIndex + 1));
    } else if (delta > 0 && this.inLastWindow(currentIndex) && this.inLastWindow(newIndex)) {
      this.updateCurrentIndex(0);
    } else if (passingStart && atStart || passingEnd && !atEnd) {
      this.updateCurrentIndex(endIndex);
    } else if (passingStart && !atStart || passingEnd && atEnd) {
      this.updateCurrentIndex(0);
    } else {
      this.updateCurrentIndex(newIndex);
    }

    this.scrollCurrentIntoView();
  }

  getSpacers() {
    return [...this.scrollContainer.children].filter(e => e.className == 'spacer');
  }

  handleTouchStart() {
    this.debouncedResetWindow_();
  }

  handleScroll() {
    if (this.ignoreNextScroll) {
      this.ignoreNextScroll = false;
      return;
    }

    this.updateCurrent();
    this.debouncedResetWindow_();
  }

  updateScrollStart() {
    // Need to handle non-snapping by preserving exact scroll position.
    const {axis, currentElementOffset} = this;
    const currentElement = this.slides[this.currentIndex];
    const {length, start} = getDimension(axis, this.scrollContainer);
    const currentElementStart = Math.abs(currentElementOffset) <= length ? currentElementOffset : 0;
    const offsetStart = getOffsetStart(axis, currentElement);
    const pos = offsetStart - currentElementStart + start;

    this.ignoreNextScroll = true;
    runDisablingSmoothScroll(this.scrollContainer, () => setScrollPos(axis, this.scrollContainer, pos));
  }

  isTransformed(element) {
    return !!element._delta;
  }

  updateCurrentIndex(currentIndex) {
    this.currentIndex = currentIndex;
    this.callbacks.currentIndexChanged(currentIndex);
  }

  updateCurrent() {
    const totalWidth = this.getTotalWidth();
    const currentIndex = this.findOverlappingIndex();
    const currentElement = this.slides[currentIndex];

    // Currently not over a slide (e.g. on top of overscroll area).
    if (!currentElement) {
      return;
    }

    // Update the current offset on each scroll so that we have it up to date
    // in case of a resize.
    const dimension = getDimension(this.axis, currentElement);
    this.currentElementOffset = dimension.start;

    if (currentIndex == this.currentIndex) {
      return;
    }

    // Do not update the currentIndex if we have looped back.
    if (currentIndex == this.restingIndex && this.isTransformed(currentElement)) {
      return;
    }

    this.runMutate(() => {
      this.updateCurrentIndex(currentIndex);
      this.moveBufferElements(totalWidth);
    });
  }

  getSideSlideCount() {
    return Math.min(this.slides.length, this.sideSlideCount);
  }

  hideDistantSlides() {
    const {currentIndex, loop, slides} = this;
    const sideSlideCount = Math.min(this.slides.length, this.sideSlideCount);

    slides.forEach((s, i) => {
      const distance = loop ?
          wrappingDistance(currentIndex, i, slides.length) :
          Math.abs(currentIndex - i);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar;
    });
  }

  hideSpacers() {
    const {
      afterSpacers,
      beforeSpacers,
      currentIndex,
      slides,
    } = this;
    const sideSlideCount = Math.min(this.slides.length, this.sideSlideCount);
    const numBeforeSpacers = slides.length <= 2 ? 0 : slides.length - currentIndex - 1;
    const numAfterSpacers = slides.length <= 2 ? 0 : currentIndex;

    beforeSpacers.forEach((s, i) => {
      const distance = backwardWrappingDistance(currentIndex, i, slides.length);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i < slides.length - numBeforeSpacers;
    });
    afterSpacers.forEach((s, i) => {
      const distance = forwardWrappingDistance(currentIndex, i, slides.length);
      const tooFar = distance > sideSlideCount;
      s.hidden = tooFar || i >= numAfterSpacers;
    });
  }

  resetSlideTransforms() {
    this.slides.forEach(slide => this.setSlideTransform(slide, 0, 0));
  }

  setSlideTransform(slide, delta, totalWidth) {
    updateTransformTranslateStyle(this.axis, slide, delta * totalWidth);
    slide._delta = delta;
  }

  resetWindow(force = false) {
    if (this.restingIndex == this.currentIndex && !force) {
      return;
    }

    const totalWidth = this.getTotalWidth();

    this.runMutate(() => {
      this.restingIndex = this.currentIndex;

      this.resetSlideTransforms();
      this.hideDistantSlides();
      this.hideSpacers();
      this.moveBufferElements(totalWidth);
      this.updateScrollStart();
    });
  }

  getTotalWidth() {
    return this.slides.map(s => getDimension(this.axis, s).length)
      .reduce((p, c) => p + c);
  }

  adjustElements(totalWidth, count, isNext) {
    const {currentIndex, slides} = this;
    const current = slides[currentIndex];
    const currentDelta = (current._delta || 0);
    const dir = isNext ? 1 : -1;

    for (let i = 1; i <= count; i++) {
      const elIndex = mod(currentIndex + (i * dir), slides.length);
      const el = slides[elIndex];
      const needsMove = elIndex > currentIndex !== isNext;
      const delta = needsMove ? currentDelta + dir : currentDelta;

      this.setSlideTransform(el, delta, totalWidth);
    }
  }

  moveBufferElements(totalWidth) {
    const count = (this.slides.length - 1) / 2;

    if (!this.loop) {
      return;
    }

    if (this.slides.length <= 2) {
      return;
    }

    this.adjustElements(totalWidth, Math.floor(count), false);
    this.adjustElements(totalWidth, Math.ceil(count), true);
  }

  /**
   * TODO(sparhami) when snap = start, want to set the last `visibleCount` to
   * snap to end instead.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount = Math.max(1, visibleCount);
    this.updateAll();
  }

  updateLoop(loop) {
    this.loop = loop;
    this.updateAll();
  }
  
  updateHorizontal(horizontal) {
    this.axis = horizontal ? Axis.X : Axis.Y;
    this.updateAll();
  }

  /**
   * TODO(sparhami): Document that center works differently for Firefox when
   * the visible count is odd as it prefers snapping on the center of the
   * items at the edges rather than snapping on the center of the items near
   * the middle.
   */
  updateAlignment(alignment) {
    this.alignment = alignment == Alignment.START ? 'start' : 'center';
    this.updateAll();
  }

  updateInitialIndex(initialIndex) {
    this.initialIndex = initialIndex;
    this.updateAll();
  }

  updateSideSlideCount(sideSlideCount) {
    this.sideSlideCount = sideSlideCount > 0 ? sideSlideCount : Number.MAX_SAFE_INTEGER;
    this.updateAll();
  }

  updateSlides(slides) {
    this.slides = slides;
    this.updateCurrentIndex(Math.max(0, Math.min(this.initialIndex, this.slides.length - 1)));
    this.updateAll();
  }
}
