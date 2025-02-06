import {
	type Node as ParserNode,
	Text as TextNode,
	isTag,
	isText,
} from "domhandler";
import Blockquote from "../components/question/Blockquote.vue";
import Emphasis from "../components/question/Emphasis.vue";
import Image from "../components/question/Image.vue";
import Link from "../components/question/Link.vue";
import ListItem from "../components/question/ListItem.vue";
import OrderedList from "../components/question/OrderedList.vue";
import Paragraph from "../components/question/Paragraph.vue";
import Strong from "../components/question/Strong.vue";
import Text from "../components/question/Text.vue";

export const resolveQuestionComponent = (node: ParserNode) => {
	switch (true) {
		case isTag(node) && node.name === "img":
			return Image;
		case isTag(node) && node.name === "p":
			return Paragraph;
		case isTag(node) && node.name === "a":
			return Link;
		case isTag(node) && node.name === "strong":
			return Strong;
		case isTag(node) && node.name === "em":
			return Emphasis;
		case isTag(node) && node.name === "br":
			return "br";
		case isTag(node) && node.name === "blockquote":
			return Blockquote;
		case isTag(node) && node.name === "ol":
			return OrderedList;
		case isTag(node) && node.name === "li":
			return ListItem;
		case node instanceof TextNode:
			return Text;
	}
};

export const resolveQuestionComponentProps = (node: ParserNode) => {
	if (isTag(node) && node.name === "img") {
		return { src: node.attribs.src, height: 250, preview: true };
	}
	if (
		isTag(node) &&
		["em", "p", "strong", "blockquote", "ol", "li"].includes(node.name)
	) {
		return { children: node.children };
	}
	if (isTag(node) && node.name === "a") {
		return { href: node.attribs.href, children: node.children };
	}
	if (isText(node)) {
		return { text: node.data };
	}
	return {};
};
