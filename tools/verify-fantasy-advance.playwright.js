async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:5175/experiments/fantasy-advance/");
  await page.waitForFunction(() => window.__fantasyAdvanceDebug && document.querySelector(".defense-grid"));
  await page.waitForTimeout(700);

  const initial = await page.evaluate(() => window.__fantasyAdvanceDebug.snapshot());
  if (initial.currentBatter.label !== "剣火" || initial.defenseRemaining !== 9) {
    throw new Error(`unexpected initial state: ${JSON.stringify(initial)}`);
  }

  const missSlot = await page.evaluate(() => {
    const snapshot = window.__fantasyAdvanceDebug.snapshot();
    return snapshot.teams[snapshot.defenseIndex].defenseSlots.find((slot) =>
      !slot.defeated && !slot.cardId.startsWith("magic")
    )?.index;
  });
  await page.evaluate((slotIndex) => window.__fantasyAdvanceDebug.attackSlot(slotIndex), missSlot);
  const missed = await page.evaluate(() => window.__fantasyAdvanceDebug.snapshot());
  const missedSlot = missed.teams[missed.defenseIndex].defenseSlots[missSlot];
  if (missed.outs !== 1 || missedSlot.defeated || !missedSlot.failures.includes("sword")) {
    throw new Error(`expected hidden Out failure info: ${JSON.stringify({ missed, missedSlot })}`);
  }

  await page.evaluate(() => window.__fantasyAdvanceDebug.attackBest());
  await page.evaluate(() => window.__fantasyAdvanceDebug.attackBest());
  await page.evaluate(() => window.__fantasyAdvanceDebug.attackBest());
  const after = await page.evaluate(() => window.__fantasyAdvanceDebug.snapshot());
  if (after.defenseRemaining >= 9) {
    throw new Error(`expected at least one defeated defense card: ${after.defenseRemaining}`);
  }
  if (after.log.length < 3) {
    throw new Error("expected battle log entries");
  }

  const layout = await page.evaluate(() => {
    const cardImages = Array.from(document.querySelectorAll(".fantasy-card__art"));
    const defenseButtons = Array.from(document.querySelectorAll(".defense-slot"));
    return {
      cardCount: cardImages.length,
      defenseCount: defenseButtons.length,
      scoreText: document.querySelector(".score-line")?.textContent ?? "",
      logText: document.querySelector(".battle-log")?.textContent ?? "",
      bodyHeight: document.body.scrollHeight,
      viewportHeight: innerHeight,
    };
  });
  if (layout.cardCount < 19 || layout.defenseCount !== 9) {
    throw new Error(`unexpected DOM layout: ${JSON.stringify(layout)}`);
  }

  await page.screenshot({ path: "output/playwright/fantasy-advance-desktop.png", fullPage: false });
  return { initial, after, layout };
}
