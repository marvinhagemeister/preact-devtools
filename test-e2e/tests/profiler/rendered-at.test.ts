import { expect, test } from "@playwright/test";
import {
	locateTab,
	gotoTest,
	clickRecordButton,
	locateFlame,
} from "../../pw-utils";

test("Show in which commit a node rendered", async ({ page }) => {
	const { devtools } = await gotoTest(page, "root-multi");

	await devtools.locator(locateTab("PROFILER")).click();
	await clickRecordButton(devtools);

	await page.click("#app button");
	await page.click("#app2 button");
	await page.click("#app button");
	await page.click("#app2 button");

	await clickRecordButton(devtools);

	await devtools.locator(locateFlame("Counter")).click();
	await devtools.waitForSelector('[data-testid="rendered-at"]');

	const items = await devtools
		.locator('[data-testid="rendered-at"] button')
		.count();
	expect(items).toEqual(2);

	let commits = await devtools
		.locator('[data-testid="commit-item"]')
		.evaluateAll(els =>
			Array.from(els).map(el => el.getAttribute("data-selected")),
		);
	expect(commits).toEqual(["true", "false", "false", "false"]);

	const btns = await devtools
		.locator('[data-testid="rendered-at"] button')
		.evaluateAll(els =>
			Array.from(els).map(el => el.getAttribute("data-active")),
		);

	expect(btns).toEqual(["true", "false"]);

	await devtools.click(
		'[data-testid="rendered-at"] button:not([data-active="true"])',
	);

	commits = await devtools
		.locator('[data-testid="commit-item"]')
		.evaluateAll(els =>
			Array.from(els).map(el => el.getAttribute("data-selected")),
		);
	expect(commits).toEqual(["false", "false", "true", "false"]);
});
