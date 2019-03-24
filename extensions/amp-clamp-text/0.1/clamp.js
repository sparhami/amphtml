import {setStyle} from '../../../src/style';

/**
 * @enum {string}
 */
export const OverflowStyle = {
  INLINE: 'inline',
  DEFAULT: 'default',
};

/**
 * @typedef {{
 *  width: number,
 *  height: number,
 * }}
 */
let Dimensions;

/**
 * A zero-size dimension.
 */
const zeroSize = {
  width: 0,
  height: 0,
};

const NON_BREAKING_SPACE = '\xa0';
const CONTAINER_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-overflow';
const ELEMENT_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-child-overflow';
const ORGINAL_DATA_PROPERTY = '__AMP_CLAMP_TEXT_DATA';

/** 
 * Creates a span with an ellipsis, used to measure how much space we will need
 * for an ellipsis. Assumes that the font size used for the ellipsis here is
 * the same as the ellipsis we add.
 * 
 * - Uses `display: inline-block`, which allows us to measure the full line
 *   height and not just the text height. This is needed by the truncation
 *   code when dealing with overflow elements that are `inline-block`.
 * - Uses a non-breaking space when we have a following Node. A regular space
 *   will not allow us to measure the size correctly. When there is no
 *   following Node, we do not use a non-breaking space, since that will cause
 *   us to reserve too much space.
 * 
 * @param {!Document} doc
 * @param {boolean} hasFollowingNode
 */
function createEllipsisSpan(doc, hasFollowingNode) {
  const span = doc.createElement('span');
  const text = '…' + (hasFollowingNode ? NON_BREAKING_SPACE : '');
  setStyle(span, 'display', 'inline-block');
  span.appendChild(doc.createTextNode(text));
  return span;
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

    const ellipsisSpan = createEllipsisSpan(element.ownerDocument, true);
    return  element.appendChild(ellipsisSpan);
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
 * Gets rect at the a given index offset within the text.
 * @param {*} index 
 */
function getRect(node, index) {
  const range = document.createRange();
  let rect;

  // For Safari: leading whitespace on at the start of a line will return a
  // zero-size rect. In that case, go backwards to find a character that has
  // a rect. Since we remove whitespace before adding the ellipsis, these
  // are equivalent in terms of choosing a point to ellipsize.
  do {
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    rect = range.getBoundingClientRect();
    index -= 1;
  } while(!rect.height && index >= 0);

  return rect;
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
    const overflow = overflowWithReservedBox(rect);

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

  const text = node.data;
  const trimmedText = text.trim();

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (!trimmedText) {
    return false;
  }

  // For Safari: We need to avoid looking at the starting/trailing whitespace
  // characters that are collapsed, since they will return zero sized rects.
  // We instead search across the trimmed text, offseting when we go to check
  // for overflow.
  const startOffset = text.indexOf(trimmedText);

  // The whole Text Node overflows if we add the reserved box, so remove all the
  // text and move on.
  if (overflowAtPosition(startOffset) > 0) {
    truncateTo('');
    return false;
  }

  // Find the boundary index of where truncation should occur. The binary
  // search will always return a negative value since the overflow
  // function never returns zero.
  // We could potentially use `caretRangeFromPoint`/`caretPositionFromPoint`,
  // if available, to skip the binary search. We may still need to fallback, for
  // example if something is overlaying the text. The binary search is
  // extremely fast so there is likely very little value to adding an
  // additional code path.
  const searchIndex = binarySearch(0, trimmedText.length - 1, (index) => {
    return overflowAtPosition(index + startOffset);
  });

  // Find the index within the trimmedText, and convert it to the index in the
  // original text. We need to operate on the original text, since leading
  // whitespace is relevant if we are adjacent to another Node with text, as
  // that will result in a space between the Nodes.
  const boundaryIndex = -(searchIndex + 1) + startOffset;

  // Remove trailing whitespace since we do not want to have something like
  // "Hello world   …". We need to keep leading whitespace since we may be
  // adjacent to an inline element.
  // Add a space to the ellipsis to give it space between whatever follows.
  const newText = trimRight(text.slice(0, boundaryIndex)) + '… ';

  truncateTo(newText);
  return true;
}
