async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("https://urea.github.io/20260704_GameBlocks/experiments/fantasy-advance/");
  await page.waitForFunction(() => window.__fantasyAdvanceDebug && document.querySelector(".defense-grid"));
  await page.waitForTimeout(700);

  await page.evaluate(() => window.__fantasyAdvanceDebug.attackBest());
  const snapshot = await page.evaluate(() => window.__fantasyAdvanceDebug.snapshot());
  if (snapshot.log.length < 2 || snapshot.defenseRemaining > 9) {
    throw new Error(`unexpected public state: ${JSON.stringify(snapshot)}`);
  }

  await page.screenshot({ path: "output/playwright/fantasy-advance-public.png", fullPage: false });
  return {
    halfLabel: snapshot.halfLabel,
    currentBatter: snapshot.currentBatter.label,
    defenseRemaining: snapshot.defenseRemaining,
    logEntries: snapshot.log.length,
  };
}
