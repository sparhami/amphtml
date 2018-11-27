import {mod} from './util.js';

export const Axis = {
  X: 0,
  Y: 1,
};

export const Alignment = {
  START: 0,
  CENTER: 1,
}

export function getOffsetStart(axis, el) {
  return axis == Axis.X ? el.offsetLeft : el.offsetTop;
}

export function getDimension(axis, el) {
  const {
    top,
    bottom,
    height,
    left,
    right,
    width,
  } = el.getBoundingClientRect();

  return {
    start: axis == Axis.X ? left : top,
    end: axis == Axis.X ? right : bottom,
    length: axis == Axis.X ? width: height,
  };
}

export function updateLengthStyle(axis, el, length) {
  if (axis == Axis.X) {
    el.style.width = `${length}px`;
  } else {
    el.style.height = `${length}px`;
  }
}

export function updateTransformTranslateStyle(axis, el, delta) {
  const deltaX = axis == Axis.X ? delta : 0;
  const deltaY = axis == Axis.X ? 0 : delta;
  el.style.setProperty('transform', `translate(${deltaX}px, ${deltaY}px)`);
}

export function getScrollPos(axis, el) {
  if (axis == Axis.X) {
    return el.scrollLeft;
  }

  return el.scrollTop;
}

export function setScrollPos(axis, el, pos) {
  if (axis == Axis.X) {
    el.scrollLeft = pos;
  } else {
    el.scrollTop = pos;
  }
}

export function updateScrollPos(axis, el, delta) {
  setScrollPos(axis, el, getScrollPos(axis, el) + delta);
}

export function getCenter(axis, el) {
  const {start, end} = getDimension(axis, el);
  return start + end / 2;
}

export function getStart(axis, el) {
  const {start} = getDimension(axis, el);
  return start;
}

export function overlaps(axis, el, pos, margin) {
  const {start, end} = getDimension(axis, el);
  return start - margin <= pos && pos <= end + margin;
}

export function findOverlappingIndex(axis, alignment, container, children, margin, currentIndex) {
  const pos = alignment == Alignment.START ?
      getStart(axis, container) + 1 :
      getCenter(axis, container);

  if (overlaps(axis, children[currentIndex], pos, margin)) {
    return currentIndex;
  }

  for (let i = 1; i < children.length / 2; i++) {
    const nextIndex = mod(currentIndex + i, children.length);
    const prevIndex = mod(currentIndex - i, children.length);

    if (overlaps(axis, children[nextIndex], pos, margin)) {
      return nextIndex;
    }

    if (overlaps(axis, children[prevIndex], pos, margin)) {
      return prevIndex;
    }
  }
}
