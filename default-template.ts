export const defaultTelescopeTemplate: string = 
`---
{{{yaml this}}}
aliases:
- {{{message_rid}}}
- {{{stringPrefix 50 text}}}
---
{{{parseUsers "[[/users/$userId|@$userName]]" text}}}

workspace: {{team_name}}
channel: {{channel_name}}
author: {{author_name}}
link: {{link}}
created_at: {{created_at}}

[[pointers/{{obsidian_filename}}|link to note]]
## Notes:
researcher_comments: {{comments}}`;