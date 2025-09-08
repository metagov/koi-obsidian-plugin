export const DEFAULT_KOI_NET_NODE_TEMPLATE = `\`\`\`
---
base_url: {{base_url}}
node_type: {{node_type}}
provides_event: {{provides.event}}
provides_state: {{provides.state}}
public_key: {{public_key}}
---
\`\`\``;

export const DEFAULT_KOI_NET_EDGE_TEMPLATE = `\`\`\`
---
{{{yaml this}}}
---
source_link: "[[{{{linkTo source false}}}]]"
target_link: "[[{{{linkTo target false}}}]]"
\`\`\`
`;

export const DEFAULT_OBSIDIAN_NOTE_TEMPLATE = `\`\`\`
---
{{{yaml frontmatter}}}
path: {{path}}
---
\`\`\`
{{{text}}}`;

export const DEFAULT_TELESCOPED_TEMPLATE = `\`\`\`
---
{{{yaml this}}}
---
\`\`\`
{{{text}}}
## Notes:
researcher_comments: {{comments}}`;

export const DEFAULT_TABLE = {
    'koi-net.node': DEFAULT_KOI_NET_NODE_TEMPLATE,
    'koi-net.edge': DEFAULT_KOI_NET_EDGE_TEMPLATE,
    'obsidian.note': DEFAULT_OBSIDIAN_NOTE_TEMPLATE,
    'telescoped': DEFAULT_TELESCOPED_TEMPLATE
}