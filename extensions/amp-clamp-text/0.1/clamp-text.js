/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {BinarySearchPreference, binarySearch, BinarySearchStop} from './binary-search';
import {trimEnd} from '../../../src/string';
import {findIndex} from '../../../src/utils/array';

/**
 * @typedef {{
 *  width: number,
 *  height: number,
 * }}
 */
let DimensionsDef;

const NON_BREAKING_SPACE = '\u00a0';

/** The class to add to the container when it has overflow. */
const CONTAINER_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-overflow';

/** The class to add to a descendant element that is overflowing. */
const ELEMENT_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-child-overflow';

/** Used to save the original Text Node's data. */
const ORGINAL_DATA_PROPERTY = '__AMP_CLAMP_TEXT_DATA';

/**
 * Clamps the text within a given Element.
 *
 * To make mostly non-destructive changes for DOM diffing libraries, this
 * clears text from Text nodes rather than removing them. It does not clone
 * contents in any way so that event listeners and any expando properties are
 * maintained.
 *
 * Unlike CSS text clamping, this actually removes text from the DOM. Text
 * nodes are cleared and not removed so that almost all DOM diffing libraries
 * continue to work. One implication of actually removing text is that it is
 * unavailable to screen readers. This is unfortunate as users would need to
 * use some sort of developer provided functionality to expand the truncated
 * text, then have the content re-read.
 *
 * This function adds the ellipsis and space to the last Text node, to avoid
 * confusing libraries that may be managing the DOM. The space should probably
 * be manually added before the overflow element instead, so that it is not a
 * part of an `<a>` tag. TODO(sparhami) consider just adding a Text node for
 * the ellipsis before the overflow Element.
 *
 * This code needs to in a single pass to avoid a partial state being shown. It
 * groups reads/writes into phases so that it does not cause forced layouts
 * with other calls to clamp. TODO(sparhami) Does this make sense to move into
 * runtime?
 * 
 * This should be called from a place where it is safe to perform mutations.
 * @param {{
 *   element: !Element,
 *   contents: !Array<!Node>,
 *   overflowElement: ?Element,
 * }} config
 */
export function clampText({
  element,
  contents,
  overflowElement = null,
} = {}) {
  // Mutate, first phase: remove any effects of truncation so that we can see
  // if there is any overflow.
  if (element.hasAttribute(CONTAINER_OVERFLOW_ATTRIBUTE)) {
    element.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
    contents.forEach(node => clearTruncation(node));
  }

  const overflowing = getOverflow(element) > 0;
  if (!overflowing) {
    return;
  }

  element.setAttribute(CONTAINER_OVERFLOW_ATTRIBUTE, '');
  runTruncation(element, contents, overflowElement);
}

/**
 * @param {!Element} element
 * @return {number} The overflow in pixels, if any.
 */
function getOverflow(element) {
  return element.scrollHeight - element.offsetHeight;
}

/**
 * Clears the effects of truncation for a given subtree, unhiding Elements that
 * were hidden and restoring text content for Text Nodes.
 * @param {!Node} node The node to restore.
 */
function clearTruncation(node) {
  if (node[ORGINAL_DATA_PROPERTY]) {
    node.data = node[ORGINAL_DATA_PROPERTY];
  }

  if (node.nodeType == Node.ELEMENT_NODE) {
    node.removeAttribute(ELEMENT_OVERFLOW_ATTRIBUTE);
  }

  for (let child = node.firstChild; child; child = child.nextSibling) {
    clearTruncation(child);
  }
}

/**
 * Runs text truncation for an Element, finding the last node that needs
 * truncation and truncating it.
 * @param {!Element} element The Element to do truncation for.
 * @param {!Array<!Node>} contents The contents to do truncation for.
 * @param {?Element} overflowElement An optional Element to show when
 *    overflowing.
 */
function runTruncation(
  element,
  contents,
  overflowElement,
) {
  const expectedBox = element.getBoundingClientRect();
  const queue = [].concat(contents);
  let done = false;

  // Go through all the child Nodes until we find the node to truncate.
  while (!done && queue.length) {
    const node = queue.pop();

    // The overflow element is never truncated.
    if (node == overflowElement) {
      continue;
    }

    // If we have an element that is completely overflowing, we hide it. This
    // is because it may still take some size even if we clear out all of the
    // text. This could cause it to poke out from the bottom of the element if
    // the height is not a multtiple of the line height.
    if (node.nodeType == Node.ELEMENT_NODE &&
        node.getBoundingClientRect().top > expectedBox.bottom) {
      node.setAttribute(ELEMENT_OVERFLOW_ATTRIBUTE, '');
      continue;
    }

    // Truncate the text node. If it got ellipsized, the we are done.
    if (node.nodeType == Node.TEXT_NODE) {
      done = ellipsizeTextNode(node, element);
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
 * @param {string} char
 * @return {boolean} True if the character is whitespace, false otherwise.
 */
function isWhitespace(char) {
  return !char.trim();
}

/**
 * @param {string} char A character to check.
 * @return {boolean} True if the character is a breaking whitespace, false
 *    otherwise.
 */
function isBreakingWhitespace(char) {
  return char != NON_BREAKING_SPACE && isWhitespace(char);
}

/**
 * Ellipsizes a text node or clears the contents if none of the text fits.
 * @param {!Text} node
 * @param {!Element} element
 * @return {boolean} True if the text node was ellipsized, false if all the
 *    it was empty or all the text was removed.
 */
function ellipsizeTextNode(node, element) {
  /**
   * An accurate version of getting the underflow, by mutating the text and
   * checking for underflow.
   * @param {number} offset
   * @return {number} The amount of underflow, in pixels.
   */
  function underflowAtPosition(offset) {
    node.data = text.slice(0, offset + 1) + '… ';

    return 0 - getOverflow(element);
  }

  const text = node.data;
  // Trim leading non-breaking whitespace. We cannot use the `trimStart` as
  // `trim` removes non-breaking whitespace.
  const startOffset = findIndex(text, (char) => {
    return !isBreakingWhitespace(char);
  });

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (startOffset < 0) {
    return false;
  }

  // Use the underflow to find the boundary index of where truncation should
  // occur. As long as we have underflow, we will keep looking at a higher
  // index. Note:
  //
  // - We use BinarySearchPreference.HIGH to find the index that is
  //   overflowing when the return value is negative. When everything overflows
  //   overflows, BinarySearchPreference.LOW returns `-0`, so we would need to
  //   special case that.
  // - We use BinarySearchStop.RIGHT to find the last index that is not
  //   overflowing when the return value is positive.
  //
  // We could potentially use `caretRangeFromPoint`/`caretPositionFromPoint`
  // short cut a lot of work, but needs investigation.
  const searchIndex = binarySearch(startOffset, text.length, index => {
    // Treat whitespace as being the same as the the previous non-whitespace
    // character in terms of truncation. This is necessary as we will strip
    // trailing whitespace, so we do not to include its width when considering
    // if we overflow.
    while (isWhitespace(text[index]) && index > 0) {
      index--;
    }

    return underflowAtPosition(index);
  }, BinarySearchStop.RIGHT, BinarySearchPreference.LOW);
  const firstOverflowingIndex = searchIndex >= 0 ? searchIndex + 1 : -(searchIndex + 1);

  // Remove trailing whitespace since we do not want to have something like
  // "Hello world   …". We need to keep leading whitespace since we may be
  // adjacent to an inline element, which makes it significant.
  const fittingText = trimEnd(text.slice(0, firstOverflowingIndex));
  // If no text fits, then do not add an ellipsis.
  // Add a space to the ellipsis to give it space between whatever
  // (if anything) follows. Note we reserved enough space for this when
  // creating the ellipsis element.
  const newText = fittingText ? fittingText + '… ' : '';

  node[ORGINAL_DATA_PROPERTY] = text;
  node.data = newText;

  // We are done if we actually truncated.
  return !!fittingText;
}
