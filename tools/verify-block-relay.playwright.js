async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/block-relay/");
  await page.waitForFunction(() => window.__relayBlocksDebug && document.querySelector("canvas"));
  await page.waitForTimeout(600);

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

  if (canvasStats.width < 300 || canvasStats.height < 200) {
    throw new Error(`canvas too small: ${canvasStats.width}x${canvasStats.height}`);
  }
  if (canvasStats.colorBuckets < 18 || canvasStats.nonDark < 80) {
    throw new Error(`canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  for (let right = 1; right <= 7; right += 1) {
    const point = await page.evaluate(
      (cell) => window.__relayBlocksDebug.cellToScreen(cell),
      { right, forward: 4 }
    );
    await page.mouse.click(point.x, point.y);
  }

  await page.waitForFunction(() => !document.querySelector("#run-button").disabled);
  const connectedStatus = await page.textContent("#status-chip");
  if (!/Connected/.test(connectedStatus)) {
    throw new Error(`expected connected status, got ${connectedStatus}`);
  }

  await page.click("#run-button");
  await page.waitForFunction(
    () => document.querySelector("#status-chip")?.textContent.includes("Gate linked"),
    null,
    { timeout: 6000 }
  );

  const finalSnapshot = await page.evaluate(() => window.__relayBlocksDebug.snapshot());
  await page.screenshot({ path: "output/playwright/block-relay-complete.png", fullPage: false });

  return {
    canvasStats,
    status: await page.textContent("#status-chip"),
    route: await page.textContent("#route-value"),
    blocks: await page.textContent("#blocks-value"),
    level: finalSnapshot.level.name,
  };
}
