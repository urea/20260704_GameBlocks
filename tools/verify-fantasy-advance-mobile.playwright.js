async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5175/experiments/fantasy-advance/");
  await page.waitForFunction(() => window.__fantasyAdvanceDebug && document.querySelector(".defense-grid"));
  await page.waitForTimeout(700);

  const stats = await page.evaluate(() => {
    const grid = document.querySelector(".defense-grid").getBoundingClientRect();
    const scoreboard = document.querySelector(".scoreboard").getBoundingClientRect();
    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2;
    return {
      gridWidth: Math.round(grid.width),
      scoreboardWidth: Math.round(scoreboard.width),
      cardCount: document.querySelectorAll(".fantasy-card__art").length,
      overflowX,
    };
  });

  if (stats.overflowX || stats.cardCount < 19) {
    throw new Error(`mobile layout failed: ${JSON.stringify(stats)}`);
  }

  await page.screenshot({ path: "output/playwright/fantasy-advance-mobile.png", fullPage: false });
  return stats;
}
