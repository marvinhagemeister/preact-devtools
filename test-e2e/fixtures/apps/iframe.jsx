import { Fragment, h, render } from "preact";

function View() {
	return (
		<Fragment>
			<div style="padding: 4rem 4rem 1rem 4rem">
				<iframe width="300" height="100" src="/iframe.html" />
			</div>
			<div style="padding: 1rem 4rem 4rem 4rem">
				<iframe style="width: 100%; height: 5rem;" src="/iframe2.html" />
			</div>
		</Fragment>
	);
}

render(<View />, document.getElementById("app"));
