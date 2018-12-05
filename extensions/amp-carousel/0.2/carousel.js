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
    runMutate = runImmediate,
    debounce,
    debounceToMicrotask,
    listenOnce,
  }) {
    this.callbacks_ = Object.assign({}, defaultCallbacks, callbacks);
    this.runMutate_ = runMutate;
    this.advanceCount_ = 1;
    this.mixedLength_ = false;
    this.slides_ = [];

    this.scrollContainer_ = root.querySelector('.scroll-container');
    this.afterSpacersRef_ = root.querySelector('.after-spacers-ref');
    this.beforeSpacersRef_ = root.querySelector('.before-spacers-ref');

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
    this.autoAdvance_ = new AutoAdvance({
      element,
      scrollContainer: this.scrollContainer_,
      advanceable: this.scrollable_,
      debounce,
      listenOnce,
    });
    this.snapAlignment_ = new SnapAlignment({
      scrollContainer: this.scrollContainer_,
      runMutate,
      debounceToMicrotask,
    });

    this.updateAll();
  }

  next() {
    this.scrollable_.advance(this.advanceCount_);
  }

  prev() {
    this.scrollable_.advance(-this.advanceCount_);
  }

  updateAll() {
    this.runMutate_(() => {
      this.scrollContainer_.setAttribute('mixed-length', this.mixedLength_);
    });
    this.scrollable_.updateAll();
  }

  resetWindow() {
    this.scrollable_.resetWindow(true);
  }
  
  updateSlides(slides) {
    this.scrollable_.updateSlides(slides);
    this.snapAlignment_.updateSlides(slides);
  }

  updateMixedLength(mixedLength) {
    this.mixedLength_ = mixedLength;
    this.updateAll();
  } 

  updateAdvanceCount(advanceCount) {
    this.scrollable_.updateAdvanceCount(advanceCount);
  }

  updateAutoAdvance(autoAdvance) {
    this.autoAdvance_.updateAutoAdvance(autoAdvance);
  }

  updateAutoAdvanceCount(autoAdvanceCount) {
    this.autoAdvance_.updateAutoAdvanceCount(autoAdvanceCount);
  }

  updateAutoAdvanceInterval(autoAdvanceInterval) {
    this.autoAdvance_.updateAutoAdvanceInterval(autoAdvanceInterval);
  }

  updateHorizontal(horizontal) {
    this.scrollable_.updateHorizontal(horizontal);
  }

  updateInitialIndex(initialIndex) {
    this.scrollable_.updateInitialIndex(initialIndex);
  }

  updateLoop(loop) {
    this.scrollable_.updateLoop(loop);
  }

  updateSideSlideCount(sideSlideCount) {
    this.scrollable_.updateSideSlideCount(sideSlideCount);
  }

  updateSnap(snap) {
    this.snapAlignment_.updateSnap(snap);
  }

  updateSnapBy(snapBy) {
    this.snapAlignment_.updateSnapBy(snapBy);
  }

  updateAlignment(alignment) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment_.updateAlignment(alignment);
    this.scrollable_.updateAlignment(alignment);
  }

  updateVisibleCount(visibleCount) {
    // Update snapAlignment first, since snapping is needed prior to scroll.
    this.snapAlignment_.updateVisibleCount(visibleCount);
    this.scrollable_.updateVisibleCount(visibleCount);
  }
}
