import {
  debounceWithPromise,
} from './util.js';

export class SnapAlignment {
  constructor({
    scrollContainer,
  }) {
    this.scrollContainer = scrollContainer;

    this.snapAlign = 'start';
    this.slideMargin = 0;
    this.snap = true;
    this.snapBy = 1;
    this.visibleCount = 0;
    this.slides = [];

    this.debouncedUpdateAll_ = debounceWithPromise(() => this.updateAll_());

    this.updateAll();
  }

  updateAll_() {
    this.scrollContainer.setAttribute('snap', this.snap);
    this.scrollContainer.setAttribute('snap-align', this.snapAlign);
    this.scrollContainer.style.setProperty('--snap-align', this.snapAlign);
    this.scrollContainer.style.setProperty('--snap-coordinate', `calc(${this.snapAlign == 'start' ? '0%' : '50%'} - var(--slide-margin))`);

    this.updateDynamicStyle();
  }

  updateAll() {
    this.debouncedUpdateAll_();
  }

  updateDynamicStyle() {
    // Update the snap-align for each child slide. Since the slides can exist
    // in a parent mixed with non-slides and do not share a common tag, we
    // cannot rely on nth-of-type or nth-child.
    this.slides.forEach((slide, index) => {
      const snapAlign = this.getScrollSnapAlign(index);
      slide.style.setProperty('scroll-snap-align', snapAlign);
    })
  }

  getScrollSnapAlign(index) {
    // Make sure when using fractional visibile counts, the last item always
    // snaps on the ending edge.
    if (this.snapAlign == 'start' && this.slides.length - 1 == index) {
      return 'end';
    }

    if (this.snapAlign == 'start' && this.slides.length - index < this.visibleCount) {
      return 'none';
    }

    if (index % this.snapBy == 0) {
      return this.snapAlign;
    }

    return 'none';
  }

  updateSlides(slides) {
    this.slides = slides;
    this.updateAll();
  }

  /**
   * TODO(sparhami) when snap = start, want to set the last `visibleCount` to
   * snap to end instead.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount = Math.max(1, visibleCount);
    this.updateAll();
  }

  updateSnap(snap) {
    this.snap = snap;
    this.updateAll();
  }
  
  /**
   * TODO(sparhami): Document that center works differently for Firefox when
   * the visible count is odd as it prefers snapping on the center of the
   * items at the edges rather than snapping on the center of the items near
   * the middle.
   */
  updateAlignment(snapAlign) {
    this.snapAlign = snapAlign == 'start' ? 'start' : 'center';
    this.updateAll();
  }

  updateSnapBy(snapBy) {
    this.snapBy = Math.max(1, snapBy);
    this.updateAll();
  }

  /**
   * TODO(sparhami) This should be done via CSS only. However: 1. we need to
   * cache the value for performance and 2. we need to redo calculations when
   * it changes. File a feature request for observing changings to CSS custom
   * properties.
   */
  updateSlideMargin(slideMargin) {
    this.slideMargin = slideMargin;
    this.updateAll();
  }
}
