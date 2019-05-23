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
import { computedStyle } from '../../../src/style';

/**
 * @type {{
 *  element: HTMLMetaElement,
 *  originalContent: ?string,
 *  rgb: ?RgbDef,
 * }} 
 */
let MetaInfo;

/**
 * Used to store / retrieve the meta theme color info for a document.
 */
const META_THEME_COLOR_INFO = '__AMP_META_THEME_COLOR_INFO';

/**
 * Creates a `<meta name='theme-color">` element and appends it to the head.
 * @param {!Document} doc
 * @return {!HTMLMetaElement} The `<meta>` element.
 */
function createMetaThemeColor(doc) {
  const meta = doc.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '';
  doc.head.appendChild(meta);
  return /** @type {!HTMLMetaElement} */(meta);
}

/**
 * Gets the infor for the `<meta name="theme-color">` element, creating one if
 * necessary.
 * @param {!Document} doc
 * @return {!MetaInfo} Information about the meta tag.
 */
function getMetaThemeColorInfo(doc) {
  if (!doc[META_THEME_COLOR_INFO]) {
    doc[META_THEME_COLOR_INFO] = {
      element: doc.querySelector('meta[name="theme-color"]') ||
          createMetaThemeColor(doc),
      originalContent: null,
      rgb: null,
    };
  }

  const metaInfo = doc[META_THEME_COLOR_INFO];

  // Save the original content, and figure out the original rgb if needed.
  if (metaInfo.originalContent == null) {
    metaInfo.originalContent = metaInfo.element.content || 'transparent';
  }

  return metaInfo;
}

/**
 * @param {!MetaInfo} metaInfo Information about the meta tag.
 */
function clearMetaThemeColorInfo(metaInfo) {
  metaInfo.originalContent = null;
}

/**
 * Sets the tint for the meta tag. This is animated between the start and end
 * colors, unless the `currentTime` config is passed, which causes the value
 * to be set immediately to the interpolated value instead.
 * 
 * This uses the web animations API to parse the color values and do the
 * interpolation. An alternative would be to parse the color values
 * 
 * If the web animations API is not supported, then no animation or
 * interpolation is performed, and the color is set to the end color.
 * 
 * @param {!MetaInfo} metaInfo Information about the meta tag.
 * @param {string} startColor The color to start on.
 * @param {string} endColor The color to end on.
 * @param {!{
 *   currentTime: number=,
 *   timing: string,
 *   duration: number,
 * }} config
 */
function updateTint(metaInfo, startColor, endColor, config) {
  const el = metaInfo.element;
  const win = el.ownerDocument.defaultView;

  // No web animations API support, so bail early.
  if (!el.animate) {
    el.content = endColor;
    return;
  }

  const anim = el.animate([
    {backgroundColor: startColor},
    {backgroundColor: endColor}
  ],
  {
    duration: config.duration,
    fill: 'forwards',
  });

  // We want to use `currentTime` to interpolate a value, so we simply pause
  // the animation at the desired time to read the value.
  if (config.currentTime) {
    anim.currentTime = config.currentTime;
    anim.pause();
  }

  // As long as the animation is running, read the computed background color
  // and set it on the meta element.
  requestAnimationFrame(function step() {
    el.content = computedStyle(win, el, 'backgroundColor');

    if (anim.playState == 'running' || anim.playState == 'pending') {
      requestAnimationFrame(step)
    }
  });
}

/**
 * @param {!Document} doc
 * @param {number} percentage A percentage that the status bar should be
 *    darkened, between zero and one.
 */
export function darkenMetaThemeColor(doc, percentage = 1) {
  devAssert(percentage >= 0);
  devAssert(percentage <= 1);

  const metaInfo = getMetaThemeColorInfo(doc);
  updateTint(metaInfo, metaInfo.originalContent, 'black', {
    currentTime: percentage * 100,
    timing: 'linear',
    duration: 100,
  });
}

/**
 * @param {!Document} doc
 * @param {{
 *   timing: string,
 *   duration: number,
 * }} config
 */
export function setMetaThemeColorToBlack(doc, config) {
  const metaInfo = getMetaThemeColorInfo(doc);
  updateTint(metaInfo, metaInfo.element.content, 'black', {
    timing: config.timing,
    duration: config.duration,
  });
}

/**
 * Restores the meta theme color.
 * @param {!Document} doc
 * @param {{
 *   timing: string,
 *   duration: number,
 * }} config
 */
export function restoreMetaThemeColor(doc, config = {}) {
  const metaInfo = getMetaThemeColorInfo(doc);
  updateTint(metaInfo, metaInfo.element.content, metaInfo.originalContent, {
    timing: config.timing,
    duration: config.duration,
  });
  clearMetaThemeColorInfo(metaInfo);
}
