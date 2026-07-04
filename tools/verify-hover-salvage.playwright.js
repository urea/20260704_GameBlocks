async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/hover-salvage/");
  await page.waitForFunction(() => window.__hoverSalvageDebug?.ready && document.querySelector("canvas"));
  await page.waitForTimeout(1200);

  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector("#scene-root canvas");
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
    return { width: sample.width, height: sample.height, colorBuckets: colors.size, nonDark };
  });
  if (canvasStats.colorBuckets < 15 || canvasStats.nonDark < 100) {
    throw new Error(`hover canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  const before = await page.evaluate(() => window.__hoverSalvageDebug.snapshot());
  await page.keyboard.down("KeyW");
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyW");
  const moved = await page.evaluate(() => window.__hoverSalvageDebug.snapshot());
  if (moved.speed <= before.speed + 1 || moved.position.y <= before.position.y) {
    throw new Error(`hover drone did not move upward/forward: ${JSON.stringify({ before, moved })}`);
  }
  const completed = await page.evaluate(() => window.__hoverSalvageDebug.complete());
  if (completed.status !== "complete" || completed.remaining !== 0) {
    throw new Error(`hover salvage did not complete: ${JSON.stringify(completed)}`);
  }
  await page.screenshot({ path: "output/playwright/hover-salvage.png", fullPage: false });
  return { canvasStats, before, moved, completed };
}
