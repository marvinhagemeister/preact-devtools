import { newTestPage, getHooks, waitForSelector } from "../../test-utils";
import { expect } from "chai";
import { clickNestedText } from "pentf/browser_utils";

export const description = "Show custom hook name";

export async function run(config: any) {
	const { devtools } = await newTestPage(config, "hooks-name");

	const hooksPanel = '[data-testid="props-row"]';

	// Counter
	await clickNestedText(devtools, /Counter$/, {
		retryUntil: async () => {
			return !!(await devtools.$('[data-testid="Hooks"]'));
		},
	});
	await waitForSelector(devtools, hooksPanel);

	expect(await getHooks(devtools)).to.deep.equal([
		["useState customState", "0"],
	]);

	// Callback (Mixed)
	await clickNestedText(devtools, /CounterCallback$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([
		["useState counterState", "0"],
		["useCallback", "ƒ ()"],
	]);

	// Reducer
	await clickNestedText(devtools, /ReducerComponent$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([
		["useReducer customReducer", '"foo"'],
	]);

	// Ref
	await clickNestedText(devtools, /RefComponent$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([["useRef customRef", "0"]]);

	// useMemo
	await clickNestedText(devtools, /MemoComponent$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([["useMemo customMemo", "0"]]);

	// Multiple (test ordering)
	await clickNestedText(devtools, /^Multiple$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([
		["useState foo", "0"],
		["useState bar", "0"],
		["useState baz", "0"],
	]);

	// Do nothing for invalid callsites
	await clickNestedText(devtools, /CallbackOnly$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([["useCallback", "ƒ ()"]]);

	await clickNestedText(devtools, /LayoutEffect$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([["useLayoutEffect", "ƒ ()"]]);

	await clickNestedText(devtools, /^Effect$/);
	await waitForSelector(devtools, hooksPanel);
	expect(await getHooks(devtools)).to.deep.equal([["useEffect", "ƒ ()"]]);
}