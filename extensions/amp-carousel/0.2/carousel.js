import {AutoAdvance} from './auto-advance.js';
import {Scrollable} from './scrollable.js';
import {SnapAlignment} from './snap-alignment.js';

const defaultCallbacks = {
  currentIndexChanged: () => {},
};

function runImmediate(cb) {
  cb();
}

export class Carousel {
  constructor({
    element,
    root,
    callbacks,
    runMeasure = runImmediate,
    runMutate = runImmediate,
  }) {
    this.callbacks = Object.assign({}, defaultCallbacks, callbacks);
    this.runMutate = runMutate;
    this.advanceCount = 1;
    this.mixedLength = false;
    this.slides = [];

    this.scrollContainer = root.querySelector('.scroll-container');
    this.afterSpacersRef = root.querySelector('.after-spacers-ref');
    this.beforeSpacersRef = root.querySelector('.before-spacers-ref');

    this.scrollable = new Scrollable({
      element,
      scrollContainer: this.scrollContainer,
      afterSpacersRef: this.afterSpacersRef,
      beforeSpacersRef: this.beforeSpacersRef,
      callbacks: this.callbacks,
      runMeasure,
      runMutate,
    });
    this.autoAdvance = new AutoAdvance({
      element,
      scrollContainer: this.scrollContainer,
      advanceable: this.scrollable,
    });
    this.snapAlignment = new SnapAlignment({
      scrollContainer: this.scrollContainer,
      runMutate,
    });

    this.updateAll_();
  }

  next() {
    this.scrollable.advance(this.advanceCount);
  }

  prev() {
    this.scrollable.advance(-this.advanceCount);
  }

  updateAll_() {
    this.runMutate(() => {
      this.scrollContainer.setAttribute('mixed-length', this.mixedLength);
    });
    this.scrollable.updateAll();
    this.snapAlignment.updateAll();
  }
  
  updateSlides(slides) {
    this.scrollable.updateSlides(slides);
    this.snapAlignment.updateSlides(slides);
  }

  updateMixedLength(mixedLength) {
    this.mixedLength = mixedLength;
    this.updateAll_();
  } 

  updateAdvanceCount(advanceCount) {
    this.scrollable.updateAdvanceCount(advanceCount);
  }

  updateAutoAdvance(autoAdvance) {
    this.autoAdvance.updateAutoAdvance(autoAdvance);
  }

  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvance.updateAutoAdvanceCount(autoAdvanceCount);
  }

  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvance.updateAutoAdvanceInterval(autoAdvanceInterval);
  }

  updateHorizontal(horizontal) {
    this.scrollable.updateHorizontal(horizontal);
  }

  updateInitialIndex(initialIndex) {
    this.scrollable.updateInitialIndex(initialIndex);
  }

  updateLoop(loop) {
    this.scrollable.updateLoop(loop);
  }

  updateSnap(snap) {
    this.snapAlignment.updateSnap(snap);
  }

  updateSnapBy(snapBy) {
    this.snapAlignment.updateSnapBy(snapBy);
  }

  updateAlignment(alignment) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment.updateAlignment(alignment);
    this.scrollable.updateAlignment(alignment);
  }

  updateVisibleCount(visibleCount) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment.updateVisibleCount(visibleCount);
    this.scrollable.updateVisibleCount(visibleCount);
  }
}
