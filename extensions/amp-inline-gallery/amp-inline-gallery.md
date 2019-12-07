---
$category@: layout
formats:
  - websites
teaser:
  text: Displays multiple similar pieces of content along a horizontal axis,
  with optional pagination dots and thumbnails.
---

<!---
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

# amp-inline-gallery

A carousel for displaying content such as images along a horizontal axis along with optional pagination dots and preview thumbnails.

<table>
  <tr>
    <td width="40%"><strong>Availability</strong></td>
    <td><div><a href="https://amp.dev/documentation/guides-and-tutorials/learn/experimental">Experimental</a>; You must turn on the <code>amp-base-carousel</code> experiment to use this component.</div></td>
  </tr>
  <tr>
    <td width="40%"><strong>Required Scripts</strong></td>
    <td>
      <div>
        <code>&lt;script async custom-element="amp-inline-gallery" src="https://cdn.ampproject.org/v0/amp-inline-gallery.js">&lt;/script></code>
      </div>
      <div>
        <code>&lt;script async custom-element="amp-base-carousel" src="https://cdn.ampproject.org/v0/amp-base-carousel.js">&lt;/script></code>
      </div>
    </td>
  </tr>
  <tr>
    <td class="col-fourty"><strong><a href="https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/control_layout">Supported Layouts</a></strong></td>
    <td>
      container
    </td>
  </tr>
</table>


## Usage

The `<amp-inline-gallery>` component uses an `<amp-base-carousel>` to display slides. Note that scripts to load both extensions are required. Typical usage might look like:

[example preview="inline" playground="true" imports="amp-inline-gallery,amp-base-carousel"]

```html
<amp-inline-gallery layout="container">
  <amp-base-carousel
      class="gallery"
      layout="responsive" width="3.6" height="2"
      snap-align="center"
      loop="true"
      visible-count="1.2"
      lightbox>
    <amp-img src="{{server_for_email}}/static/inline-examples/images/image1.jpg"
      width="450"
      height="300"></amp-img>
    <amp-img src="{{server_for_email}}/static/inline-examples/images/image2.jpg"
      width="450"
      height="300"></amp-img>
    <amp-img src="{{server_for_email}}/static/inline-examples/images/image3.jpg"
      width="450"
      height="300"></amp-img>
  </amp-base-carousel>
  <amp-inline-gallery-pagination layout="nodisplay" inset>
  </amp-inline-gallery-pagination>
</amp-inline-gallery>
```

The above example shows slides using an aspect ratio of 3:2, with 10% of a slide peeking on either side.

## Behavior

Each of the `amp-carousel` component’s immediate children is considered an item in the carousel. Each of these nodes may also have arbitrary HTML children.

The carousel consists of an arbitrary number of items, as well as optional navigational arrows to go forward or backwards. For `type="slides"`, the arrows moves one item at a time. For `type="carousel"`, the arrows move one carousel's width forwards or backwards at a time.

The carousel advances between items if the user swipes or clicks an optional navigation arrow.

[example preview="inline" playground="true" imports="amp-carousel"]

```html
<amp-carousel width="450" height="300" layout="responsive" type="slides">
  <amp-img
    src="{{server_for_email}}/static/inline-examples/images/image1.jpg"
    width="450"
    height="300"
  ></amp-img>
  <amp-img
    src="{{server_for_email}}/static/inline-examples/images/image2.jpg"
    width="450"
    height="300"
  ></amp-img>
  <amp-img
    src="{{server_for_email}}/static/inline-examples/images/image3.jpg"
    width="450"
    height="300"
  ></amp-img>
</amp-carousel>
```

[/example]

## Attributes

### amp-inline-gallery

Configurations on how the carousel and slides are displayed are done using the [`<amp-base-carousel>`](../amp-base-carousel.md) component. 

<table>
  <tr>
    <td width="40%"><strong>common attributes</strong></td>
    <td>This element includes <a href="https://amp.dev/documentation/guides-and-tutorials/learn/common_attributes">common attributes</a> extended to AMP components.</td>
  </tr>
</table>

### amp-inline-gallery-pagination


<table>
  <tr>
    <td width="40%"><strong>inset (optional)</strong></td>
    <td>Displays the pagination indicator as inset, overlaying the carousel itself. When using <code>inset</code>, you should give the <code>&lt;amp-inline-gallery-pagination&gt;</code> element <code>layout="nodisplay"</code>.</td>
  </tr>
  <tr>
    <td width="40%"><strong>common attributes</strong></td>
    <td>This element includes <a href="https://amp.dev/documentation/guides-and-tutorials/learn/common_attributes">common attributes</a> extended to AMP components.</td>
  </tr>
</table>

## Validation

See [amp-carousel rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-carousel/validator-amp-carousel.protoascii) in the AMP validator specification.
