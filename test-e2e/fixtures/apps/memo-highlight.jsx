import { h, render } from "preact";
import { useState } from "preact/hooks";
import { memo } from "preact/compat";

export const Result = ({ result }) => {
	return (
		<div class="result">
			<Nested text={result} />
		</div>
	);
};

const Nested = ({ text }) => {
	return <p>{text}</p>;
};

const MemoResult = memo(Result, () => true);

const rand = () => Math.random() * 10;
const generateFakeData = () => {
	return [rand(), rand(), rand()];
};

const App = () => {
	const [results, setResults] = useState(generateFakeData());

	return (
		<div>
			<h1>Example</h1>
			<button onClick={() => setResults(generateFakeData())}>Refresh</button>
			<div class="list">
				<h2>No memo</h2>
				{results.map((result, i) => <Result key={i} result={result} />)}
			</div>
			<div class="list">
				<h2>Memo</h2>
				{results.map((result, i) => <MemoResult key={i} result={result} />)}
			</div>
		</div>
	);
};

render(<App />, document.getElementById("app"));
