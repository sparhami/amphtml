<!--
  1. Change "category" below to one of:
       ads-analytics
       dynamic-content
       layout
       media
       presentation
       social

  2. Remove any of the "formats" that don't apply.
     You can also add the "ads" and "stories" formats if they apply.

  3. And remove this comment! (no empty lines before "---")
-->
---
$category@: presentation
formats:
  - websites
  - email
teaser:
  text: Clamps text with an ellipsis, optionally showing an overflow element.
---
<!--
Copyright 2019 The AMP HTML Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# `amp-clamp-text`

<table>
  <tr>
    <td width="40%"><strong>Description</strong></td>
    <td>Clamps text within a container with an ellipsis.</td>
  </tr>
  <tr>
    <td width="40%"><strong>Availability</strong></td>
    <td>Stable</td>
  </tr>
  <tr>
    <td width="40%"><strong>Required Script</strong></td>
    <td><code>&lt;script async custom-element="amp-clamp-text" src="https://cdn.ampproject.org/v0/amp-clamp-text-0.1.js">&lt;/script></code></td>
  </tr>
  <tr>
    <td class="col-fourty"><strong><a href="https://www.ampproject.org/docs/guides/responsive/control_layout.html">Supported Layouts</a></strong></td>
    <td>container, fill, fixed, fixed-height, flex-item, intrinsic, nodisplay, responsive</td>
  </tr>
</table>

## Behavior

Clamps text with an ellipsis, optionally showing an overflow element when there is overflow. 

## Attributes

<table>
  <tr>
    <td width="40%"><strong>overflow-style</strong></td>
    <td>Either `right` or `default`, defaults to `default`. When `right`, this makes the overflow element take the full height, and be positioned to the right of the container.</td>
  </tr>
</table>

## Usage

```html
<amp-clamp-text layout="fixed-height" height="3em">
  Some text that may get truncated.
  <button class="amp-clamp-overflow amp-clamp-expand"> See more</button>
  <button class="amp-clamp-collapse"> See less</button>
</amp-clamp-text>
```

## Validation
See [amp-clamp-text rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-clamp-text/validator-amp-clamp-text.protoascii) in the AMP validator specification.
