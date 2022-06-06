import { h } from "preact";
import { useObserver, useStore } from "../../store/react-bindings";
import { DevNode } from "../../store/types";
import { SidebarPanel } from "../sidebar/SidebarPanel";
import s from "../profiler/components/RenderedAt/RenderedAt.module.css";

export function OwnerInfo() {
	const store = useStore();

	const selectedId = useObserver(() => store.selection.selected.$);
	const data = useObserver(() => {
		const owners: DevNode[] = [];
		const selectedId = store.selection.selected.$;

		const nodes = store.nodes.$;

		let id = selectedId;
		let current: DevNode | undefined;
		while ((current = nodes.get(id)) !== undefined) {
			if (!nodes.has(current.owner)) {
				break;
			}
			owners.push(nodes.get(current.owner)!);
			id = current.owner;
		}

		return owners;
	});

	if (selectedId === -1) {
		return null;
	}

	return (
		<SidebarPanel title="Rendered by">
			<nav data-testid="owners">
				{data.length === 0 && <p>-</p>}
				{data.map(node => {
					return (
						<button
							key={node.id}
							class={s.item}
							data-active={selectedId === node.id}
							onClick={() => {
								store.selection.selectById(node.id);
							}}
						>
							{node.name}
						</button>
					);
				})}
			</nav>
		</SidebarPanel>
	);
}