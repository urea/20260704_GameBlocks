async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5175/experiments/block-relay/");
  await page.waitForFunction(() => window.__relayBlocksDebug && document.querySelector("canvas"));
  await page.waitForTimeout(600);

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

  await page.screenshot({ path: "output/playwright/block-relay-mobile.png", fullPage: false });

  if (stats.colorBuckets < 6 || stats.nonDark < 50) {
    throw new Error(`mobile canvas looks blank: ${JSON.stringify(stats)}`);
  }

  return stats;
}
