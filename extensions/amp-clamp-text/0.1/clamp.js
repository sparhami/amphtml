import {toArray} from "../../../src/types";
import {htmlFor} from '../../../src/static-template';
import {devAssert} from '../../../src/log';

/**
 * @enum {string}
 */
const OverflowStyle = {
  INLINE: 'inline',
  DEFAULT: 'default',
};


const zeroSize = {
  width: 0,
  height: 0,
};

const CONTAINER_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-overflow';
const ELEMENT_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-child-overflow';
const ORGINAL_DATA_PROPERTY = '__AMP_CLAMP_TEXT_DATA';

/** 
 * Creates a span with an ellipsis, used to measure how much space we will need
 * for an ellipsis. Assumes that the font size used for the ellipsis here is
 * the same as the ellipsis we add.
 * 
 * - Uses `position: absolute` so that this does not affect layout.
 * - Uses `display: inline-block`, which allows us to measure the full line
 *   height and not just the text height. This is needed by the truncation
 *   code when dealing with overflow elements that are `inline-block`.
 * - Uses a non-breaking space so we can also measure the width of the space
 *   since we always add one (which may collapse with adjacent ones) after
 *   the ellipsis.
 */
function createEllipsisSpan(doc) {
  const html = htmlFor(doc);
  return html`<span style="position: absolute; display: inline-block;">
    …&nbsp;
  </span>`;
}

export function clamp({
  element,
  runMutation,
  overflowElement = null,
  overflowStyle = 'inline',
} = {}) {
  // Mutate, first phase
  if (element.hasAttribute(CONTAINER_OVERFLOW_ATTRIBUTE)) {
    element.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
    clearTruncation(element);
  }

  return Promise.resolve().then(() => {
    // Measure, first phase
    return isOverflowing(element);
  }).then((overflowing) => {
    if (!overflowing) {
      return;
    }

    // Mutate, second phase
    element.setAttribute(CONTAINER_OVERFLOW_ATTRIBUTE, '');

    const ellipsisSpan = createEllipsisSpan(element.ownerDocument);
    element.appendChild(ellipsisSpan);
    return ellipsisSpan;
  }).then((ellipsisSpan) => {
    if (!ellipsisSpan) {
      return;
    }

    // Measure, second phase
    // The truncation logic will group mutates into a third phase.
    runTruncation(
      element,
      overflowElement,
      overflowStyle,
      ellipsisSpan,
      runMutation,
    );
    runMutation(() => element.removeChild(ellipsisSpan));
  });
}

function isOverflowing(element) {
  return element.scrollHeight > element.offsetHeight;
}

function clearTruncation(node) {
  if (node[ORGINAL_DATA_PROPERTY]) {
    node.data = node[ORGINAL_DATA_PROPERTY];
  }

  if (node.nodeType == Node.ELEMENT_NODE) {
    node.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
  }

  for (let child = node.firstChild; child; child = child.nextSibling) {
    clearTruncation(child);
  }
}

function runTruncation(
  element,
  overflowElement,
  overflowStyle,
  ellipsisSpan,
  runMutation
) {
  const expectedBox = element.getBoundingClientRect();
  const ellipsisBox = ellipsisSpan.getBoundingClientRect();
  const reservedBox =
      overflowElement && overflowStyle == OverflowStyle.INLINE ?
      overflowElement.getBoundingClientRect() : zeroSize;
  const queue = [element];
  let done = false;

  while (!done && queue.length) {
    const node = queue.pop();

    // The overflow element is never truncated.
    if (node == overflowElement) {
      continue;
    }

    // If we have an element that is completely overflowing, we hide it. This
    // is because it may still take some size even if we clear out all of the
    // text.
    if (node.nodeType == Node.ELEMENT_NODE &&
        node.getBoundingClientRect().top > expectedBox.bottom) {
      runMutation(() => {
        node.setAttribute(ELEMENT_OVERFLOW_ATTRIBUTE, '');
      });
      continue;
    }

    // Truncate the text node. If it got ellipsized, the we are done.
    if (node.nodeType == Node.TEXT_NODE) {
      done = ellipsizeTextNode(node, expectedBox, ellipsisBox, reservedBox, runMutation);
      continue;
    }

    // By pushing the children to the queue, we traverse in reverse order of
    // children, since we want to truncate later nodes first.
    for (let child = node.firstChild; child; child = child.nextSibling) {
      queue.push(child);      
    }
  }
}

/**
 * Does a binary search across a range of values until a condition is met. If
 * the condition is met, the index is returned. If the condition is never met,
 * the negative index, minus one is returned adjacent to where the condition
 * would be met. The condition should callback should return monotonically
 * increasing values across the range.
 * @param {number} start The start value to look at.
 * @param {number} end The end value to look at.
 * @param {function(number): number} condition A condition function, returning
 *    positive values if the top half of the range should be searched, negative
 *    values if the bottom half should be searched, and zero if the value was
 *    found.
 * @return {number} The first value in the range that was found. If no value
 *    was found, 
 */
function binarySearch(start, end, condition) {
  let low = start;
  let high = end;

  while(high >= low) {
    const mid = low + Math.floor((high - low) / 2);
    const res = condition(mid);

    if (res == 0) {
      return mid;
    } else if (res > 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return -(low + 1);
}

/**
 * Gets rect at the a given index offset within a Text node.
 * @param {Node} node
 * @param {number} index 
 */
function getRect(node, index) {
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);
  
  return range.getBoundingClientRect();
}

/**
 * Trims a string on the right, using the native implementation if available,
 * @param {string} str 
 */
function trimRight(str) {
  if (str.trimRight) {
    return str.trimRight();
  }

  return ('_' + str).trim().slice(1);
}

function ellipsizeTextNode(node, expectedBox, ellipsisBox, reservedBox, runMutation) {
  const text = node.data;
  const trimmedText = text.trim();

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (!trimmedText) {
    return;
  }

  if (getRect(node, 0).height == 0) {
    return true;
  }

  return ellipsizeTextNodeUsingRange(node, expectedBox, ellipsisBox, reservedBox, runMutation);
}

function ellipsizeTextNodeUsingRange(node, expectedBox, ellipsisBox, reservedBox, runMutation) {
  function overrflowWithoutReservedBox(rect) {
    return rect.bottom - expectedBox.bottom;
  }

  function overflowWithReservedBox(rect) {
    const targetRight = expectedBox.right - reservedBox.width - ellipsisBox.width;
    const wraps = targetRight <= rect.right;
    const textLineHeightDifference = (ellipsisBox.height - rect.height);
    const requestedHeight = reservedBox.height - textLineHeightDifference;
    const requestedBottom = wraps ?
      rect.top + textLineHeightDifference + rect.height + requestedHeight :
      rect.top + Math.max(rect.height, requestedHeight);

    return requestedBottom - expectedBox.bottom;
  }

  function overflowAtPosition(index) {
    const rect = getRect(node, index);
    const overflow = reservedBox.width ? overflowWithReservedBox(rect) :
      overrflowWithoutReservedBox(rect);

    // When we have exactly zero overflow, return a negative value so that the
    // binary search keeps moving right to find the boundary of where things
    // overflow. Otherwise, the search would stop immediately. This is the same
    // as using a binary search that returns the rightmost match.
    return overflow == 0 ? -Number.MIN_VALUE : overflow;
  }

  /**
   * Truncates the Node to the new text, saving the original text.
   * @param {string} newText 
   */
  function truncateTo(newText) {
    runMutation(() => {
      node[ORGINAL_DATA_PROPERTY] = text;
      node.data = newText;
    });
  }

  // The whole Text Node overflows if we add the reserved box, so remove all the
  // text and move on.
  if (overflowAtPosition(0) > 0) {
    truncateTo('');
    return false;
  }

  // We could potentially use `caretRangeFromPoint`/`caretPositionFromPoint`,
  // if available, to skip the binary search. We may still need to fallback, for
  // example if something is covering the text. The binary search is very fast
  // so there may be very little value to this.
  // Find the boundary index of where truncation should occur. The binary
  // search will always return a negative value since the overflow
  // function never returns zero.
  const text = node.data;
  const searchIndex = binarySearch(0, text.length - 1, overflowAtPosition);
  const boundaryIndex = -(searchIndex + 1);

  // Remove trailing spaces since we do not want to have something like
  // "Hello world   …". We need to keep leading spaces since we may be
  // adjacent to an inline element.
  // Add a space to the ellipsis to give it space between whatever follows.
  // This may be collapsed if the next element has leading whitespace.
  const newText = trimRight(text.slice(0, boundaryIndex)) + '… ';

  truncateTo(newText);
  return true;
}
