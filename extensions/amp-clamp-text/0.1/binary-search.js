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

import {devAssert} from '../../../src/log';

/**
 * @enum {number}
 */
export const BinarySearchPreference = {
  NONE: 0,
  HIGH: 1,
  LOW: 2,
};

/**
 * Does a binary search across a range of values until a condition is met. If
 * the condition is met, the index is returned. If the condition is never met,
 * the negative index, minus one is returned adjacent to where the condition
 * would be met.
 * @param {number} start The start value to look at.
 * @param {number} end The end value to look at.
 * @param {function(number): number} condition A condition function, returning
 *    positive values if the top half of the range should be searched, negative
 *    values if the bottom half should be searched, and zero if the value was
 *    found.
 * @param {?BinarySearchPreference} preference A preference on whether to end
 *    on the high side, low side, or either when there is no match found.
 * @return {number} The first value in the range that was found. If no value
 *    was found,
 */
export function binarySearch(
  start, end, condition, preference = BinarySearchPreference.NONE) {
  devAssert(start <= end);

  let low = start;
  let high = end;
  let prefIndex = NaN;

  while (high >= low) {
    const mid = low + Math.floor((high - low) / 2);
    const res = condition(mid);

    if (res == 0) {
      return mid;
    } else if (res < 0) {
      prefIndex = preference == BinarySearchPreference.HIGH ? mid : prefIndex;
      high = mid - 1;
    } else {
      prefIndex = preference == BinarySearchPreference.LOW ? mid : prefIndex;
      low = mid + 1;
    }
  }

  // Figure out the index to fallback to. If there is a low preference and we
  // end up at the end, then fall back to the last index we visited. Similar
  // for a high preference and the start.
  const index = isNaN(prefIndex) ? low : prefIndex;
  return -(index + 1);
}
