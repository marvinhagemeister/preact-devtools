import { flushTable, StringTable } from "./string-table";
import { Store } from "../../view/store/types";
import { recordProfilerCommit } from "../../view/components/profiler/data/commits";
import { ops2Tree } from "./operations";
import { applyOperationsV1 } from "./legacy/operationsV1";
import { Stats, stats2ops } from "../shared/stats";

export enum MsgTypes {
	ADD_ROOT = 1,
	ADD_VNODE = 2, // Used by Preact 10.1.x
	REMOVE_VNODE = 3,
	UPDATE_VNODE_TIMINGS = 4, // Used by Preact 10.1.x
	REORDER_CHILDREN = 5,
	RENDER_REASON = 6,
	COMMIT_STATS = 7,
	HOC_NODES = 8,
}

// Event Examples:
//
// ADD_ROOT
//   id
//
// ADD_VNODE
//   id
//   type
//   parent
//   owner
//   name
//   key
//
// ADD_VNODE_V2
//   id
//   type
//   parent
//   owner
//   name
//   key
//   startTime
//   duration
//
// REMOVE_VNODE
//   id
//
// UPDATE_VNODE_TIMINGS
//   id
//   duration
//
// UPDATE_VNODE_TIMINGS_V2
//   id
//   startTime
//   duration
//
// REORDER_CHILDREN
//   id
//   childrenCount
//   childId
//   childId
//   ...
//
// RENDER_REASON
//   id
//   type
//   stringsCount
//   ...stringIds
//
// COMMIT_STATS -> Check `stats.ts`
//
// HOC_NODES
//  vnodeId
//  stringsCounts
//  ...stringIds
//
export interface Commit {
	rootId: number;
	strings: StringTable;
	unmountIds: number[];
	operations: number[];
	stats: Stats | null;
}

/**
 * Collect all relevant data from a commit and convert it to a message
 * the detools can understand
 */
export function flush(commit: Commit) {
	const { rootId, unmountIds, operations, strings, stats } = commit;
	if (unmountIds.length === 0 && operations.length === 0) return;

	const msg = [rootId, ...flushTable(strings)];
	if (unmountIds.length > 0) {
		msg.push(MsgTypes.REMOVE_VNODE, unmountIds.length, ...unmountIds);
	}
	msg.push(...operations);
	if (stats !== null) {
		msg.push(...stats2ops(rootId, stats));
	}

	return { type: "operation_v2", data: msg };
}

/**
 * This is the heart of the devtools. Here we translate incoming events
 * and construct the tree data structure which all operations in the
 * Devtools UI are based upon.
 *
 * We currently expect all operations to be in order.
 */
export function applyOperationsV2(store: Store, data: number[]) {
	const { rootId, roots, tree, reasons, stats, rendered } = ops2Tree(
		store.nodes.$,
		store.roots.$,
		data,
	);

	// Update store data
	store.roots.$ = roots;
	store.nodes.$ = tree;

	if (store.inspectData.$) {
		const id = store.inspectData.$.id;
		if (tree.has(id)) {
			store.notify("inspect", id);
		}
	}

	// If we are profiling, we'll make a frozen copy of the mutable
	// elements tree because the profiler can step through time
	if (store.profiler.isRecording.$) {
		recordProfilerCommit(store.nodes.$, store.profiler, rendered, rootId);
		store.profiler.renderReasons.update(m => {
			m.set(rootId, reasons);
		});
	}

	if (stats !== null) {
		if (store.stats.data.$ === null) {
			store.stats.data.$ = stats;
		} else {
			store.stats.data.update(v => {
				for (const key in stats) {
					const next = (stats as any)[key];

					if (key === "singleChildType") {
						const old = (v as any)[key];
						old.roots += next.roots;
						old.classComponents += next.classComponents;
						old.functionComponents += next.functionComponents;
						old.fragments += next.fragments;
						old.forwardRef += next.forwardRef;
						old.memo += next.memo;
						old.suspense += next.suspense;
						old.elements += next.elements;
						old.text += next.text;
					} else {
						if (typeof next === "object") {
							const old = (v as any)[key];
							next.children.forEach((nextValue: any, nextKey: any) => {
								const oldChildren = old.children.get(nextKey) || 0;
								old.children.set(nextKey, oldChildren + nextValue);
							});
							old.total += next.total;
						} else {
							(v as any)[key] += (stats as any)[key];
						}
					}
				}

				return v;
			});
		}
	}
}

export function applyEvent(store: Store, type: string, data: any) {
	switch (type) {
		case "attach":
			if (!store.profiler.isSupported.$) {
				store.profiler.isSupported.$ = !!data.supportsProfiling;
			}
			if (!store.profiler.supportsRenderReasons.$) {
				store.profiler.supportsRenderReasons.$ = !!data.supportsRenderReasons;
			}

			if (!store.supports.hooks.$) {
				store.supports.hooks.$ = !!data.supportsHooks;
			}

			if (store.profiler.highlightUpdates.$) {
				store.emit("start-highlight-updates", null);
			}
			break;
		case "operation":
			applyOperationsV1(store, data);
			break;
		case "operation_v2":
			applyOperationsV2(store, data);
			break;
		case "inspect-result": {
			const { props, state, context } = store.sidebar;
			store.inspectData.$ = data;

			if (store.selection.selected.$ !== data.id) {
				store.selection.selectById(data.id);

				// Reset collapsible state
				props.uncollapsed.$ = [];
				state.uncollapsed.$ = [];
				context.uncollapsed.$ = [];
			}
			break;
		}
		case "select-node":
			store.selection.selectById(data);
			break;
		case "stop-picker":
			store.isPicking.$ = false;
			break;
	}
}
