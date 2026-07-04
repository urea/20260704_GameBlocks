async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/snake-garden/");
  await page.waitForFunction(() => window.__snakeGardenDebug?.ready && document.querySelector("canvas"));
  await page.waitForTimeout(2500);

  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const sample = document.createElement("canvas");
    sample.width = canvas.width;
    sample.height = canvas.height;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    const colors = new Set();
    let nonDark = 0;
    const stride = Math.max(4, Math.floor(sample.width * sample.height / 3000) * 4);
    for (let index = 0; index < data.length; index += stride) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
      if (red + green + blue > 100) nonDark += 1;
    }
    return { width: sample.width, height: sample.height, colorBuckets: colors.size, nonDark };
  });
  if (canvasStats.colorBuckets < 2 || canvasStats.nonDark < 80) {
    throw new Error(`snake canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  const before = await page.evaluate(() => window.__snakeGardenDebug.snapshot());
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(260);
  const moved = await page.evaluate(() => window.__snakeGardenDebug.snapshot());
  if (moved.head.right === before.head.right && moved.head.forward === before.head.forward) {
    throw new Error(`snake did not move after input: ${JSON.stringify({ before, moved })}`);
  }
  const completed = await page.evaluate(() => window.__snakeGardenDebug.complete());
  if (completed.status !== "complete" || completed.score !== completed.targetScore) {
    throw new Error(`snake did not complete: ${JSON.stringify(completed)}`);
  }
  await page.screenshot({ path: "output/playwright/snake-garden.png", fullPage: false });
  return { canvasStats, before, moved, completed };
}
