import { createStore, Store } from "../../view/store";
import { render, h, Options } from "preact";
import { DevTools } from "../../view/components/Devtools";
import { setupOptions, createAdapter } from "../../adapter/adapter";
import { Renderer } from "../../adapter/renderer";
import { DevtoolsHook } from "../../adapter/hook";
import { applyEvent } from "../../adapter/events";

export function attach(
	options: Options,
	rendererFn: (hook: DevtoolsHook) => Renderer,
) {
	const store = createStore();
	const fakeHook: DevtoolsHook = {
		attach: () => 1,
		connected: true,
		detach: () => null,
		emit: (name, data) => {
			applyEvent(store, name, data);
		},
		renderers: new Map(),
	};

	const renderer = rendererFn(fakeHook);
	const destroy = setupOptions(options as any, renderer);

	createAdapter(fakeHook, renderer);

	return {
		store,
		destroy,
	};
}

export type Container = Element | Document | ShadowRoot | DocumentFragment;
export function renderDevtools(store: Store, container: Container) {
	render(h(DevTools, { store }), container);
}
