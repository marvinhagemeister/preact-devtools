import path from "node:path";
import fs from "node:fs";

/**
 * Get a sorted list of all available preact versions
 */
export function getPreactVersions() {
	const dir = path.join(__dirname, "vendor", "preact");
	const versions = fs
		.readdirSync(dir)
		.filter((name) => !name.startsWith("."))
		.map((name) => {
			if (name.endsWith(".tgz")) {
				name = name.slice(0, -".tgz".length);
			}

			if (name.startsWith("preact-")) {
				name = name.slice("preact-".length);
			}

			return name;
		})
		.sort((a, b) => {
			const semA = a.split(".").map((n) => +n);
			const semB = b.split(".").map((n) => +n);

			// If one is non-semver
			if (semA.length === 1 && semB.length > 1) {
				return -1;
			} else if (semA.length > 1 && semB.length === 1) {
				return 1;
			} else if (semA.length === 1 && semB.length === 1) {
				return a.localeCompare(b);
			}

			if (semA[0] < semB[0]) {
				return 1;
			} else if (semB[0] < semA[0]) {
				return -1;
			} else if (semA[1] < semB[1]) {
				return 1;
			} else if (semB[1] < semA[1]) {
				return -1;
			} else if (semA[2] < semB[2]) {
				return 1;
			} else if (semB[2] < semA[2]) {
				return -1;
			}

			// Check if is tagged release: 11.0.0-experimental.0
			return a.localeCompare(b) * -1;
		});

	return ["git", ...versions];
}
