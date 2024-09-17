import { expect, test } from "@playwright/test";
import { getHooks, gotoTest, locateTreeItem } from "../../pw-utils.ts";

test("Inspect useMemo hook", async ({ page }) => {
	const { devtools } = await gotoTest(page, "hooks");

	await devtools.locator(locateTreeItem("Memo")).click();
	await devtools.locator('[data-testid="Hooks"]').waitFor();

	const hooks = await getHooks(devtools);
	expect(hooks).toEqual([["useMemo", "0"]]);

	// Should not be collapsable
	await expect(
		devtools.locator('[data-testid="props-row"] > button'),
	).toHaveCount(0);

	// Should not be editable
	await expect(
		devtools.locator('[data-testid="props-value"] > input'),
	).toHaveCount(0);
});
