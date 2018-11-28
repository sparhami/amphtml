import {
  Alignment,
  getCenter,
  getStart,
  updateScrollPos,
} from './dimensions.js';

export function runDisablingSmoothScroll(el, cb) {
  const {style} = el;
  const {scrollBehavior} = style;

  style.scrollBehavior = 'auto';
  cb();
  style.scrollBehavior = scrollBehavior;
}

export function scrollIntoView(el, container, axis, alignment) {
  const startAligned = alignment == Alignment.START;
  // Ideally this would be use scrollIntoView with the appropriate inline/block
  // options, but Safari does not support `scrollIntoViewOptions` and Firefox
  // does not support `inline`.
  const snapOffset = startAligned ? getStart(axis, el) : getCenter(axis, el);
  const pos = getStart(axis, container) - snapOffset;

  updateScrollPos(axis, container, -pos);
}
