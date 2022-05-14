import { ID, Tree } from "../../view/store/types";
import { parseTable } from "./string-table";
import { MsgTypes } from "./events";
import { RenderReasonMap } from "../shared/renderReasons";
import { ParsedStats, parseStats } from "../shared/stats";
import { deepClone } from "../shared/utils";

/**
 * This is the heart of the devtools. Here we translate incoming events
 * and construct the tree data structure which all operations in the
 * Devtools UI are based upon.
 *
 * We currently expect all operations to be in order.
 */
export function ops2Tree(
	oldTree: Tree,
	selfDurations: Map<ID, number>,
	existingRoots: Map<ID, ID>,
	existingNodeToRoot: Map<ID, ID>,
	ops: number[],
) {
	const pending: Tree = new Map(oldTree);
	const rootId = ops[0];
	const roots: Map<ID, ID> = new Map(existingRoots);
	const nodeToRoots: Map<ID, ID> = new Map(existingNodeToRoot);
	const removals: ID[] = [];
	const reasons: RenderReasonMap = new Map();
	let stats: ParsedStats | null = null;
	const rendered: ID[] = [];

	let i = ops[1] + 1;
	const strings = parseTable(ops.slice(1, i + 1));

	for (i += 1; i < ops.length; i++) {
		switch (ops[i]) {
			case MsgTypes.ADD_ROOT: {
				const rootId = ops[i + 1];
				const mapped = ops[i + 2];
				roots.set(rootId, mapped);
				nodeToRoots.set(mapped, rootId);
				i += 2;
				break;
			}
			case MsgTypes.ADD_VNODE: {
				const id = ops[i + 1];
				const parentId = ops[i + 3];
				const parent = pending.get(parentId);
				if (parent) {
					const clone = deepClone(parent);
					pending.set(parent.id, clone);
					clone.children.push(id);
				}

				pending.set(id, {
					children: [],
					depth: parent ? parent.depth + 1 : 0,
					id,
					hocs: null,
					name: strings[ops[i + 5] - 1],
					parent: parentId,
					type: ops[i + 2],
					key: ops[i + 6] > 0 ? strings[ops[i + 6] - 1] : "",
				});

				selfDurations.set(id, ops[i + 7] / 1000);
				rendered.push(id);

				i += 7;
				break;
			}
			case MsgTypes.UPDATE_VNODE_TIMINGS: {
				const id = ops[i + 1];

				selfDurations.set(id, ops[i + 2] / 1000);
				rendered.push(id);

				i += 2;
				break;
			}
			case MsgTypes.REMOVE_VNODE: {
				const unmounts = ops[i + 1];
				i += 2;
				const len = i + unmounts;
				for (; i < len; i++) {
					const nodeId = ops[i];
					removals.push(nodeId);
					const node = pending.get(nodeId);
					if (node) {
						// Remove node from parent children array
						const parent = pending.get(node.parent);
						if (parent) {
							const idx = parent.children.indexOf(nodeId);
							if (idx > -1) {
								const clone = deepClone(parent);
								pending.set(parent.id, clone);
								clone.children.splice(idx, 1);
							}
						}

						// Check if node was a root
						if (nodeToRoots.has(node.id)) {
							roots.delete(node.id);
							nodeToRoots.delete(node.id);
						}

						// Delete children recursively
						const stack = [node.id];
						let item;
						while ((item = stack.pop())) {
							const child = pending.get(item);
							if (!child) continue;

							pending.delete(child.id);
							selfDurations.delete(child.id);
							stack.push(...child.children);
						}

						pending.delete(nodeId);
						selfDurations.delete(nodeId);
					}
				}

				// Subtract one because of outer loop
				if (len > 0) i--;
				break;
			}
			case MsgTypes.REORDER_CHILDREN: {
				const parentId = ops[i + 1];
				const count = ops[i + 2];
				const parent = deepClone(pending.get(parentId)!);
				parent.children = ops.slice(i + 3, i + 3 + count);
				pending.set(parentId, parent);
				i = i + 2 + count;
				break;
			}
			case MsgTypes.RENDER_REASON: {
				const id = ops[i + 1];
				const type = ops[i + 2];
				const count = ops[i + 3];
				let items: string[] | null = null;
				if (count > 0) {
					items = ops.slice(i + 4, i + 4 + count).map(x => strings[x - 1]);
				}
				reasons.set(id, {
					type,
					items,
				});
				i = i + 3 + count;
				break;
			}
			case MsgTypes.COMMIT_STATS: {
				const count = ops[i + 1];
				const statsOps = ops.slice(i + 1, i + 1 + count);
				stats = parseStats(statsOps);
				i = i + 1 + count;
				break;
			}
			case MsgTypes.HOC_NODES: {
				const vnodeId = ops[i + 1];
				const vnode = pending.get(vnodeId);
				const count = ops[i + 2];
				if (vnode) {
					const hocs = [];
					for (let j = 0; j < count; j++) {
						hocs.push(strings[ops[i + 3 + j] - 1]);
					}
					vnode.hocs = hocs;
				}
				i = i + 2 + count;
				break;
			}
			default:
				throw new Error("Unknown event: " + ops[i]);
		}
	}

	return {
		rootId,
		roots,
		nodeToRoots,
		tree: pending,
		removals,
		reasons,
		stats,
		rendered,
	};
}
