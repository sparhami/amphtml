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
    runMeasure,
    runMutate,
  }) {
    this.element = element;
    this.scrollContainer = scrollContainer;
    this.afterSpacersRef = afterSpacersRef;
    this.beforeSpacersRef = beforeSpacersRef;
    this.callbacks = callbacks;
    this.runMeasure = runMeasure;
    this.runMutate = runMutate;
    this.beforeSpacers = [];
    this.afterSpacers = [];
    this.ignoreNextScroll = false;

    this.alignment = Alignment.START;
    this.currentIndex = 0;
    this.axis = Axis.X;
    this.horizontal = true;
    this.initialIndex = 0;
    this.loop = false;
    this.restingIndex = NaN;
    this.slides = [];
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

  updateScrollStart(current, viewportStart) {
    // Need to handle non-snapping by preserving exact scroll position.
    const {axis} = this;
    const {length, start} = getDimension(axis, this.scrollContainer);
    const currentElementStart = Math.abs(viewportStart) <= length ? viewportStart : 0;
    const offsetStart = getOffsetStart(axis, current);
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
    let totalWidth;
    let currentIndex;

    this.runMeasure(() => {
      totalWidth = this.getTotalWidth();
      currentIndex = this.findOverlappingIndex();
    });

    this.runMutate(() => {
      const currentElement = this.slides[currentIndex];

      // Currently not over a slide (e.g. on top of overscroll area).
      if (!currentElement) {
        return;
      }
  
      if (currentIndex == this.currentIndex) {
        return;
      }
  
      // Do not update the currentIndex if we have looped back.
      if (currentIndex == this.restingIndex && this.isTransformed(currentElement)) {
        return;
      }

      this.updateCurrentIndex(currentIndex);
      this.moveBufferElements(totalWidth);
    });
  }

  resetWindow(force = false) {
    if (this.restingIndex == this.currentIndex && !force) {
      return;
    }

    if (!this.loop && !force) {
      return;
    }

    const {axis, beforeSpacers, afterSpacers, slides} = this;
    const current = slides[this.currentIndex];
    const numBeforeSpacers = slides.length <= 2 ? 0 : slides.length - this.currentIndex - 1;
    const numAfterSpacers = slides.length <= 2 ? 0 : this.currentIndex;

    let totalWidth;
    let currentViewportStart;

    this.runMeasure(() => {
      totalWidth = this.getTotalWidth();
      currentViewportStart= getDimension(axis, current).start;
    });

    this.runMutate(() => {
      slides.forEach((slide) => {
        slide.style.transform = '';
        slide._delta = 0;
      });
      beforeSpacers.forEach((s, i) => s.hidden = i < slides.length - numBeforeSpacers);
      afterSpacers.forEach((s, i) => s.hidden = i >= numAfterSpacers);
  
      this.restingIndex = this.currentIndex;
      this.moveBufferElements(totalWidth);
      this.updateScrollStart(current, currentViewportStart);
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

      el._delta = delta;
      updateTransformTranslateStyle(this.axis, el, delta * totalWidth);

      if (elIndex == this.restingIndex && currentIndex !== this.restingIndex) {
        break;
      }
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

  updateSlides(slides) {
    this.slides = slides;
    this.updateCurrentIndex(Math.max(0, Math.min(this.initialIndex, this.slides.length - 1)));
    this.updateAll();
  }
}
