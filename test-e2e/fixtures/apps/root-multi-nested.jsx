import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";

function Display(props) {
	return <div data-testid="result">Counter: {props.value}</div>;
}

function Child(props) {
	return <h3>Child {props.id}</h3>;
}

function linkRoots(parent, child) {
	// v10 linking
	parent.__linked_children = [child];
	child.__linked_parent = parent;
}

function Counter({ id }) {
	const [v, set] = useState(0);

	const ChildRoot1 = () => <div id="child-1" dangerouslySetInnerHTML="" />;
	const ChildRoot2 = () => <div id="child-2" dangerouslySetInnerHTML="" />;

	const childRoot1Vnode = <ChildRoot1 />;
	const childRoot2Vnode = <ChildRoot2 />;

	useEffect(() => {
		const child1 = <Child id="1" />;
		const child2 = <Child id="2" />;

		linkRoots(childRoot1Vnode, child1);
		linkRoots(childRoot2Vnode, child2);

		render(child1, document.getElementById("child-1"));
		render(child2, document.getElementById("child-2"));
	}, []);

	return (
		<div style="padding: 2rem;">
			<h3>{id}</h3>
			<Display value={v} />
			<button onClick={() => set(v + 1)}>Increment</button>

			{childRoot1Vnode}
			{childRoot2Vnode}
		</div>
	);
}
const app1 = <Counter id="Root" />;

render(app1, document.getElementById("app"));
