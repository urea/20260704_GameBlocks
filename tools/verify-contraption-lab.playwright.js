async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/contraption-lab/");
  await page.waitForFunction(() => window.__contraptionLabDebug && document.querySelector("canvas"));
  await page.waitForTimeout(900);

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
      if (red + green + blue > 120) nonDark += 1;
    }
    return {
      width: sample.width,
      height: sample.height,
      colorBuckets: colors.size,
      nonDark,
    };
  });

  if (canvasStats.colorBuckets < 20 || canvasStats.nonDark < 80) {
    throw new Error(`canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  const results = [];
  for (let index = 0; index < 4; index += 1) {
    const before = await page.evaluate(() => window.__contraptionLabDebug.snapshot());
    await page.evaluate(() => window.__contraptionLabDebug.placeSolution());
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__contraptionLabDebug.run());
    await page.waitForFunction(
      () => window.__contraptionLabDebug.snapshot()?.phase !== "running",
      null,
      { timeout: 17000 }
    );
    const after = await page.evaluate(() => window.__contraptionLabDebug.snapshot());
    results.push({
      level: before.level.name,
      phase: after.phase,
      elapsed: after.elapsed,
      status: after.status,
      parts: after.usedParts,
    });
    if (after.phase !== "won") {
      throw new Error(`level failed: ${JSON.stringify(results.at(-1))}`);
    }
    if (index < 3) {
      await page.click("#next-button");
      await page.waitForFunction(
        (expectedIndex) => window.__contraptionLabDebug.snapshot()?.levelIndex === expectedIndex,
        index + 1
      );
    }
  }

  await page.screenshot({ path: "output/playwright/contraption-lab-complete.png", fullPage: false });
  return { canvasStats, results };
}
