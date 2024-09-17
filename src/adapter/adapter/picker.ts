import { Renderer } from "../renderer.ts";
import { debounce } from "../../shells/shared/utils.ts";

export function createPicker(
	window: Window,
	renderers: Map<number, Renderer>,
	onHover: (id: number) => void,
	onStop: () => void,
) {
	let picking = false;
	let lastId = -1;
	let lastTarget: any = null;

	function clicker(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		stop();
	}

	function listener(e: WindowEventMap["mouseover"]) {
		e.preventDefault();
		e.stopPropagation();
		if (picking && e.target != null && lastTarget !== e.target) {
			let id = lastId;
			for (const r of renderers.values()) {
				id = r.findVNodeIdForDom(e.target as any);
				if (id > -1 && lastId !== id) {
					onHover(id);
					break;
				}
			}

			lastTarget = e.target;
			lastId = id;
		}
	}

	function onMouseEvent(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	const onScroll = debounce(() => {
		onHover(-1);
		lastId = -1;
		lastTarget = null;
	}, 16);

	function start() {
		if (!picking) {
			lastId = -1;
			picking = true;
			window.addEventListener("mousedown", onMouseEvent, true);
			window.addEventListener("mousemove", listener, true);
			window.addEventListener("mouseup", onMouseEvent, true);
			window.addEventListener("click", clicker, true);
			document.addEventListener("scroll", onScroll, true);
		}
	}

	function stop() {
		if (picking) {
			lastId = -1;
			picking = false;
			onStop();

			window.removeEventListener("mousedown", onMouseEvent, true);
			window.removeEventListener("mousemove", listener, true);
			window.removeEventListener("mouseup", onMouseEvent, true);
			window.removeEventListener("click", clicker, true);
			document.removeEventListener("scroll", onScroll);
		}
	}

	return { start, stop };
}
