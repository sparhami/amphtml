export class SnapAlignment {
  constructor({
    scrollContainer,
    runMutate,
    debounceToMicrotask,
  }) {
    this.scrollContainer = scrollContainer;
    this.runMutate = runMutate;

    this.snapAlign = 'start';
    this.snap = true;
    this.snapBy = 1;
    this.visibleCount = 0;
    this.slides = [];

    this.debouncedUpdateAll_ = debounceToMicrotask(() => this.updateAll_());

    this.updateAll();
  }

  updateAll_() {
    this.runMutate(() => {
      this.scrollContainer.setAttribute('snap', this.snap);
      this.scrollContainer.setAttribute('snap-align', this.snapAlign);
      this.scrollContainer.style.setProperty('--snap-align', this.snapAlign);
      this.scrollContainer.style.setProperty('--snap-coordinate', `${this.snapAlign == 'start' ? '0%' : '50%'}`);
  
      this.updateDynamicStyle();
    });
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
}
