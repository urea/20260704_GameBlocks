async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5175/experiments/sky-courier/");
  await page.waitForFunction(() => window.__skyCourierDebug?.ready && document.querySelector("canvas"));
  await page.waitForTimeout(1200);

  const stats = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const sample = document.createElement("canvas");
    sample.width = canvas.width;
    sample.height = canvas.height;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    const colors = new Set();
    let nonDark = 0;
    const stride = Math.max(4, Math.floor(sample.width * sample.height / 2200) * 4);
    for (let index = 0; index < data.length; index += stride) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
      if (red + green + blue > 130) nonDark += 1;
    }
    const touchControls = getComputedStyle(document.querySelector("#touch-controls")).display;
    return {
      width: sample.width,
      height: sample.height,
      colorBuckets: colors.size,
      nonDark,
      touchControls,
    };
  });

  if (stats.colorBuckets < 18 || stats.nonDark < 70) {
    throw new Error(`mobile canvas looks blank: ${JSON.stringify(stats)}`);
  }
  if (stats.touchControls === "none") {
    throw new Error("mobile touch controls are hidden");
  }

  await page.screenshot({ path: "output/playwright/sky-courier-mobile.png", fullPage: false });
  return stats;
}
