async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/turret-range/");
  await page.waitForFunction(() => window.__turretRangeDebug?.ready && document.querySelector("canvas"));
  await page.waitForTimeout(1000);

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
      if (red + green + blue > 100) nonDark += 1;
    }
    return { width: sample.width, height: sample.height, colorBuckets: colors.size, nonDark };
  });
  if (canvasStats.colorBuckets < 5 || canvasStats.nonDark < 80) {
    throw new Error(`turret canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  const before = await page.evaluate(() => window.__turretRangeDebug.snapshot());
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyA");
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  const moved = await page.evaluate(() => window.__turretRangeDebug.snapshot());
  if (Math.abs(moved.yaw - before.yaw) < 0.2 || moved.projectileCount < 1) {
    throw new Error(`turret yaw/fire did not respond: ${JSON.stringify({ before, moved })}`);
  }
  const completed = await page.evaluate(() => window.__turretRangeDebug.complete());
  if (completed.status !== "complete" || completed.remaining !== 0) {
    throw new Error(`turret range did not complete: ${JSON.stringify(completed)}`);
  }
  await page.screenshot({ path: "output/playwright/turret-range.png", fullPage: false });
  return { canvasStats, before, moved, completed };
}
