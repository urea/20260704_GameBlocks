async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/sky-courier/");
  await page.waitForFunction(() => window.__skyCourierDebug?.ready && document.querySelector("canvas"));
  await page.waitForTimeout(1200);

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
    const stride = Math.max(4, Math.floor(sample.width * sample.height / 3600) * 4);
    for (let index = 0; index < data.length; index += stride) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
      if (red + green + blue > 130) nonDark += 1;
    }
    return {
      width: sample.width,
      height: sample.height,
      colorBuckets: colors.size,
      nonDark,
    };
  });

  if (canvasStats.width < 900 || canvasStats.height < 500) {
    throw new Error(`canvas too small: ${canvasStats.width}x${canvasStats.height}`);
  }
  if (canvasStats.colorBuckets < 24 || canvasStats.nonDark < 120) {
    throw new Error(`canvas looks blank: ${JSON.stringify(canvasStats)}`);
  }

  const before = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(700);
  await page.keyboard.up("ShiftLeft");
  await page.keyboard.up("KeyD");
  await page.keyboard.up("KeyW");
  const moving = await page.evaluate(() => window.__skyCourierDebug.snapshot());

  if (moving.speed <= before.speed) {
    throw new Error(`expected aircraft speed to increase, got before=${before.speed}, after=${moving.speed}`);
  }

  const completed = await page.evaluate(() => window.__skyCourierDebug.completeCourse());
  if (completed.status !== "complete" || completed.gateIndex !== completed.gateCount) {
    throw new Error(`course did not complete: ${JSON.stringify(completed)}`);
  }

  await page.screenshot({ path: "output/playwright/sky-courier-complete.png", fullPage: false });
  return { canvasStats, before, moving, completed };
}
