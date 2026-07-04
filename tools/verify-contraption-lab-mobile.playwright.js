async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5175/experiments/contraption-lab/");
  await page.waitForFunction(() => window.__contraptionLabDebug && document.querySelector("canvas"));
  await page.waitForTimeout(900);

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
    const stride = Math.max(4, Math.floor(sample.width * sample.height / 1800) * 4);
    for (let index = 0; index < data.length; index += stride) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
      if (red + green + blue > 120) nonDark += 1;
    }
    return {
      width: sample.width,
      height: sample.height,
      colorBuckets: colors.size,
      nonDark,
    };
  });

  if (stats.colorBuckets < 14 || stats.nonDark < 40) {
    throw new Error(`mobile canvas looks blank: ${JSON.stringify(stats)}`);
  }

  await page.screenshot({ path: "output/playwright/contraption-lab-mobile.png", fullPage: false });
  return stats;
}
