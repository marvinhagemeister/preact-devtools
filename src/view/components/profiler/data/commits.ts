import { ID, DevNode } from "../../../store/types";
import { Observable, valoo, watch } from "../../../valoo";
import {
	RenderReasonMap,
	RenderReasonData,
} from "../../../../adapter/shared/renderReasons";
import { FlameNodeTransform } from "../flamegraph/modes/flamegraph-utils";
import { FlameTree, patchTree } from "../flamegraph/modes/patchTree";
import { NodeTransform } from "../flamegraph/shared";
import { toTransform } from "../flamegraph/ranked/ranked-utils";

export interface CommitData {
	/** Id of the tree's root node */
	rootId: ID;
	rendered: ID[];
	maxSelfDuration: number;
	duration: number;
	nodes: Map<ID, DevNode>;
	selfDurations: Map<ID, number>;
}

/**
 * The Flamegraph supports these distinct
 * view modes.
 */
export enum FlamegraphType {
	FLAMEGRAPH = "FLAMEGRAPH",
	RANKED = "RANKED",
}

export interface ProfilerState {
	/**
	 * Flag to indicate if profiling is supported by the attached renderer.
	 */
	isSupported: Observable<boolean>;

	// Render reasons
	supportsRenderReasons: Observable<boolean>;
	captureRenderReasons: Observable<boolean>;
	setRenderReasonCapture: (v: boolean) => void;

	// Highlight updates
	highlightUpdates: Observable<boolean>;

	/**
	 * Flag that indicates if we are currently
	 * recording commits to be displayed in the
	 * profiler.
	 */
	isRecording: Observable<boolean>;
	commits: Observable<CommitData[]>;

	// Selection
	activeCommitIdx: Observable<number>;
	activeCommit: Observable<CommitData | null>;
	selectedNodeId: Observable<ID>;
	selectedNode: Observable<DevNode | null>;

	// Render reasons
	renderReasons: Observable<Map<ID, RenderReasonMap>>;
	activeReason: Observable<RenderReasonData | null>;

	// View state
	flamegraphType: Observable<FlamegraphType>;

	// Flamegraph mode
	flamegraphNodes: Observable<Map<ID, FlameNodeTransform>>;
	rankedNodes: Observable<NodeTransform[]>;
}

/**
 * Create a new profiler instance. It intentiall doesn't have
 * any methods, to not go down the OOP rabbit hole.
 */
export function createProfiler(): ProfilerState {
	const commits = valoo<CommitData[]>([]);
	const isSupported = valoo(false);

	// Render Reasons
	const supportsRenderReasons = valoo(false);
	const renderReasons = valoo<Map<ID, RenderReasonMap>>(new Map());
	const captureRenderReasons = valoo(false);
	const setRenderReasonCapture = (v: boolean) => {
		captureRenderReasons.$ = v;
	};

	// Highlight updates
	const showUpdates = valoo(false);

	// Selection
	const activeCommitIdx = valoo(0);
	const selectedNodeId = valoo(0);
	const activeCommit = watch(() => {
		return (commits.$.length > 0 && commits.$[activeCommitIdx.$]) || null;
	});
	const selectedNode = watch(() => {
		return activeCommit.$ != null
			? activeCommit.$.nodes.get(selectedNodeId.$) || null
			: null;
	});

	// Flamegraph
	const flamegraphType = valoo(FlamegraphType.FLAMEGRAPH);
	flamegraphType.on(type => {
		selectedNodeId.$ =
			type === FlamegraphType.FLAMEGRAPH && activeCommit.$
				? activeCommit.$.rootId
				: -1;
	});

	// Recording
	const isRecording = valoo(false);
	isRecording.on(v => {
		// Clear current selection and profiling data when
		// a new recording starts.
		if (v) {
			commits.$ = [];
			activeCommitIdx.$ = 0;
			selectedNodeId.$ = 0;
		} else {
			// Reset selection when recording stopped
			// and new profiling data was collected.
			if (commits.$.length > 0) {
				selectedNodeId.$ =
					flamegraphType.$ === FlamegraphType.FLAMEGRAPH
						? commits.$[0].rootId
						: commits.$[0].rendered[0];
			}
		}
	});

	// Render reasons
	const activeReason = watch(() => {
		if (activeCommit.$ !== null) {
			const commitId = activeCommit.$.rendered[0];
			const reason = renderReasons.$.get(commitId);
			if (reason) {
				return reason.get(selectedNodeId.$) || null;
			}
		}

		return null;
	});

	// FlamegraphNode
	const flamegraphNodes = watch<FlameTree>(() => {
		const commit = activeCommit.$;
		if (!commit || flamegraphType.$ !== FlamegraphType.FLAMEGRAPH) {
			return new Map();
		}

		let prevCommit = null;
		for (let i = activeCommitIdx.$ - 1; i >= 0; i--) {
			if (i >= commits.$.length) {
				return new Map();
			}

			const search = commits.$[i];
			if (search.rootId === commit.rootId) {
				prevCommit = search;
				break;
			}
		}

		return patchTree(prevCommit, commit);
	});

	const rankedNodes = watch<NodeTransform[]>(() => {
		const commit = activeCommit.$;
		if (!commit || flamegraphType.$ !== FlamegraphType.RANKED) {
			return [];
		}

		return toTransform(commit);
	});

	return {
		supportsRenderReasons,
		captureRenderReasons,
		setRenderReasonCapture,
		highlightUpdates: showUpdates,
		isSupported,
		isRecording,
		commits,
		activeCommitIdx,
		activeCommit,
		renderReasons,
		activeReason,
		selectedNodeId,
		selectedNode,

		// Rendering
		flamegraphType,
		flamegraphNodes,
		rankedNodes,
	};
}

export function stopProfiling(state: ProfilerState) {
	state.isRecording.$ = false;
	state.activeCommitIdx.$ = 0;
	state.selectedNodeId.$ = -1;
}

export function resetProfiler(state: ProfilerState) {
	stopProfiling(state);
	state.commits.$ = [];
}

export function recordProfilerCommit(
	tree: Map<ID, DevNode>,
	profiler: ProfilerState,
	rendered: ID[],
	rootId: ID,
) {
	const root = tree.get(rootId)!;

	const nodes = new Map<ID, DevNode>();

	// The time of the node that took the longest to render
	let maxSelfDuration = 0;
	const selfDurations = new Map<ID, number>();

	let totalCommitDuration = 0;
	let start = 0;
	if (root.children.length > 0) {
		const firstChild = tree.get(root.children[0]);
		if (firstChild) {
			start = firstChild.startTime;
		}
	}

	let stack = [rootId];
	let item;
	while ((item = stack.pop())) {
		const node = tree.get(item);
		if (!node) continue;
		nodes.set(node.id, node);

		if (node.startTime >= start) {
			const next = node.endTime - start;
			if (next >= totalCommitDuration) {
				totalCommitDuration = next;
			}
		}

		let selfDuration = node.endTime - node.startTime;

		for (let i = 0; i < node.children.length; i++) {
			const childId = node.children[i];
			const child = tree.get(childId)!;

			if (child.startTime > node.startTime) {
				selfDuration -= child.endTime - child.startTime;
			}

			stack.push(childId);
		}

		if (selfDuration > maxSelfDuration) {
			maxSelfDuration = selfDuration;
		}

		selfDurations.set(node.id, selfDuration);
	}

	// Traverse nodes not part of the current commit
	stack = [rootId];
	while ((item = stack.pop())) {
		if (item === rootId) continue;

		const node = tree.get(item);
		if (!node) continue;
		nodes.set(node.id, node);

		stack.push(...node.children);
	}

	profiler.commits.update(arr => {
		arr.push({
			rootId,
			rendered,
			nodes,
			maxSelfDuration,
			duration: totalCommitDuration,
			selfDurations,
		});
	});
}
