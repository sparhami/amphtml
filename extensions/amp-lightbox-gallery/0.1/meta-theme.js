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
import {getStyle, setStyle} from '../../../src/style';
import {lerp} from '../../../src/utils/math';

/**
 * @typedef {{
 *   r: number,
 *   b: number,
 *   g: number,
 * }}
 */
let RgbDef;

/**
 * Used to store / retrieve the meta theme color info for a document.
 */
const META_THEME_COLOR_INFO = '__AMP_META_THEME_COLOR_INFO';

/**
 * Matches rgb(r, g, b... or rgba(r, g, b... and gets the r, g and b values
 * as groups.
 */
const CSS_RGB_REGEX = /rgba?\((\d+), (\d+), (\d+)/;

/**
 * Uses the browser to parse a color string into an rgb value. This ignores the
 * alpha channel, if specified. Unfortunately, CSS Typed OM does not support
 * color parsing, so we use an element to normalize to rgb(a). Since this
 * uses `hidden`, it does not cause a layout. It can cause a style however.
 * @param {string} color An input color string like #333, rgb(20, 30, 40) or
 *    hsla(100, 20%, 40%, 0.4)
 * @param {!RgbDef=} defaultRgb The default rgb values to use if the color is
 *    not a valid color.
 * @return {!RgbDef} The RGB values, from zero to 255.
 */
function colorToRgb(color, defaultRgb = {r: 255, g: 255, b: 255}) {
  const div = document.createElement('div');
  div.hidden = true; // Avoid causing layout.
  setStyle(div, 'color', color);
  document.body.appendChild(div);
  const computedColor = getStyle(div, 'color');
  const values = CSS_RGB_REGEX.exec(computedColor);
  document.body.removeChild(div);

  if (!values) {
    return defaultRgb;
  }

  return {
    r: Number(values[1]),
    g: Number(values[2]),
    b: Number(values[3]),
  };
}

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
 * @return {!{
 *  element: HTMLMetaElement,
 *  content: ?string,
 *  rgb: ?RgbDef,
 * }} Information about the 
 */
function getMetaThemeColorInfo(doc) {
  if (!doc[META_THEME_COLOR_INFO]) {
    doc[META_THEME_COLOR_INFO] = {
      element: doc.querySelector('meta[name="theme-color"]') ||
          createMetaThemeColor(doc),
      content: null,
      rgb: null,
    };
  }

  return doc[META_THEME_COLOR_INFO];
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

  // Save the original content, and figure out the original rgb if needed.
  if (metaInfo.content == null) {
    metaInfo.content = metaInfo.element.content;
    metaInfo.rgb = colorToRgb(metaInfo.content);
  }

  const r = lerp(metaInfo.rgb.r, 0, percentage);
  const g = lerp(metaInfo.rgb.g, 0, percentage);
  const b = lerp(metaInfo.rgb.b, 0, percentage);
  metaInfo.element.content = `rgb(${r}, ${g}, ${b})`;
}

/**
 * Restores the meta theme color.
 * @param {!Document} doc
 */
export function restoreMetaThemeColor(doc) {
  const metaInfo = getMetaThemeColorInfo(doc);
  metaInfo.element.content = metaInfo.content || '';
  metaInfo.content = null;
}
