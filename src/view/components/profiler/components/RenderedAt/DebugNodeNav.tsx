import { h } from "preact";
import { useStore, useObserver } from "../../../../store/react-bindings";
import { SidebarPanel, Empty } from "../../../sidebar/SidebarPanel";
import s from "./RenderedAt.module.css";
import { ProfilerNodeShared } from "../../data/profiler2";

export function DebugNodeNav() {
	const store = useStore();
	const selected = useObserver(() => store.profiler.derivedSelectedNodeId.$);
	const commit = useObserver(() => store.profiler.activeCommit.$);
	const nodes = useObserver(() => {
		const commit = store.profiler.activeCommit.$;
		const shared = store.profiler.nodes.$;
		if (!commit) return [];

		const out: ProfilerNodeShared[] = [];
		const stack = [commit.firstId];
		let item;
		while ((item = stack.pop())) {
			const node = commit.nodes.get(item);
			const meta = shared.get(item);
			if (!node || !meta) continue;

			out.push(meta);
			for (let i = node.children.length - 1; i >= 0; i--) {
				stack.push(node.children[i]);
			}
		}

		return out;
	});
	const isRecording = useObserver(() => store.profiler.isRecording.$);

	if (isRecording) {
		return null;
	}

	return (
		<SidebarPanel title="Debug Node Navigation:" testId="profiler-debug-nav">
			{nodes.length === 0 ? (
				<Empty>No nodes found inside commmit</Empty>
			) : (
				<nav data-testid="debug-nav">
					{nodes.map(node => {
						return (
							<button
								key={node.id}
								class={s.item}
								data-active={selected === node.id}
								onClick={() => (store.profiler.selectedNodeId.$ = node.id)}
							>
								<span style="display: flex; justify-content: space-between; width: 100%">
									<span>
										{node.name}
										{commit && node.id === commit.firstId ? <b> (R)</b> : null}
									</span>
									<span>{node.id}</span>
								</span>
							</button>
						);
					})}
				</nav>
			)}
		</SidebarPanel>
	);
}
