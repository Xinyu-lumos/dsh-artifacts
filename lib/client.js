window.__ModuleLoader__.load({ id: "dsh-artifacts", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
let __deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region src/shared/diagram.ts
const DIAGRAM_TYPE_VALUES = [
	"workflow",
	"architecture",
	"nested-loop"
];
const DIRECTION_VALUES = ["TB", "LR"];
const TONE_VALUES = [
	"neutral",
	"compute",
	"flow",
	"constraint"
];
const THEME_VALUES = [
	"auto",
	"light",
	"dark"
];
const DIAGRAM_LIMITS = {
	maxGroups: 20,
	maxNodes: 40,
	maxEdges: 80,
	maxGroupDepth: 4,
	maxTitleLength: 120,
	maxLabelLength: 120,
	maxDescriptionLength: 240,
	maxIdLength: 64
};
const idDescription = `Must match ^[A-Za-z0-9][A-Za-z0-9._-]*$ and contain at most ${DIAGRAM_LIMITS.maxIdLength} characters.`;
const globallyUniqueIdDescription = `${idDescription} Node and group IDs must be globally unique across the diagram.`;
const labelDescription = `Required label; at most ${DIAGRAM_LIMITS.maxLabelLength} characters.`;
const optionalLabelDescription = `Optional label; at most ${DIAGRAM_LIMITS.maxLabelLength} characters.`;
const descriptionDescription = `Optional description; at most ${DIAGRAM_LIMITS.maxDescriptionLength} characters.`;
const TONE_SCHEMA = {
	type: "string",
	enum: TONE_VALUES,
	description: "Visual semantic tone."
};
const DIAGRAM_GROUP_SCHEMA = {
	type: "object",
	additionalProperties: false,
	description: `Diagram group. IDs are global; nesting has a maximum depth of ${DIAGRAM_LIMITS.maxGroupDepth} and parent cycles are forbidden.`,
	properties: {
		id: {
			type: "string",
			description: globallyUniqueIdDescription,
			required: true
		},
		label: {
			type: "string",
			description: labelDescription,
			required: true
		},
		description: {
			type: "string",
			description: descriptionDescription
		},
		tone: TONE_SCHEMA,
		parentId: {
			type: "string",
			description: `${idDescription} Must reference the id of another group; parent cycles are forbidden and maximum nesting depth is ${DIAGRAM_LIMITS.maxGroupDepth}.`
		}
	}
};
const DIAGRAM_NODE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	description: "Diagram node. Its id must be globally unique across all nodes and groups.",
	properties: {
		id: {
			type: "string",
			description: globallyUniqueIdDescription,
			required: true
		},
		label: {
			type: "string",
			description: labelDescription,
			required: true
		},
		description: {
			type: "string",
			description: descriptionDescription
		},
		tone: TONE_SCHEMA,
		groupId: {
			type: "string",
			description: `${idDescription} Must reference an existing group id.`
		}
	}
};
const DIAGRAM_EDGE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	description: "Directed edge. Endpoints must reference node ids; self edges are forbidden.",
	properties: {
		from: {
			type: "string",
			description: `${idDescription} Must reference an existing node id and differ from to.`,
			required: true
		},
		to: {
			type: "string",
			description: `${idDescription} Must reference an existing node id and differ from from.`,
			required: true
		},
		label: {
			type: "string",
			description: optionalLabelDescription
		}
	}
};
const DIAGRAM_SPEC_SCHEMA = {
	type: "object",
	additionalProperties: false,
	description: `Complete diagram: at most ${DIAGRAM_LIMITS.maxGroups} groups, ${DIAGRAM_LIMITS.maxNodes} nodes, and ${DIAGRAM_LIMITS.maxEdges} edges. Node/group ids are globally unique; all parentId, groupId, and edge endpoint references must resolve. Group depth is at most ${DIAGRAM_LIMITS.maxGroupDepth}; parent cycles and self edges are forbidden.`,
	properties: {
		type: {
			type: "string",
			enum: DIAGRAM_TYPE_VALUES,
			description: "Diagram layout family.",
			required: true
		},
		direction: {
			type: "string",
			enum: DIRECTION_VALUES,
			description: "Primary layout direction.",
			required: true
		},
		groups: {
			type: "array",
			items: DIAGRAM_GROUP_SCHEMA,
			description: `At most ${DIAGRAM_LIMITS.maxGroups} groups; parentId must reference another group, nesting depth is at most ${DIAGRAM_LIMITS.maxGroupDepth}, and parent cycles are forbidden.`,
			required: true
		},
		nodes: {
			type: "array",
			items: DIAGRAM_NODE_SCHEMA,
			description: `At most ${DIAGRAM_LIMITS.maxNodes} nodes; groupId must reference an existing group id.`,
			required: true
		},
		edges: {
			type: "array",
			items: DIAGRAM_EDGE_SCHEMA,
			description: `At most ${DIAGRAM_LIMITS.maxEdges} edges; endpoints are node ids and self edges are forbidden.`,
			required: true
		},
		theme: {
			type: "string",
			enum: THEME_VALUES,
			description: "Optional display theme."
		}
	}
};
const DIAGRAM_ARTIFACT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	description: "Canonical diagram Artifact returned by render_diagram.",
	properties: {
		artifactId: {
			type: "string",
			description: `Stable session-local Artifact id reused for updates. ${idDescription}`,
			required: true
		},
		title: {
			type: "string",
			description: `Concise Artifact title; at most ${DIAGRAM_LIMITS.maxTitleLength} characters.`,
			required: true
		},
		diagram: {
			...DIAGRAM_SPEC_SCHEMA,
			required: true
		}
	}
};

//#endregion
//#region src/shared/validate.ts
var DiagramValidationError = class extends Error {
	violations;
	constructor(violations) {
		super(violations.map(({ path, message }) => `${path}: ${message}`).join("; "));
		this.name = "DiagramValidationError";
		this.violations = Object.freeze(violations.map((violation) => Object.freeze({ ...violation })));
	}
};
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function valueSet(values) {
	return new Set(values);
}
const TYPES = valueSet(DIAGRAM_TYPE_VALUES);
const DIRECTIONS = valueSet(DIRECTION_VALUES);
const TONES = valueSet(TONE_VALUES);
const THEMES = valueSet(THEME_VALUES);
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwn(record, key) {
	return Object.prototype.hasOwnProperty.call(record, key);
}
function checkUnknown(record, known, path, add) {
	const knownSet = new Set(known);
	for (const key of Object.keys(record).filter((key$1) => !knownSet.has(key$1)).sort()) add(`${path}.${key}`, "unknown property");
}
function requiredString(record, key, path, maxLength, add, id = false) {
	const value = hasOwn(record, key) ? record[key] : void 0;
	const fieldPath = `${path}.${key}`;
	if (typeof value !== "string") {
		add(fieldPath, value === void 0 ? "is required" : "must be a string");
		return;
	}
	const normalized = value.trim();
	if (normalized.length === 0) add(fieldPath, "must not be empty");
	if ([...normalized].length > maxLength) add(fieldPath, `must be at most ${maxLength} characters`);
	if (id && normalized.length > 0 && !ID_PATTERN.test(normalized)) add(fieldPath, "must start with an alphanumeric character and contain only A-Za-z0-9._-");
	return normalized;
}
function optionalString(record, key, path, maxLength, add, id = false) {
	if (!hasOwn(record, key)) return void 0;
	const value = record[key];
	const fieldPath = `${path}.${key}`;
	if (typeof value !== "string") {
		add(fieldPath, "must be a string");
		return;
	}
	const normalized = value.trim();
	if (normalized.length === 0) add(fieldPath, "must not be empty");
	if ([...normalized].length > maxLength) add(fieldPath, `must be at most ${maxLength} characters`);
	if (id && normalized.length > 0 && !ID_PATTERN.test(normalized)) add(fieldPath, "must start with an alphanumeric character and contain only A-Za-z0-9._-");
	return normalized;
}
function enumValue(record, key, path, values, expected, add, optional = false) {
	if (optional && !hasOwn(record, key)) return void 0;
	const value = hasOwn(record, key) ? record[key] : void 0;
	const fieldPath = `${path}.${key}`;
	if (typeof value !== "string") {
		add(fieldPath, value === void 0 ? "is required" : "must be a string");
		return;
	}
	const normalized = value.trim();
	if (!values.has(normalized)) {
		add(fieldPath, `must be one of: ${expected}`);
		return;
	}
	return normalized;
}
function parseGroups(value, path, add) {
	if (!Array.isArray(value)) {
		add(path, value === void 0 ? "is required" : "must be an array");
		return [];
	}
	if (value.length > DIAGRAM_LIMITS.maxGroups) add(path, `must contain at most ${DIAGRAM_LIMITS.maxGroups} items`);
	const result = [];
	const count = Math.min(value.length, DIAGRAM_LIMITS.maxGroups);
	for (let index = 0; index < count; index += 1) {
		const item = value[index];
		const itemPath = `${path}[${index}]`;
		if (!isRecord(item)) {
			add(itemPath, "must be an object");
			continue;
		}
		const id = requiredString(item, "id", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		const label = requiredString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
		const description = optionalString(item, "description", itemPath, DIAGRAM_LIMITS.maxDescriptionLength, add);
		const tone = enumValue(item, "tone", itemPath, TONES, TONE_VALUES.join(" | "), add, true);
		const parentId = optionalString(item, "parentId", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		checkUnknown(item, [
			"id",
			"label",
			"description",
			"tone",
			"parentId"
		], itemPath, add);
		result.push({
			...id !== void 0 ? { id } : { id: "" },
			...label !== void 0 ? { label } : { label: "" },
			...description !== void 0 ? { description } : {},
			...tone !== void 0 ? { tone } : {},
			...parentId !== void 0 ? { parentId } : {}
		});
	}
	return result;
}
function parseNodes(value, path, add) {
	if (!Array.isArray(value)) {
		add(path, value === void 0 ? "is required" : "must be an array");
		return [];
	}
	if (value.length > DIAGRAM_LIMITS.maxNodes) add(path, `must contain at most ${DIAGRAM_LIMITS.maxNodes} items`);
	const result = [];
	const count = Math.min(value.length, DIAGRAM_LIMITS.maxNodes);
	for (let index = 0; index < count; index += 1) {
		const item = value[index];
		const itemPath = `${path}[${index}]`;
		if (!isRecord(item)) {
			add(itemPath, "must be an object");
			continue;
		}
		const id = requiredString(item, "id", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		const label = requiredString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
		const description = optionalString(item, "description", itemPath, DIAGRAM_LIMITS.maxDescriptionLength, add);
		const tone = enumValue(item, "tone", itemPath, TONES, TONE_VALUES.join(" | "), add, true);
		const groupId = optionalString(item, "groupId", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		checkUnknown(item, [
			"id",
			"label",
			"description",
			"tone",
			"groupId"
		], itemPath, add);
		result.push({
			...id !== void 0 ? { id } : { id: "" },
			...label !== void 0 ? { label } : { label: "" },
			...description !== void 0 ? { description } : {},
			...tone !== void 0 ? { tone } : {},
			...groupId !== void 0 ? { groupId } : {}
		});
	}
	return result;
}
function parseEdges(value, path, add) {
	if (!Array.isArray(value)) {
		add(path, value === void 0 ? "is required" : "must be an array");
		return [];
	}
	if (value.length > DIAGRAM_LIMITS.maxEdges) add(path, `must contain at most ${DIAGRAM_LIMITS.maxEdges} items`);
	const result = [];
	const count = Math.min(value.length, DIAGRAM_LIMITS.maxEdges);
	for (let index = 0; index < count; index += 1) {
		const item = value[index];
		const itemPath = `${path}[${index}]`;
		if (!isRecord(item)) {
			add(itemPath, "must be an object");
			continue;
		}
		const from = requiredString(item, "from", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		const to = requiredString(item, "to", itemPath, DIAGRAM_LIMITS.maxIdLength, add, true);
		const label = optionalString(item, "label", itemPath, DIAGRAM_LIMITS.maxLabelLength, add);
		checkUnknown(item, [
			"from",
			"to",
			"label"
		], itemPath, add);
		result.push({
			...from !== void 0 ? { from } : { from: "" },
			...to !== void 0 ? { to } : { to: "" },
			...label !== void 0 ? { label } : {}
		});
	}
	return result;
}
function parseDiagram(value, path, add) {
	if (!isRecord(value)) {
		add(path, value === void 0 ? "is required" : "must be an object");
		return;
	}
	const type = enumValue(value, "type", path, TYPES, DIAGRAM_TYPE_VALUES.join(" | "), add);
	const direction = enumValue(value, "direction", path, DIRECTIONS, DIRECTION_VALUES.join(" | "), add);
	const groups = parseGroups(value.groups, `${path}.groups`, add);
	const nodes = parseNodes(value.nodes, `${path}.nodes`, add);
	const edges = parseEdges(value.edges, `${path}.edges`, add);
	const theme = enumValue(value, "theme", path, THEMES, THEME_VALUES.join(" | "), add, true);
	checkUnknown(value, [
		"type",
		"direction",
		"groups",
		"nodes",
		"edges",
		"theme"
	], path, add);
	return {
		...type !== void 0 ? { type } : { type: "workflow" },
		...direction !== void 0 ? { direction } : { direction: "TB" },
		groups,
		nodes,
		edges,
		...theme !== void 0 ? { theme } : {}
	};
}
function validateSemantics(diagram, path, add) {
	const groupIndices = /* @__PURE__ */ new Map();
	const nodeIndices = /* @__PURE__ */ new Map();
	const allIds = /* @__PURE__ */ new Map();
	diagram.groups.forEach((group, index) => {
		if (!group.id || !ID_PATTERN.test(group.id)) return;
		const idPath = `${path}.groups[${index}].id`;
		const first = allIds.get(group.id);
		if (first !== void 0) add(idPath, `duplicates ${first}`);
		else {
			allIds.set(group.id, idPath);
			groupIndices.set(group.id, index);
		}
	});
	diagram.nodes.forEach((node, index) => {
		if (!node.id || !ID_PATTERN.test(node.id)) return;
		const idPath = `${path}.nodes[${index}].id`;
		const first = allIds.get(node.id);
		if (first !== void 0) add(idPath, `duplicates ${first}`);
		else {
			allIds.set(node.id, idPath);
			nodeIndices.set(node.id, index);
		}
	});
	const parentIndices = new Array(diagram.groups.length);
	const active = diagram.groups.map((group) => Boolean(group.id && groupIndices.has(group.id)));
	diagram.groups.forEach((group, index) => {
		if (!group.parentId || !active[index]) return;
		const parentIndex = groupIndices.get(group.parentId);
		if (parentIndex === void 0) {
			add(`${path}.groups[${index}].parentId`, `references unknown group "${group.parentId}"`);
			return;
		}
		parentIndices[index] = parentIndex;
	});
	const states = new Uint8Array(diagram.groups.length);
	const positions = new Int32Array(diagram.groups.length);
	positions.fill(-1);
	const depths = new Array(diagram.groups.length);
	const cycleMembers = /* @__PURE__ */ new Set();
	const cycleReaching = /* @__PURE__ */ new Set();
	for (let startIndex = 0; startIndex < diagram.groups.length; startIndex += 1) {
		if (!active[startIndex] || states[startIndex] !== 0) continue;
		const chain = [];
		let current = startIndex;
		while (current !== void 0 && states[current] === 0) {
			states[current] = 1;
			positions[current] = chain.length;
			chain.push(current);
			current = parentIndices[current];
		}
		if (current !== void 0 && states[current] === 1) {
			const cycleStart = positions[current];
			for (let index = cycleStart; index < chain.length; index += 1) cycleMembers.add(chain[index]);
			for (const index of chain) cycleReaching.add(index);
		} else if (current !== void 0 && cycleReaching.has(current)) for (const index of chain) cycleReaching.add(index);
		else {
			let depth = current === void 0 ? 0 : depths[current];
			for (let index = chain.length - 1; index >= 0; index -= 1) {
				depth += 1;
				depths[chain[index]] = depth;
			}
		}
		for (const index of chain) {
			states[index] = 2;
			positions[index] = -1;
		}
	}
	diagram.groups.forEach((_group, index) => {
		if (cycleMembers.has(index)) add(`${path}.groups[${index}].parentId`, "creates a parent cycle");
		else if (cycleReaching.has(index)) add(`${path}.groups[${index}].parentId`, "parent ancestry enters a cycle");
	});
	diagram.groups.forEach((_group, index) => {
		const depth = depths[index];
		if (depth !== void 0 && depth > DIAGRAM_LIMITS.maxGroupDepth) add(`${path}.groups[${index}].parentId`, `produces nesting depth ${depth}; maximum is ${DIAGRAM_LIMITS.maxGroupDepth}`);
	});
	diagram.nodes.forEach((node, index) => {
		if (node.groupId !== void 0 && !groupIndices.has(node.groupId)) add(`${path}.nodes[${index}].groupId`, `references unknown group "${node.groupId}"`);
	});
	diagram.edges.forEach((edge, index) => {
		if (edge.from && !nodeIndices.has(edge.from)) add(`${path}.edges[${index}].from`, `references unknown node "${edge.from}"`);
		if (edge.to && !nodeIndices.has(edge.to)) add(`${path}.edges[${index}].to`, `references unknown node "${edge.to}"`);
		if (edge.from && edge.to && edge.from === edge.to) add(`${path}.edges[${index}]`, "self edges are not allowed");
	});
}
function normalizeDiagramArtifact(input) {
	const violations = [];
	const add = (path, message) => violations.push({
		path,
		message
	});
	if (!isRecord(input)) throw new DiagramValidationError([{
		path: "$",
		message: "must be an object"
	}]);
	const artifactId = requiredString(input, "artifactId", "$", DIAGRAM_LIMITS.maxIdLength, add, true);
	const title = requiredString(input, "title", "$", DIAGRAM_LIMITS.maxTitleLength, add);
	const diagram = parseDiagram(input.diagram, "$.diagram", add);
	checkUnknown(input, [
		"artifactId",
		"title",
		"diagram"
	], "$", add);
	if (diagram !== void 0) validateSemantics(diagram, "$.diagram", add);
	if (violations.length > 0) throw new DiagramValidationError(violations);
	return {
		artifactId,
		title,
		diagram
	};
}
function parseDiagramPresentationMetadata(input) {
	if (!isRecord(input) || input.schemaVersion !== 1 || input.kind !== "diagram-artifact") return null;
	const keys = Object.keys(input);
	const allowed = new Set([
		"schemaVersion",
		"kind",
		"artifactId",
		"title",
		"diagram"
	]);
	if (keys.some((key) => !allowed.has(key))) return null;
	try {
		return {
			schemaVersion: 1,
			kind: "diagram-artifact",
			...normalizeDiagramArtifact({
				artifactId: input.artifactId,
				title: input.title,
				diagram: input.diagram
			})
		};
	} catch (error) {
		if (error instanceof DiagramValidationError) return null;
		throw error;
	}
}

//#endregion
//#region src/client/events.ts
/** Artifacts visible when the closing assistant message was emitted. */
function selectDiagramArtifacts(owner) {
	const data = owner.turn.data.get("diagramArtifacts");
	if (data === void 0) return null;
	const occurrences = data.occurrences.filter(({ seq }) => seq <= owner.seq);
	return occurrences.length === 0 ? null : occurrences;
}
/** Turn-local artifact accumulator. It publishes state only, never a view node. */
const diagramArtifactsDefinition = {
	kind: "diagram-artifacts",
	match: (event) => {
		if (event.type === "turn/start") return {
			id: String(event.data.turn),
			role: "start"
		};
		if (event.type === "tool/result" && (0, __deepseek_ai_dsh_client_runtime_client.isAppendSurfaceEvent)(event)) return {
			id: String(event.data.turn),
			role: "update"
		};
		return null;
	},
	start: (_context, match) => {
		if (match.event.type !== "turn/start") throw new Error("diagram-artifacts start requires turn/start");
		return {
			turn: match.event.data.turn,
			occurrences: []
		};
	},
	update: (context, match) => {
		if (match.event.type !== "tool/result") return context.state;
		if (match.event.data.message.content[0]?.isError === true) return context.state;
		const metadata = parseDiagramPresentationMetadata(match.event.data.meta);
		if (metadata === null) return context.state;
		return {
			...context.state,
			occurrences: [...context.state.occurrences, {
				seq: match.event.seq,
				metadata
			}]
		};
	},
	buildLocationData: (context, scope) => scope !== "turn" || context.state === void 0 ? null : {
		kind: "turn",
		turn: context.state.turn,
		key: "diagramArtifacts",
		value: { occurrences: context.state.occurrences }
	}
};

//#endregion
//#region src/client/layout.ts
const LIGHT_PALETTES = {
	neutral: {
		stroke: "#5b6472",
		fill: "#ffffff",
		accent: "#8a93a6",
		groupFill: "#f3f5f9",
		text: "#1f2430"
	},
	compute: {
		stroke: "#2563eb",
		fill: "#eff6ff",
		accent: "#3b82f6",
		groupFill: "#eaf2ff",
		text: "#1e3a8a"
	},
	flow: {
		stroke: "#059669",
		fill: "#ecfdf5",
		accent: "#10b981",
		groupFill: "#e7f7ef",
		text: "#065f46"
	},
	constraint: {
		stroke: "#d97706",
		fill: "#fffbeb",
		accent: "#f59e0b",
		groupFill: "#fef3c7",
		text: "#92400e"
	}
};
const DARK_PALETTES = {
	neutral: {
		stroke: "#9aa4b2",
		fill: "#1c2128",
		accent: "#c2cbd6",
		groupFill: "#242b34",
		text: "#e6eaf0"
	},
	compute: {
		stroke: "#60a5fa",
		fill: "#17243a",
		accent: "#3b82f6",
		groupFill: "#1c2c4a",
		text: "#dbeafe"
	},
	flow: {
		stroke: "#34d399",
		fill: "#0f2a20",
		accent: "#10b981",
		groupFill: "#12352a",
		text: "#d1fae5"
	},
	constraint: {
		stroke: "#fbbf24",
		fill: "#2b2210",
		accent: "#f59e0b",
		groupFill: "#33290f",
		text: "#fef3c7"
	}
};
const TONE_PALETTES = {
	light: LIGHT_PALETTES,
	dark: DARK_PALETTES
};
const DEFAULT_TONE = "neutral";
const NODE_WIDTH = 160;
const NODE_PAD_X = 12;
const NODE_PAD_Y = 9;
const LINE_HEIGHT = 18;
const MAX_LINE_UNITS = Math.floor((NODE_WIDTH - NODE_PAD_X * 2) / 8);
const RANK_GAP_MAIN = 56;
const NODE_GAP_CROSS = 24;
const CANVAS_PAD = 16;
const GROUP_PAD = 16;
const GROUP_HEADER = 26;
const BACK_EDGE_BOW = 44;
function isWideCodePoint(cp) {
	return cp >= 4352 && cp <= 4447 || cp >= 11904 && cp <= 42191 || cp >= 44032 && cp <= 55203 || cp >= 63744 && cp <= 64255 || cp >= 65072 && cp <= 65103 || cp >= 65280 && cp <= 65376 || cp >= 65504 && cp <= 65510 || cp >= 131072 && cp <= 196605 || cp >= 196608 && cp <= 262141;
}
function charUnits(ch) {
	return isWideCodePoint(ch.codePointAt(0) ?? 0) ? 2 : 1;
}
function wrapText(text, maxUnits) {
	const trimmed = text.trim();
	if (trimmed.length === 0) return [""];
	const lines = [];
	let line = "";
	let units = 0;
	for (const ch of trimmed) {
		const u = charUnits(ch);
		if (units + u > maxUnits && line.length > 0) {
			lines.push(line);
			line = ch === " " ? "" : ch;
			units = line === "" ? 0 : u;
		} else {
			line += ch;
			units += u;
		}
	}
	if (line.length > 0) lines.push(line);
	return lines.length > 0 ? lines : [""];
}
function nodeHeight(lines) {
	return Math.max(lines.length, 1) * LINE_HEIGHT + NODE_PAD_Y * 2;
}
function fmt(n) {
	return String(Math.round(n * 100) / 100);
}
function assignRanks(nodeIds, edges) {
	const idSet = new Set(nodeIds);
	const indegree = new Map(nodeIds.map((id) => [id, 0]));
	const outgoing = new Map(nodeIds.map((id) => [id, []]));
	const incoming = new Map(nodeIds.map((id) => [id, []]));
	for (const edge of edges) {
		if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue;
		outgoing.get(edge.from).push(edge.to);
		incoming.get(edge.to).push(edge.from);
		indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
	}
	const rank = /* @__PURE__ */ new Map();
	const queue = nodeIds.filter((id) => indegree.get(id) === 0);
	let head = 0;
	while (head < queue.length) {
		const id = queue[head++];
		const predRanks = incoming.get(id).map((p) => rank.get(p) ?? 0);
		rank.set(id, predRanks.length > 0 ? Math.max(...predRanks) + 1 : 0);
		for (const to of outgoing.get(id)) {
			indegree.set(to, (indegree.get(to) ?? 1) - 1);
			if (indegree.get(to) === 0) queue.push(to);
		}
	}
	let next = 0;
	for (const r of rank.values()) next = Math.max(next, r + 1);
	for (const id of nodeIds) if (!rank.has(id)) rank.set(id, next++);
	return rank;
}
function unionBounds(rects) {
	if (rects.length === 0) return null;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const r of rects) {
		minX = Math.min(minX, r.x);
		minY = Math.min(minY, r.y);
		maxX = Math.max(maxX, r.x + r.width);
		maxY = Math.max(maxY, r.y + r.height);
	}
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function layoutDiagram(spec, options = {}) {
	const direction = options.direction ?? spec.direction;
	const theme = options.theme ?? "light";
	const placed = /* @__PURE__ */ new Map();
	const nodeOrder = [];
	for (const node of spec.nodes) {
		const lines = wrapText(node.label, MAX_LINE_UNITS);
		const placedNode = {
			id: node.id,
			x: 0,
			y: 0,
			width: NODE_WIDTH,
			height: nodeHeight(lines),
			lines,
			tone: node.tone,
			groupId: node.groupId
		};
		placed.set(node.id, placedNode);
		nodeOrder.push(placedNode);
	}
	const rank = assignRanks(spec.nodes.map((n) => n.id), spec.edges);
	const maxRank = nodeOrder.length === 0 ? -1 : Math.max(...rank.values());
	const buckets = Array.from({ length: Math.max(maxRank + 1, 0) }, () => []);
	for (const node of nodeOrder) buckets[rank.get(node.id) ?? 0].push(node);
	let mainCursor = 0;
	for (const bucket of buckets) {
		if (bucket.length === 0) continue;
		let crossCursor = 0;
		let mainSize = 0;
		for (const node of bucket) if (direction === "TB") {
			node.x = crossCursor;
			node.y = mainCursor;
			crossCursor += node.width + NODE_GAP_CROSS;
			mainSize = Math.max(mainSize, node.height);
		} else {
			node.x = mainCursor;
			node.y = crossCursor;
			crossCursor += node.height + NODE_GAP_CROSS;
			mainSize = Math.max(mainSize, node.width);
		}
		mainCursor += mainSize + RANK_GAP_MAIN;
	}
	const groupById = /* @__PURE__ */ new Map();
	const children = /* @__PURE__ */ new Map();
	const roots = [];
	for (const g of spec.groups) {
		groupById.set(g.id, {
			id: g.id,
			label: g.label,
			tone: g.tone,
			parentId: g.parentId
		});
		children.set(g.id, []);
	}
	for (const g of spec.groups) if (g.parentId && groupById.has(g.parentId)) children.get(g.parentId).push(g.id);
	else roots.push(g.id);
	const depthOf = /* @__PURE__ */ new Map();
	const visit = (id, depth) => {
		if (depthOf.has(id)) return;
		depthOf.set(id, depth);
		for (const child of children.get(id) ?? []) visit(child, depth + 1);
	};
	for (const root of roots) visit(root, 0);
	for (const g of spec.groups) if (!depthOf.has(g.id)) depthOf.set(g.id, 0);
	const groupRects = /* @__PURE__ */ new Map();
	const directNodeIds = /* @__PURE__ */ new Map();
	for (const g of spec.groups) directNodeIds.set(g.id, []);
	for (const node of spec.nodes) if (node.groupId && directNodeIds.has(node.groupId)) directNodeIds.get(node.groupId).push(node.id);
	const laidOut = /* @__PURE__ */ new Set();
	const visiting = /* @__PURE__ */ new Set();
	const layoutGroup = (gid) => {
		if (laidOut.has(gid) || visiting.has(gid)) return;
		visiting.add(gid);
		for (const child of children.get(gid) ?? []) layoutGroup(child);
		visiting.delete(gid);
		const rects = [];
		for (const nid of directNodeIds.get(gid) ?? []) {
			const n = placed.get(nid);
			if (n) rects.push({
				x: n.x,
				y: n.y,
				width: n.width,
				height: n.height
			});
		}
		for (const child of children.get(gid) ?? []) {
			const r = groupRects.get(child);
			if (r) rects.push(r);
		}
		const bounds = unionBounds(rects);
		if (bounds === null) {
			groupRects.set(gid, {
				x: 0,
				y: 0,
				width: NODE_WIDTH,
				height: GROUP_HEADER + GROUP_PAD * 2
			});
			laidOut.add(gid);
			return;
		}
		groupRects.set(gid, {
			x: bounds.x - GROUP_PAD,
			y: bounds.y - GROUP_PAD - GROUP_HEADER,
			width: bounds.width + GROUP_PAD * 2,
			height: bounds.height + GROUP_PAD * 2 + GROUP_HEADER
		});
		laidOut.add(gid);
	};
	for (const root of roots) layoutGroup(root);
	const canvas = unionBounds([...nodeOrder.map((n) => ({
		x: n.x,
		y: n.y,
		width: n.width,
		height: n.height
	})), ...[...groupRects.values()]]);
	if (canvas === null) return {
		direction,
		theme,
		width: 0,
		height: 0,
		nodes: [],
		groups: [],
		edges: []
	};
	const offsetX = CANVAS_PAD - canvas.x;
	const offsetY = CANVAS_PAD - canvas.y;
	for (const node of nodeOrder) {
		node.x += offsetX;
		node.y += offsetY;
	}
	const groups = [];
	for (const g of spec.groups) {
		const rect = groupRects.get(g.id);
		if (rect === void 0) continue;
		groups.push({
			id: g.id,
			x: rect.x + offsetX,
			y: rect.y + offsetY,
			width: rect.width,
			height: rect.height,
			label: g.label,
			tone: g.tone,
			parentId: g.parentId,
			depth: depthOf.get(g.id) ?? 0
		});
	}
	const edges = [];
	const nodeById = new Map(nodeOrder.map((n) => [n.id, n]));
	for (const edge of spec.edges) {
		const source = nodeById.get(edge.from);
		const target = nodeById.get(edge.to);
		if (!source || !target) continue;
		const sourceRank = rank.get(source.id) ?? 0;
		const isBack = (rank.get(target.id) ?? 0) <= sourceRank;
		let path;
		let labelX;
		let labelY;
		if (!isBack) if (direction === "TB") {
			const x0 = source.x + source.width / 2;
			const x1 = target.x + target.width / 2;
			const y0 = source.y + source.height;
			const y1 = target.y;
			const midY = (y0 + y1) / 2;
			path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(x0) + " " + fmt(midY) + ", " + fmt(x1) + " " + fmt(midY) + ", " + fmt(x1) + " " + fmt(y1);
			labelX = (x0 + x1) / 2;
			labelY = midY - 6;
		} else {
			const x0 = source.x + source.width;
			const x1 = target.x;
			const y0 = source.y + source.height / 2;
			const y1 = target.y + target.height / 2;
			const midX = (x0 + x1) / 2;
			path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(midX) + " " + fmt(y0) + ", " + fmt(midX) + " " + fmt(y1) + ", " + fmt(x1) + " " + fmt(y1);
			labelX = midX;
			labelY = (y0 + y1) / 2 - 6;
		}
		else if (direction === "TB") {
			const x0 = source.x + source.width;
			const x1 = target.x + target.width;
			const y0 = source.y + source.height / 2;
			const y1 = target.y + target.height / 2;
			const xMid = Math.max(x0, x1) + BACK_EDGE_BOW;
			path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(xMid) + " " + fmt(y0) + ", " + fmt(xMid) + " " + fmt(y1) + ", " + fmt(x1) + " " + fmt(y1);
			labelX = xMid + 4;
			labelY = (y0 + y1) / 2;
		} else {
			const x0 = source.x + source.width / 2;
			const x1 = target.x + target.width / 2;
			const y0 = source.y + source.height;
			const y1 = target.y + target.height;
			const yMid = Math.max(y0, y1) + BACK_EDGE_BOW;
			path = "M " + fmt(x0) + " " + fmt(y0) + " C " + fmt(x0) + " " + fmt(yMid) + ", " + fmt(x1) + " " + fmt(yMid) + ", " + fmt(x1) + " " + fmt(y1);
			labelX = (x0 + x1) / 2;
			labelY = yMid + 12;
		}
		edges.push({
			from: edge.from,
			to: edge.to,
			path,
			label: edge.label,
			labelX,
			labelY,
			isBack
		});
	}
	return {
		direction,
		theme,
		width: canvas.width + CANVAS_PAD * 2,
		height: canvas.height + CANVAS_PAD * 2,
		nodes: nodeOrder.map((n) => ({
			id: n.id,
			x: n.x,
			y: n.y,
			width: n.width,
			height: n.height,
			lines: n.lines,
			tone: n.tone,
			groupId: n.groupId
		})),
		groups,
		edges
	};
}

//#endregion
//#region src/client/DiagramView.tsx
/**
* Resolve an optional theme to a concrete light/dark value.
* "auto" consults prefers-color-scheme when a media-query function is
* available (browser) or injectable (tests); otherwise it falls back to light.
*/
function resolveTheme(theme, mql) {
	if (theme === "light" || theme === "dark") return theme;
	if (mql) try {
		return mql("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
	if (typeof window !== "undefined" && typeof window.matchMedia === "function") try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
	return "light";
}
/**
* Claude-Artifact-style diagram view. Renders SVG directly via React elements,
* so all text is auto-escaped and no HTML/script/style string is ever injected.
* No external images, fonts, or resources are referenced.
*/
const DiagramView = (0, react.memo)(function DiagramView$1(props) {
	const { diagram, direction, theme, title, className } = props;
	const resolved = (0, react.useMemo)(() => resolveTheme(theme), [theme]);
	const dir = direction ?? diagram.direction;
	const model = (0, react.useMemo)(() => layoutDiagram(diagram, {
		direction: dir,
		theme: resolved
	}), [
		diagram,
		dir,
		resolved
	]);
	const palettes = TONE_PALETTES[resolved];
	const edgeColor = resolved === "light" ? "#6b7280" : "#8b95a5";
	const markerId = resolved === "light" ? "dsh-artifact-arrow-light" : "dsh-artifact-arrow-dark";
	const rootClass = "dsh-artifact-diagram" + (className ? " " + className : "");
	const label = title ?? "Diagram";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		className: rootClass,
		viewBox: "0 0 " + model.width + " " + model.height,
		preserveAspectRatio: "xMidYMid meet",
		role: "img",
		"aria-label": label,
		width: "100%",
		style: {
			height: "auto",
			display: "block"
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: label }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("desc", { children: "Diagram artifact" + (title ? ": " + title : "") }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
				id: markerId,
				viewBox: "0 0 10 10",
				refX: "9",
				refY: "5",
				markerWidth: "7",
				markerHeight: "7",
				orient: "auto-start-reverse",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M 0 0 L 10 5 L 0 10 z",
					fill: edgeColor
				})
			}) }),
			model.groups.map((group) => {
				const pal = palettes[group.tone ?? DEFAULT_TONE];
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: group.x,
					y: group.y,
					width: group.width,
					height: group.height,
					rx: 8,
					fill: pal.groupFill,
					stroke: pal.stroke,
					strokeOpacity: .35
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: group.x + 12,
					y: group.y + 17,
					fontSize: 13,
					fontWeight: 600,
					fill: pal.text,
					fontFamily: "system-ui, -apple-system, sans-serif",
					children: group.label
				})] }, "g-" + group.id);
			}),
			model.edges.map((edge, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: edge.path,
				fill: "none",
				stroke: edgeColor,
				strokeWidth: 1.5,
				markerEnd: "url(#" + markerId + ")"
			}), edge.label ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: edge.labelX,
				y: edge.labelY,
				fontSize: 11,
				fill: edgeColor,
				textAnchor: "middle",
				fontFamily: "system-ui, -apple-system, sans-serif",
				children: edge.label
			}) : null] }, "e-" + index)),
			model.nodes.map((node) => {
				const pal = palettes[node.tone ?? DEFAULT_TONE];
				const lineStartY = node.y + node.height / 2 - (node.lines.length - 1) * 18 / 2;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: node.x,
					y: node.y,
					width: node.width,
					height: node.height,
					rx: 8,
					fill: pal.fill,
					stroke: pal.stroke,
					strokeWidth: 1.5
				}), node.lines.map((line, li) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: node.x + node.width / 2,
					y: lineStartY + li * 18 + 12,
					fontSize: 13,
					fill: pal.text,
					textAnchor: "middle",
					fontFamily: "system-ui, -apple-system, sans-serif",
					children: line
				}, "l-" + li))] }, "n-" + node.id);
			})
		]
	});
});

//#endregion
//#region src/client/export.ts
/**
* Safe export helpers for diagram artifacts. All filenames are sanitized and
* all downloads are local blobs; nothing is uploaded anywhere.
*/
/** Reduce an arbitrary title or id to a safe, single-segment file stem. */
function sanitizeFilename(input) {
	return (input ?? "").trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 80) || "diagram";
}
/** Build a filename like "title-id.ext" with both parts sanitized. */
function buildFilename(artifactId, title, ext) {
	const id = sanitizeFilename(artifactId);
	const base = title && title.trim() ? sanitizeFilename(title) : "";
	return (base ? base + "-" + id : id) + "." + ext;
}
/** Trigger a local download of a blob. */
function downloadBlob(filename, blob) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.rel = "noopener";
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
/** Build the standard SVG blob used for download and rasterization. */
function makeSvgBlob(markup) {
	return new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
}
/** Download SVG markup as a local .svg file. */
function downloadSvg(filename, svgMarkup) {
	downloadBlob(filename, makeSvgBlob(svgMarkup));
}
/** Rasterize SVG markup to a PNG and download it. Resolves false on failure. */
function downloadPng(filename, svgMarkup, scale = 2) {
	return new Promise((resolve) => {
		const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
		const url = URL.createObjectURL(svgBlob);
		const img = new Image();
		img.onload = () => {
			try {
				const width = Math.max(1, Math.round(img.naturalWidth * scale));
				const height = Math.max(1, Math.round(img.naturalHeight * scale));
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve(false);
					return;
				}
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(img, 0, 0, width, height);
				canvas.toBlob((blob) => {
					if (blob) {
						downloadBlob(filename.replace(/\.svg$/, ".png"), blob);
						resolve(true);
					} else resolve(false);
				}, "image/png");
			} finally {
				URL.revokeObjectURL(url);
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(false);
		};
		img.src = url;
	});
}
/**
* Serialize a live SVG element to standalone markup, injecting explicit
* width/height (from the viewBox) so it rasterizes at a stable size.
*/
function serializeSvgElement(svg) {
	const clone = svg.cloneNode(true);
	const vb = svg.viewBox.baseVal;
	if (vb && vb.width > 0 && vb.height > 0) {
		clone.setAttribute("width", String(vb.width));
		clone.setAttribute("height", String(vb.height));
	}
	clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	clone.removeAttribute("style");
	return new XMLSerializer().serializeToString(clone);
}
/** Copy text to the clipboard; falls back to a hidden textarea when needed. */
async function copyText(text) {
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {}
	try {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = document.execCommand("copy");
		textarea.remove();
		return ok;
	} catch {
		return false;
	}
}

//#endregion
//#region src/client/settings.ts
const STORAGE_KEY = "dsh-artifacts.settings";
function readStored() {
	try {
		if (typeof localStorage === "undefined") return {};
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return {};
		return parsed;
	} catch {
		return {};
	}
}
function writeStored(value) {
	try {
		if (typeof localStorage === "undefined") return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {}
}
/** Create an observable settings store, persisted to localStorage when present. */
function createArtifactSettings(initial) {
	const stored = readStored();
	let snapshot = {
		autoOpen: initial?.autoOpen ?? stored.autoOpen ?? true,
		theme: initial?.theme ?? stored.theme ?? "light"
	};
	const listeners = /* @__PURE__ */ new Set();
	const emit = () => listeners.forEach((fn) => fn());
	return {
		getSnapshot: () => snapshot,
		subscribe(fn) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		},
		setAutoOpen(value) {
			snapshot = {
				...snapshot,
				autoOpen: value
			};
			writeStored(snapshot);
			emit();
		},
		setTheme(theme) {
			snapshot = {
				...snapshot,
				theme
			};
			writeStored(snapshot);
			emit();
		}
	};
}
/** One shared settings store per client bundle. */
const artifactSettings = createArtifactSettings();

//#endregion
//#region src/client/versions.ts
function isConversationSnapshot(source) {
	return !Array.isArray(source);
}
function sourceNodes(source) {
	return isConversationSnapshot(source) ? source.nodes : source;
}
function isSuccessfulToolResult(node) {
	return node.kind === "tool-result" && !node.isError;
}
/** Derive in-window artifact history from durable tool-result metadata. */
function listArtifactVersionGroups(source) {
	const groups = /* @__PURE__ */ new Map();
	for (const node of sourceNodes(source)) {
		if (!isSuccessfulToolResult(node)) continue;
		const metadata = parseDiagramPresentationMetadata(node.meta);
		if (metadata === null) continue;
		let versions = groups.get(metadata.artifactId);
		if (versions === void 0) {
			versions = [];
			groups.set(metadata.artifactId, versions);
		}
		versions.push({
			artifactId: metadata.artifactId,
			version: versions.length + 1,
			seq: node.seq,
			metadata
		});
	}
	return [...groups].map(([artifactId, versions]) => ({
		artifactId,
		versions
	}));
}
/** Return the latest loaded version in a group, if any. */
function selectLatestArtifactVersion(group) {
	return group?.versions.at(-1);
}
/** Find one one-based version in a group. */
function findArtifactVersion(group, version) {
	if (!Number.isSafeInteger(version) || version <= 0) return void 0;
	return group?.versions[version - 1];
}

//#endregion
//#region src/client/overlay.tsx
const PANEL = {
	position: "fixed",
	top: 0,
	right: 0,
	bottom: 0,
	width: 520,
	maxWidth: "92vw",
	background: "#ffffff",
	borderLeft: "1px solid #e5e7eb",
	boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
	display: "flex",
	flexDirection: "column",
	zIndex: 1e3
};
const PANEL_HEADER = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "12px 16px",
	borderBottom: "1px solid #f0f0f0"
};
const PANEL_TITLE = {
	flex: 1,
	fontSize: 14,
	fontWeight: 600,
	color: "#111827",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
};
const SELECT = {
	border: "1px solid #d1d5db",
	borderRadius: 6,
	background: "#f9fafb",
	color: "#111827",
	fontSize: 12,
	padding: "4px 8px"
};
const BUTTON$1 = {
	border: "1px solid #d1d5db",
	borderRadius: 6,
	background: "#f9fafb",
	color: "#111827",
	fontSize: 12,
	padding: "4px 10px",
	cursor: "pointer"
};
const TAB_BAR = {
	display: "flex",
	gap: 2,
	padding: "6px 16px 0",
	borderBottom: "1px solid #f0f0f0"
};
const TAB = {
	border: "none",
	background: "transparent",
	color: "#6b7280",
	fontSize: 12,
	padding: "6px 12px",
	cursor: "pointer",
	borderBottom: "2px solid transparent"
};
const TAB_ACTIVE = {
	border: "none",
	background: "transparent",
	color: "#111827",
	fontSize: 12,
	fontWeight: 600,
	padding: "6px 12px",
	cursor: "pointer",
	borderBottom: "2px solid #111827"
};
const VERSION_BAR = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	padding: "8px 16px",
	borderBottom: "1px solid #f0f0f0",
	flexWrap: "wrap"
};
const VERSION_PILL = {
	border: "1px solid #d1d5db",
	borderRadius: 999,
	background: "#f9fafb",
	color: "#111827",
	fontSize: 12,
	padding: "2px 9px",
	cursor: "pointer"
};
const VERSION_PILL_ACTIVE = {
	border: "1px solid #111827",
	borderRadius: 999,
	background: "#111827",
	color: "#ffffff",
	fontSize: 12,
	padding: "2px 9px",
	cursor: "pointer"
};
const PANEL_BODY = {
	flex: 1,
	overflow: "auto",
	padding: 16,
	background: "#ffffff"
};
const SOURCE = {
	margin: 0,
	fontSize: 12,
	lineHeight: 1.5,
	color: "#111827",
	background: "#f9fafb",
	border: "1px solid #e5e7eb",
	borderRadius: 8,
	padding: 12,
	overflow: "auto",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
};
const EMPTY = {
	fontSize: 13,
	color: "#6b7280",
	padding: 24,
	textAlign: "center"
};
const TOOLBAR = {
	display: "flex",
	alignItems: "center",
	gap: 6,
	padding: "10px 16px",
	borderTop: "1px solid #f0f0f0",
	flexWrap: "wrap"
};
const TOGGLE_LABEL = {
	display: "inline-flex",
	alignItems: "center",
	gap: 5,
	fontSize: 12,
	color: "#374151",
	marginLeft: "auto"
};
const DEFAULT_PANEL_WIDTH = 520;
const MIN_PANEL_WIDTH = 320;
const RESIZE_HANDLE = {
	position: "absolute",
	left: 0,
	top: 0,
	bottom: 0,
	width: 6,
	cursor: "col-resize",
	touchAction: "none",
	zIndex: 2
};
/** Clamp a numeric value to an inclusive range (used for drawer resize bounds). */
function clampWidth(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
function useSessionSnapshot(session) {
	const subscribe = (0, react.useMemo)(() => session ? (fn) => session.subscribe(fn) : () => () => {}, [session]);
	const getSnapshot = (0, react.useMemo)(() => session ? () => session.getSnapshot() : () => void 0, [session]);
	return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
}
/** Right-side drawer rendered by the shell.overlay list seat while an artifact is open. */
function ArtifactOverlay(props) {
	const { controller, getSession, getCurrentSessionId, subscribeSessions } = props;
	const state = (0, react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
	const currentSessionId = (0, react.useSyncExternalStore)(subscribeSessions, getCurrentSessionId, getCurrentSessionId);
	const settings = (0, react.useSyncExternalStore)(artifactSettings.subscribe, artifactSettings.getSnapshot, artifactSettings.getSnapshot);
	const [tab, setTab] = (0, react.useState)("preview");
	const [width, setWidth] = (0, react.useState)(DEFAULT_PANEL_WIDTH);
	const [maximized, setMaximized] = (0, react.useState)(false);
	const [resizing, setResizing] = (0, react.useState)(false);
	const previewRef = (0, react.useRef)(null);
	const dragRef = (0, react.useRef)(null);
	const panelRef = (0, react.useRef)(null);
	const openSessionId = state.open ? state.sessionId : void 0;
	const snapshot = useSessionSnapshot(openSessionId === void 0 ? void 0 : getSession(openSessionId));
	const groups = (0, react.useMemo)(() => listArtifactVersionGroups(snapshot ?? []), [snapshot]);
	(0, react.useEffect)(() => {
		if (currentSessionId === void 0) {
			if (state.open) controller.close();
		} else controller.clearForSession(currentSessionId);
	}, [
		currentSessionId,
		controller,
		state.open
	]);
	(0, react.useEffect)(() => {
		if (!resizing) return;
		const onMove = (event) => {
			if (!dragRef.current) return;
			const delta = dragRef.current.startX - event.clientX;
			setWidth(clampWidth(dragRef.current.startWidth + delta, MIN_PANEL_WIDTH, window.innerWidth));
		};
		const onUp = () => {
			setResizing(false);
			dragRef.current = null;
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [resizing]);
	(0, react.useEffect)(() => {
		if (!state.open) {
			setMaximized(false);
			return;
		}
		const onKeyDown = (event) => {
			if (event.key === "Escape") controller.close();
		};
		window.addEventListener("keydown", onKeyDown);
		panelRef.current?.focus();
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [state.open, controller]);
	if (!state.open || state.sessionId === void 0 || state.artifactId === void 0 || state.version === void 0) return null;
	if (currentSessionId !== state.sessionId) return null;
	const group = groups.find((g) => g.artifactId === state.artifactId);
	const versions = group?.versions ?? [];
	const version = findArtifactVersion(group, state.version);
	const serialize = () => {
		const svg = previewRef.current?.querySelector("svg");
		if (!svg) return null;
		return serializeSvgElement(svg);
	};
	const handleCopySvg = () => {
		const markup = serialize();
		if (markup) copyText(markup);
	};
	const handleCopySpec = () => {
		if (version) copyText(JSON.stringify(version.metadata.diagram, null, 2));
	};
	const handleDownloadSvg = () => {
		if (!version) return;
		const markup = serialize();
		if (markup) downloadSvg(buildFilename(version.metadata.artifactId, version.metadata.title, "svg"), markup);
	};
	const handleDownloadPng = () => {
		if (!version) return;
		const markup = serialize();
		if (markup) downloadPng(buildFilename(version.metadata.artifactId, version.metadata.title, "svg"), markup);
	};
	const specText = version ? JSON.stringify(version.metadata.diagram, null, 2) : "";
	const panelStyle = {
		...PANEL,
		width: maximized ? "100vw" : width,
		maxWidth: maximized ? "100vw" : "92vw"
	};
	const startResize = (event) => {
		event.preventDefault();
		dragRef.current = {
			startX: event.clientX,
			startWidth: width
		};
		setResizing(true);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: panelRef,
		style: panelStyle,
		role: "dialog",
		"aria-label": "Diagram artifact panel",
		tabIndex: -1,
		children: [
			maximized ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: RESIZE_HANDLE,
				onPointerDown: startResize,
				role: "separator",
				"aria-orientation": "vertical",
				"aria-label": "Resize diagram panel"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: PANEL_HEADER,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: PANEL_TITLE,
						children: version ? version.metadata.title : "Diagram"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						style: SELECT,
						value: settings.theme,
						onChange: (event) => artifactSettings.setTheme(event.target.value),
						"aria-label": "Diagram theme",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "light",
								children: "Light"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "dark",
								children: "Dark"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "auto",
								children: "Auto"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: () => setMaximized((value) => !value),
						"aria-label": maximized ? "Restore diagram panel" : "Maximize diagram panel",
						children: maximized ? "Restore" : "Maximize"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: () => controller.close(),
						children: "Close"
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: TAB_BAR,
				role: "tablist",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": tab === "preview",
					style: tab === "preview" ? TAB_ACTIVE : TAB,
					onClick: () => setTab("preview"),
					children: "Preview"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "tab",
					"aria-selected": tab === "source",
					style: tab === "source" ? TAB_ACTIVE : TAB,
					onClick: () => setTab("source"),
					children: "Source"
				})]
			}),
			versions.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: VERSION_BAR,
				children: versions.map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					style: v.version === state.version ? VERSION_PILL_ACTIVE : VERSION_PILL,
					onClick: () => controller.selectVersion(v.version),
					children: "v" + v.version
				}, v.version))
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: PANEL_BODY,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: previewRef,
					style: { display: tab === "preview" ? "block" : "none" },
					children: version ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiagramView, {
						diagram: version.metadata.diagram,
						title: version.metadata.title,
						theme: settings.theme
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: EMPTY,
						children: "This diagram is not available in the current view."
					})
				}), tab === "source" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					style: SOURCE,
					children: specText
				}) : null]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: TOOLBAR,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: handleDownloadSvg,
						children: "Download SVG"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: handleDownloadPng,
						children: "Download PNG"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: handleCopySvg,
						children: "Copy SVG"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: BUTTON$1,
						onClick: handleCopySpec,
						children: "Copy spec"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: TOGGLE_LABEL,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: settings.autoOpen,
							onChange: (event) => artifactSettings.setAutoOpen(event.target.checked)
						}), "Auto-open"]
					})
				]
			})
		]
	});
}

//#endregion
//#region src/client/artifact-controller.ts
const CLOSED_SNAPSHOT = Object.freeze({ open: false });
function requiredId(value, name) {
	if (value.trim().length === 0) throw new TypeError(`${name} is required`);
	return value;
}
function positiveVersion(version) {
	if (!Number.isSafeInteger(version) || version <= 0) throw new RangeError("version must be a positive safe integer");
	return version;
}
/** Framework-independent observable state for the future artifact UI. */
var ArtifactController = class {
	#snapshot = CLOSED_SNAPSHOT;
	#listeners = /* @__PURE__ */ new Set();
	subscribe = (listener) => {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	};
	getSnapshot = () => this.#snapshot;
	openArtifact(sessionId, artifactId, version) {
		const next = Object.freeze({
			open: true,
			sessionId: requiredId(sessionId, "sessionId"),
			artifactId: requiredId(artifactId, "artifactId"),
			version: positiveVersion(version)
		});
		this.#replace(next);
	}
	close() {
		if (!this.#snapshot.open) return;
		this.#replace(Object.freeze({
			...this.#snapshot,
			open: false
		}));
	}
	selectVersion(version) {
		const nextVersion = positiveVersion(version);
		if (this.#snapshot.sessionId === void 0 || this.#snapshot.artifactId === void 0) throw new Error("cannot select a version without an artifact");
		if (this.#snapshot.version === nextVersion) return;
		this.#replace(Object.freeze({
			...this.#snapshot,
			version: nextVersion
		}));
	}
	clearForSession(sessionId) {
		const activeSessionId = requiredId(sessionId, "sessionId");
		if (this.#snapshot.sessionId === void 0 || this.#snapshot.sessionId === activeSessionId) return;
		this.#replace(CLOSED_SNAPSHOT);
	}
	#replace(next) {
		const current = this.#snapshot;
		if (current.open === next.open && current.sessionId === next.sessionId && current.artifactId === next.artifactId && current.version === next.version) return;
		this.#snapshot = next;
		for (const listener of [...this.#listeners]) listener();
	}
};
function createArtifactController() {
	return new ArtifactController();
}

//#endregion
//#region src/client/store.ts
/** One shared drawer state per client bundle (single browser module instance). */
const artifactController = createArtifactController();

//#endregion
//#region src/client/render-toolview.tsx
function isSettled(block) {
	return "kind" in block && block.kind === "tool-result";
}
const CARD = {
	border: "1px solid #e5e7eb",
	borderRadius: 10,
	background: "#ffffff",
	overflow: "hidden",
	margin: "4px 0"
};
const HEADER = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	padding: "8px 12px",
	borderBottom: "1px solid #f0f0f0"
};
const TITLE = {
	fontSize: 13,
	fontWeight: 600,
	color: "#111827",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
};
const MUTED = {
	fontSize: 12,
	color: "#6b7280"
};
const BODY = {
	padding: 8,
	background: "#ffffff"
};
const BUTTON = {
	border: "1px solid #d1d5db",
	borderRadius: 6,
	background: "#f9fafb",
	color: "#111827",
	fontSize: 12,
	padding: "4px 10px",
	cursor: "pointer"
};
function RunningCard() {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: CARD,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: HEADER,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: TITLE,
				children: "Diagram"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: MUTED,
				children: "Generating..."
			})]
		})
	});
}
function ErrorCard({ message }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: CARD,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: HEADER,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: TITLE,
				children: "Diagram"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: MUTED,
				children: "Failed"
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: BODY,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: MUTED,
				children: message
			})
		})]
	});
}
function DiagramCard(props) {
	const { metadata, theme, onOpen } = props;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: CARD,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: HEADER,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: TITLE,
				children: "Diagram: " + metadata.title
			}), onOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				style: BUTTON,
				onClick: onOpen,
				children: "Open in panel"
			}) : null]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: BODY,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiagramView, {
				diagram: metadata.diagram,
				title: metadata.title,
				theme
			})
		})]
	});
}
/** Keyed atomic tool view for the render_diagram tool. */
function RenderDiagramToolview(props) {
	const { block, sessionId, useSession } = props;
	const settings = (0, react.useSyncExternalStore)(artifactSettings.subscribe, artifactSettings.getSnapshot, artifactSettings.getSnapshot);
	const autoOpenedRef = (0, react.useRef)(null);
	const nodes = useSession((s) => s.nodes);
	const groups = (0, react.useMemo)(() => listArtifactVersionGroups(nodes), [nodes]);
	let settledResult = null;
	let isError = false;
	let metadata = null;
	let version;
	if (isSettled(block)) {
		settledResult = block;
		isError = block.isError;
		if (!block.isError) {
			metadata = parseDiagramPresentationMetadata(block.meta);
			if (metadata) {
				const meta = metadata;
				const group = groups.find((g) => g.artifactId === meta.artifactId);
				version = group?.versions.find((v) => v.seq === block.seq)?.version ?? selectLatestArtifactVersion(group)?.version;
			}
		}
	}
	(0, react.useEffect)(() => {
		if (settledResult === null || isError) return;
		if (metadata === null || version === void 0) return;
		if (!settings.autoOpen) return;
		const key = sessionId + ":" + metadata.artifactId + ":" + settledResult.seq;
		if (autoOpenedRef.current === key) return;
		autoOpenedRef.current = key;
		artifactController.openArtifact(sessionId, metadata.artifactId, version);
	}, [
		settledResult,
		isError,
		metadata,
		version,
		settings.autoOpen,
		sessionId
	]);
	if (settledResult === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunningCard, {});
	if (isError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorCard, { message: settledResult.error?.name ?? "The diagram tool failed" });
	if (metadata === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorCard, { message: "The diagram result is not valid" });
	const artifactId = metadata.artifactId;
	const resolvedVersion = version;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiagramCard, {
		metadata,
		theme: settings.theme,
		onOpen: resolvedVersion === void 0 ? void 0 : () => artifactController.openArtifact(sessionId, artifactId, resolvedVersion)
	});
}

//#endregion
//#region src/client/turn-tail.tsx
const ROW = {
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
	margin: "4px 0"
};
const LABEL = {
	fontSize: 12,
	fontWeight: 600,
	color: "#6b7280"
};
const CHIP = {
	border: "1px solid #d1d5db",
	borderRadius: 999,
	background: "#f9fafb",
	color: "#111827",
	fontSize: 12,
	padding: "3px 10px",
	cursor: "pointer",
	maxWidth: 220,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap"
};
/** Compact turn-tail row listing the diagrams produced in the turn. */
function TurnTailCard({ matched, sessionId, useSession }) {
	const nodes = useSession((s) => s.nodes);
	const groups = (0, react.useMemo)(() => listArtifactVersionGroups(nodes), [nodes]);
	const artifacts = (0, react.useMemo)(() => {
		const seen = /* @__PURE__ */ new Set();
		const result = [];
		for (const occurrence of matched) {
			if (seen.has(occurrence.metadata.artifactId)) continue;
			seen.add(occurrence.metadata.artifactId);
			const latest = selectLatestArtifactVersion(groups.find((g) => g.artifactId === occurrence.metadata.artifactId))?.version;
			if (latest === void 0) continue;
			result.push({
				artifactId: occurrence.metadata.artifactId,
				title: occurrence.metadata.title,
				latestVersion: latest
			});
		}
		return result;
	}, [matched, groups]);
	if (artifacts.length === 0) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: ROW,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: LABEL,
			children: "Diagrams"
		}), artifacts.map((artifact) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			style: CHIP,
			title: artifact.title + " (v" + artifact.latestVersion + ")",
			onClick: () => artifactController.openArtifact(sessionId, artifact.artifactId, artifact.latestVersion),
			children: artifact.title + " v" + artifact.latestVersion
		}, artifact.artifactId))]
	});
}

//#endregion
//#region src/client/index.tsx
/** Browser-side Cordis service dependencies. */
const inject = [
	"conversationEvents",
	"slots",
	"sessions"
];
/** Register durable diagram-artifact state and the three UI surfaces. */
function apply(ctx) {
	const sessions = ctx.get("sessions");
	ctx.conversationEvents.register(diagramArtifactsDefinition);
	ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
		name: "tool.call.toolview",
		key: "render_diagram"
	}, RenderDiagramToolview));
	ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
		name: "conversation.chat.turnTail",
		select: selectDiagramArtifacts
	}, TurnTailCard));
	ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		name: "shell.overlay",
		id: "dsh-artifacts",
		order: 50,
		label: "Artifacts",
		inject: () => ({
			controller: artifactController,
			getSession: (id) => sessions.binding(id)?.session,
			getCurrentSessionId: () => sessions.list.getSnapshot().current,
			subscribeSessions: (fn) => sessions.list.subscribe(fn)
		})
	}, ArtifactOverlay));
}

//#endregion
exports.ArtifactController = ArtifactController;
exports.ArtifactOverlay = ArtifactOverlay;
exports.DEFAULT_TONE = DEFAULT_TONE;
exports.DiagramView = DiagramView;
exports.RenderDiagramToolview = RenderDiagramToolview;
exports.TONE_PALETTES = TONE_PALETTES;
exports.TurnTailCard = TurnTailCard;
exports.apply = apply;
exports.artifactController = artifactController;
exports.artifactSettings = artifactSettings;
exports.buildFilename = buildFilename;
exports.copyText = copyText;
exports.createArtifactController = createArtifactController;
exports.createArtifactSettings = createArtifactSettings;
exports.diagramArtifactsDefinition = diagramArtifactsDefinition;
exports.downloadBlob = downloadBlob;
exports.downloadPng = downloadPng;
exports.downloadSvg = downloadSvg;
exports.findArtifactVersion = findArtifactVersion;
exports.inject = inject;
exports.layoutDiagram = layoutDiagram;
exports.listArtifactVersionGroups = listArtifactVersionGroups;
exports.makeSvgBlob = makeSvgBlob;
exports.resolveTheme = resolveTheme;
exports.sanitizeFilename = sanitizeFilename;
exports.selectDiagramArtifacts = selectDiagramArtifacts;
exports.selectLatestArtifactVersion = selectLatestArtifactVersion;
exports.serializeSvgElement = serializeSvgElement;
return module.exports; } });
//# sourceMappingURL=client.js.map