import { defineTool } from "@deepseek-ai/dsh-tools";
import "@deepseek-ai/dsh-system-prompt";

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

//#endregion
//#region src/index.ts
const inject = ["tools", "systemPrompt"];
const RENDER_DIAGRAM_PROMPT = [
	"Use render_diagram when the user explicitly asks for a diagram or when the structure genuinely benefits from one; skip it for trivial answers.",
	"Choose a stable, session-local artifactId. Every update must repeat that artifactId and provide a complete replacement diagram specification.",
	"In the final prose, briefly mention the Artifact and do not repeat its JSON."
].join(" ");
function createRenderDiagramTool() {
	return defineTool({
		name: "render_diagram",
		description: "Create or update a safe diagram Artifact shown in DSH Web.",
		parameters: DIAGRAM_ARTIFACT_SCHEMA.properties,
		output: {
			schema: DIAGRAM_ARTIFACT_SCHEMA,
			render(_args, value) {
				return [{
					type: "text",
					text: `Diagram Artifact “${value.title}” is ready.`
				}];
			},
			presentationMeta(_args, value) {
				return {
					schemaVersion: 1,
					kind: "diagram-artifact",
					...value
				};
			}
		},
		isConcurrencySafe() {
			return true;
		},
		async execute(args) {
			return normalizeDiagramArtifact(args);
		}
	});
}
function apply(ctx) {
	ctx.systemPrompt.section({
		name: "ui:diagram-artifacts",
		order: 185,
		text: RENDER_DIAGRAM_PROMPT
	});
	ctx.tools.register(createRenderDiagramTool());
}

//#endregion
export { RENDER_DIAGRAM_PROMPT, apply, createRenderDiagramTool, inject };
//# sourceMappingURL=index.js.map