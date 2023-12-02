import TurndownService from "turndown";
import { normalizeURL } from "ufo";

export function parseHTMLtoMarkdown(input: string) {
	const td = new TurndownService();
	td.addRule("remove redirect", {
		filter: "a",
		replacement: (content, node) => {
			const href = (node as HTMLAnchorElement).getAttribute("href");

			if (!href) return content;

			// replace '/jump.php?:url' with encoded url, decode then normalize its query
			return normalizeURL(decodeURIComponent(href.replace("/jump.php?", "")));
		},
	});

	return td.turndown(input);
}
