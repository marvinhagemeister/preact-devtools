import { Fragment, h } from "preact";
import { ChangeFn, ElementProps } from "./ElementProps.tsx";
import { Empty, SidebarPanel } from "../SidebarPanel.tsx";
import { NewProp } from "./NewProp.tsx";
import { Signal } from "@preact/signals";
import { PropData } from "./parseProps.ts";
import { useStore } from "../../../store/react-bindings.ts";
import { Message } from "../../Message/Message.tsx";

export interface Props {
	label: string;
	isOptional?: boolean;
	uncollapsed: Signal<string[]>;
	items: Signal<PropData[]>;
	canAddNew?: boolean;
	onChange: ChangeFn;
	onCopy?: () => void;
}

export function PropsPanel(props: Props) {
	const { label, onCopy, onChange, canAddNew } = props;
	const uncollapsed = props.uncollapsed.value;
	const items = props.items.value;
	const store = useStore();
	const isSupported = store.supports.hooks.value;

	return (
		<SidebarPanel title={label} onCopy={onCopy} testId={label}>
			{items.length
				? (
					<Fragment>
						<ElementProps
							uncollapsed={uncollapsed}
							items={items}
							onChange={onChange}
							onCollapse={(id) => {
								const idx = props.uncollapsed.value.indexOf(id);
								const v = props.uncollapsed.value;
								idx > -1 ? v.splice(idx, 1) : v.push(id);
								props.uncollapsed.value = v.slice();
							}}
						/>
						{canAddNew && (
							<NewProp onChange={(v, path) => onChange(v, path, null)} />
						)}
					</Fragment>
				)
				: !isSupported && label === "Hooks"
				? (
					<Message type="warning" testId="no-hooks-support-warning">
						Please upgrade to Preact &gt;=10.4.1 to enable hooks inspection.
					</Message>
				)
				: <Empty>None</Empty>}
		</SidebarPanel>
	);
}
