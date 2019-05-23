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

import {darkenMetaThemeColor, restoreMetaThemeColor} from '../meta-theme';

describes.realWin('amp-lightbox-gallery', {}, env => {
  let win, doc;

  function getMetaThemeColorElement() {
    return doc.querySelector('meta[name="theme-color"]');
  }

  function createMetaThemeColor(color) {
    const meta = doc.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    doc.head.appendChild(meta);
  }

  beforeEach(() => {
    win = env.win;
    doc = win.document;
  });

  describe('default meta theme', function() {
    it('should be created if none exists', () => {
      darkenMetaThemeColor(doc, 1);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(0, 0, 0)');
    });

    it('should clear the content when restoring', () => {
      darkenMetaThemeColor(doc, 1);
      restoreMetaThemeColor(doc);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('');
    });
  });

  describe('initial theme color', () => {
    it('should handle color names', () => {
      createMetaThemeColor('red');
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 0, 0)');
    });

    it('should handle color hex', () => {
      createMetaThemeColor('#ff0000');
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 0, 0)');
    });

    it('should handle color rgb', () => {
      createMetaThemeColor('rgb(255, 0, 0)');
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 0, 0)');
    });

    it('should handle color rgba', () => {
      createMetaThemeColor('rgba(255, 0, 0, 0.2)');
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 0, 0)');
    });

    it('should handle color hsl', () => {
      createMetaThemeColor('hsl(0, 100%, 50%)');
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 0, 0)');
    });
  });

  describe('theme color modifications', function() {
    beforeEach(() => {
      createMetaThemeColor('rgb(10, 20, 200)');
    });

    it('should darken to black', () => {
      darkenMetaThemeColor(doc, 1);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(0, 0, 0)');
    });

    it('should lighten to the original color', () => {
      darkenMetaThemeColor(doc, 0);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(10, 20, 200)');
    });

    it('should lighten part way', () => {
      darkenMetaThemeColor(doc, 0.25);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(7.5, 15, 150)');
    });

    it('should restore to the original color', () => {
      // Call multiple times, make sure we restore to the original.
      darkenMetaThemeColor(doc, 1);
      darkenMetaThemeColor(doc, 0.8);
      darkenMetaThemeColor(doc, 0.3);
      restoreMetaThemeColor(doc);

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(10, 20, 200)');
    });
  });
});
