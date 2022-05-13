import { ID } from "../../../store/types";
import { CommitData } from "./commits";

export interface ProfilerNodeShared {
	id: ID;
	name: string;
	hocs: string[] | null;
}

export type ProfilerNode = {
	id: ID;
	parent: ID;
	children: ID[];
	start: number;
	width: number;
	selfDuration: number;
};

export interface ProfilerCommit {
	start: number;
	timings: Map<ID, ProfilerNode>;
}

export interface ProfilerSession {
	nodes: Map<ID, ProfilerNodeShared>;
	commits: ProfilerCommit[];
}

export function patchTree2(
	session: ProfilerSession,
	commitData: CommitData,
): ProfilerCommit {
	// Prepare initial tree

	const { nodes: tree, commitRootId, rootId } = commitData;

	const initial = session.commits.length === 0;

	const timings = new Map<ID, ProfilerNode>();
	const commit = {
		timings,
		start: 0,
	};
	session.commits.push(commit);

	// Built up tree from scratch if this is the first commit
	const startRootId = initial ? rootId : commitRootId;
	console.log("ROOT", rootId, commitRootId, startRootId, tree, session);
	const stack = [startRootId];

	let id: ID | undefined;
	while ((id = stack.pop()) !== undefined) {
		const node = tree.get(id);
		if (!node) continue;

		// Convert meta data to shared structure if not present
		if (!session.nodes.has(node.id)) {
			session.nodes.set(node.id, {
				hocs: node.hocs,
				id: node.id,
				name: node.name,
			});
		}

		const width = node.endTime - node.startTime;

		// Get end of previous sibling or parent start
		let start = 0;
		if (node.parent !== -1) {
			const parent = timings.get(node.parent);
			if (!parent) continue; // Should never happen

			const idx = parent.children.indexOf(node.id);
			if (idx === -1) continue; // Should never happen

			// No previous sibling, pick parent start
			if (idx === 0) {
				start = parent.start;
			} else {
				const sibling = timings.get(parent.children[idx]);
				if (!sibling) continue; // Should never happen

				start = sibling.start + sibling.width;
			}

			// Increase parents if too small
			const diff = parent.start + parent.width - (start + width);
			if (diff < 0) {
				let p = parent.id;
				while (p !== -1) {
					parent.width += diff;
					const node = timings.get(p);
					if (!node) break; // Should never happen
					p = node.parent;
				}
			}
		}

		let selfDuration = width;
		for (let i = 0; i < node.children.length; i++) {
			const child = timings.get(node.children[i]);
			if (!child) continue;
			selfDuration -= child.width;
		}

		console.log(
			`   --> <%c${node.name}%c /> %c${start}ms ${width}ms`,
			"color: violet",
			"color: initial",
			"color: peachpuff",
		);
		timings.set(node.id, {
			id: node.id,
			width,
			selfDuration,
			parent: node.parent,
			children: node.children.slice(),
			name: node.name,
			start,
		});

		stack.push(...node.children);
	}

	return commit;
}