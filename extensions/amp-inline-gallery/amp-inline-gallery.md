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
    layout="responsive"
    width="3.6"
    height="2"
    snap-align="center"
    loop="true"
    visible-count="1.2"
    lightbox
  >
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
  </amp-base-carousel>
  <amp-inline-gallery-pagination layout="nodisplay" inset>
  </amp-inline-gallery-pagination>
</amp-inline-gallery>
```

[/example]

The above example shows slides using an aspect ratio of 3:2, with 10% of a slide peeking on either side. Note that the carousel itself uses an aspect ratio of 3.6:2 since we show 1.2 slides at a time.

### Using pagination indicators

The pagination indicator will render using dots if there are eight or fewer slides contained in the carousel. If there are nine or more, the pagination indicator will show what slide the user is on out of the total, aligned to the right.

Pagination can be specified as either inset (overlaying the carousel) or outset, underneath the carousel. If you want to use different styles for different screen sizes, you can do something like:

```html
<amp-inline-gallery layout="container">
  <amp-base-carousel>…</amp-base-carousel>
  <amp-inline-gallery-pagination
    media="(max-width: 599px)"
    layout="nodisplay"
    inset
  >
  </amp-inline-gallery-pagination>
  <amp-inline-gallery-pagination
    media="(min-width: 600px)"
    layout="fixed-height"
    height="24"
  >
  </amp-inline-gallery-pagination>
</amp-inline-gallery>
```

Where `media` is a [CSS Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries).

### Using thumbnails

The inline gallery can display thumbnail previews in addition or instead of the pagination indicators. When using thumbnails, some things to keep in mind are:

- You will likely want to avoid using both pagination indicators and thumbnails, unless you have eight or more thumbnails, as the indicator dots may be redundant with the thumbnails for determining progress for smaller galleries.
- When showing both inset pagination indicators and thumbnails, you will likely want to have the pagination overlap the slide as shown below.
- You can use the `media` attribute to show pagination on smaller mobile devices and thumbnails on larger screens.
- You will want to likely want to use `srcset`, allowing the thumbnails to use a lower resolution image that can load much more quickly. You can omit the `sizes` on `<amp-img>`, one will be generated automatically depending on the rendered width.

Keeping the above in mind, usage may look like:

```html
<amp-inline-gallery layout="container">
  <!-- Used to have the pagination display on top of the images. -->
  <amp-layout layout="container">
    <amp-base-carousel
      class="gallery"
      layout="responsive"
      width="3"
      height="2"
      snap-align="center"
      loop="true"
    >
      <amp-img
        class="slide"
        layout="flex-item"
        src="<large-img-url>"
        srcset="<thumbnail-image-url> 150w,
                    <medium-image-url> 600w,
                    <large-image-url> 1200w"
      >
      </amp-img>
      <!-- More slides -->
    </amp-base-carousel>
    <!--
        If using fewer than 8 slides, consider adding something
        like media="(max-width: 799px)".
      -->
    <amp-inline-gallery-pagination layout="nodisplay" inset>
    </amp-inline-gallery-pagination>
  </amp-layout>
  <amp-inline-gallery-thumbnails
    media="(min-width: 800px)"
    layout="fixed-height"
    height="96"
  >
  </amp-inline-gallery-thumbnails>
</amp-inline-gallery>
```

## Attributes

### `amp-inline-gallery`

<table>
  <tr>
    <td width="40%"><strong>common attributes</strong></td>
    <td>This element includes <a href="https://amp.dev/documentation/guides-and-tutorials/learn/common_attributes">common attributes</a> extended to AMP components.</td>
  </tr>
</table>

Configurations on how the carousel and slides are displayed are done using the [`<amp-base-carousel>`](../amp-base-carousel/amp-base-carousel.md) component.

### `amp-inline-gallery-pagination`

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

### `amp-inline-gallery-thumbnails`

<table>
  <tr>
    <td width="40%"><strong>aspect-ratio-height (optional)</strong></td>
    <td>When used with <code>aspect-ratio-width</code>, specifies the aspect ratio to use for the thumbnails. By default, the aspect ratio matches the slides in the <code>&lt;amp-base-carousel&gt;</code>.</td>
  </tr>
  <tr>
    <td width="40%"><strong>aspect-ratio-width (optional)</strong></td>
    <td>When used with <code>aspect-ratio-height</code>, specifies the aspect ratio to use for the thumbnails. By default, the aspect ratio matches the slides in the <code>&lt;amp-base-carousel&gt;</code>.</td>
  </tr>
  <tr>
    <td width="40%"><strong>loop (optional)</strong></td>
    <td>Takes a value of <code>"true"</code> or <code>"false"</code>, whether or not the thumbnails loop. Defaults to <code>"true"</code>.</td>
  </tr>
  <tr>
    <td width="40%"><strong>common attributes</strong></td>
    <td>This element includes <a href="https://amp.dev/documentation/guides-and-tutorials/learn/common_attributes">common attributes</a> extended to AMP components.</td>
  </tr>
</table>

## Validation

See [amp-carousel rules](https://github.com/ampproject/amphtml/blob/master/extensions/amp-carousel/validator-amp-carousel.protoascii) in the AMP validator specification.
