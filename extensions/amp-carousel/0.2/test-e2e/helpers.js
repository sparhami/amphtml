const slottedClass = 'i-amphtml-carousel-slotted';

async function waitForImgLoad(controller, el) {
  await expect(controller.getElementProperty(el, 'naturalWidth')).to.be.greaterThan(0);
}

export  async function waitForCarouselImg(controller, n) {
  // We cannot use CSS's nth child due to non-slide elements in the scroll
  // container. We query all the imgs upfront, since they might not have
  // laid out yet.
  const el = await controller.findElementXPath(
      `//amp-carousel//div[contains(@class, "${slottedClass}")][${n + 1}]` +
      '//img');
  return await waitForImgLoad(controller, el);
}

export async function getSlide(controller, n) {
  return await controller.findElementXPath(
      `//amp-carousel//div[contains(@class, "${slottedClass}")][${n + 1}]`);
}