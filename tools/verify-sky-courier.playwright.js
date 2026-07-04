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

  const signedAngleDelta = (a, b) => ((a - b + 540) % 360) - 180;
  const angleDelta = (a, b) => Math.abs(signedAngleDelta(a, b));

  const before = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(450);
  await page.keyboard.up("KeyS");
  const uprightPull = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  if (uprightPull.pitchDegrees < before.pitchDegrees + 24 || uprightPull.altitude <= before.altitude + 12) {
    throw new Error(`expected S/back-stick input to pitch up when upright: ${JSON.stringify({ before, uprightPull })}`);
  }

  await page.evaluate(() => window.__skyCourierDebug.reset());
  await page.waitForTimeout(200);
  const resetBeforeRoll = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(300);
  const rollFirst = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.waitForTimeout(300);
  const rollSecond = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(80);
  const releaseStart = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.waitForTimeout(300);
  const releasedRoll = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(650);
  await page.keyboard.up("KeyS");
  const moving = await page.evaluate(() => window.__skyCourierDebug.snapshot());

  const firstRollDelta = angleDelta(rollFirst.rollDegrees, resetBeforeRoll.rollDegrees);
  const continuedRollDelta = angleDelta(rollSecond.rollDegrees, rollFirst.rollDegrees);
  if (firstRollDelta < 16) {
    throw new Error(`expected D input to roll the aircraft: ${JSON.stringify({ resetBeforeRoll, rollFirst, firstRollDelta })}`);
  }
  if (continuedRollDelta < 16) {
    throw new Error(`expected held D input to keep rolling: ${JSON.stringify({ rollFirst, rollSecond, continuedRollDelta })}`);
  }
  const rollOnlyHeadingDelta = angleDelta(rollSecond.headingDegrees, resetBeforeRoll.headingDegrees);
  if (rollOnlyHeadingDelta > 2) {
    throw new Error(`expected expert roll-only input not to auto-turn: ${JSON.stringify({ resetBeforeRoll, rollSecond, rollOnlyHeadingDelta })}`);
  }
  const heldRollDelta = angleDelta(releasedRoll.rollDegrees, releaseStart.rollDegrees);
  if (heldRollDelta > 4) {
    throw new Error(`expected released roll input to preserve current roll angle: ${JSON.stringify({ releaseStart, releasedRoll })}`);
  }
  if (moving.speed <= before.speed) {
    throw new Error(`expected aircraft speed to increase, got before=${before.speed}, after=${moving.speed}`);
  }
  const pullTurnHeadingDelta = angleDelta(moving.headingDegrees, releasedRoll.headingDegrees);
  const pullPitchDelta = angleDelta(moving.pitchDegrees, releasedRoll.pitchDegrees);
  if (Math.abs(releasedRoll.rollDegrees) < 62 || Math.abs(releasedRoll.rollDegrees) > 110) {
    throw new Error(`expected test setup to release near a sideways bank: ${JSON.stringify({ releasedRoll })}`);
  }
  if (Math.abs(moving.rollDegrees) < 48 || pullTurnHeadingDelta < 18 || pullPitchDelta > pullTurnHeadingDelta * 0.85) {
    throw new Error(`expected S/back-stick to pitch around the local wing axis at bank: ${JSON.stringify({ resetBeforeRoll, releasedRoll, moving, pullTurnHeadingDelta, pullPitchDelta })}`);
  }

  await page.evaluate(() => window.__skyCourierDebug.reset());
  await page.waitForTimeout(200);
  const beforeRudder = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  await page.keyboard.down("KeyQ");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyQ");
  const rudder = await page.evaluate(() => window.__skyCourierDebug.snapshot());
  if (angleDelta(rudder.headingDegrees, beforeRudder.headingDegrees) < 2) {
    throw new Error(`expected Q/E rudder yaw to adjust heading when upright: ${JSON.stringify({ beforeRudder, rudder })}`);
  }

  const completed = await page.evaluate(() => window.__skyCourierDebug.completeCourse());
  if (completed.status !== "complete" || completed.gateIndex !== completed.gateCount) {
    throw new Error(`course did not complete: ${JSON.stringify(completed)}`);
  }

  await page.screenshot({ path: "output/playwright/sky-courier-complete.png", fullPage: false });
  return { canvasStats, before, uprightPull, resetBeforeRoll, rollFirst, rollSecond, releaseStart, releasedRoll, moving, pullTurnHeadingDelta, pullPitchDelta, beforeRudder, rudder, completed };
}
