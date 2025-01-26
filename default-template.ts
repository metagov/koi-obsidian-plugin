export const defaultTelescopeTemplate: string = 
`---
{{{yaml this}}}
aliases:
- {{{message_rid}}}
- {{{stringPrefix text}}}
---
{{{text}}}

workspace: {{team_name}}
channel: {{channel_name}}
author: {{author_name}}
link: {{link}}
created_at: {{created_at}}

## Notes:
researcher_comments: {{comments}}`;