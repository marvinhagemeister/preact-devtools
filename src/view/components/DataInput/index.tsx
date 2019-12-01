import { h } from "preact";
import s from "./DataInput.css";
import { useCallback, useRef, useMemo, useEffect } from "preact/hooks";
import { Undo } from "../icons";
import { createInputStore } from "./inputState";
import { valoo } from "../../valoo";
import { useObserver } from "../../store/react-bindings";

export interface InputProps {
	name: string;
	value: any;
	class?: string;
	onChange: (value: any) => void;
}

export function DataInput({ value, onChange, name, ...props }: InputProps) {
	const value$ = useRef(valoo(value)).current;
	const store = useRef(createInputStore(value$)).current;

	useEffect(() => {
		store.onReset();
	}, [name]);

	useEffect(() => {
		if (value$.$ !== value) {
			value$.$ = value;
		}
		const dispose = value$.on(v => onChange(v));
		return () => dispose();
	}, [value, onChange]);

	const valid = useObserver(() => store.valid.$);
	const type = useObserver(() => store.valueType.$);
	const inputVal = useObserver(() => store.actualValue.$);
	const focus = useObserver(() => store.focus.$);
	const showReset = useObserver(() => store.showReset.$);
	const ref = useRef<HTMLInputElement>();

	useMemo(() => {
		if (ref.current) {
			ref.current.setCustomValidity(valid ? "" : "Invalid input");
		}
	}, [ref.current, valid]);

	const onKeyUp = useCallback((e: KeyboardEvent) => {
		if (e.key === "Enter") {
			store.onConfirm();
		} else if (e.key === "ArrowUp") {
			store.onIncrement();
		} else if (e.key === "ArrowDown") {
			store.onDecrement();
		}
	}, []);

	const onInput = useCallback((e: Event) => {
		store.onInput((e.target as any).value);
	}, []);

	return (
		<div class={s.valueWrapper}>
			{store.asCheckbox.$ && !focus && (
				<input
					class={s.check}
					type="checkbox"
					checked={store.actualValue.$ === "true"}
					onInput={e => {
						const value = "" + (e.target as any).checked;
						value$.$ = value;
						onChange(value$.$);
					}}
				/>
			)}
			<div class={`${s.innerWrapper} ${store.asCheckbox.$ ? s.withCheck : ""}`}>
				<input
					type="text"
					ref={ref}
					class={`${s.valueInput} ${props.class || ""} ${focus ? s.focus : ""}`}
					value={inputVal}
					onFocus={store.onFocus}
					onBlur={store.onBlur}
					onKeyUp={onKeyUp}
					onInput={onInput}
					data-type={type}
				/>
				<button
					class={`${s.undoBtn} ${showReset ? s.showUndoBtn : ""}`}
					type="button"
					onClick={store.onReset}
				>
					<Undo size="s" />
				</button>
			</div>
		</div>
	);
}
