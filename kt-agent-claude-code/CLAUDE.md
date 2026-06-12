# KT Agent Project

This project contains a Claude Code sub-agent that generates Knowledge Transfer
documents for Spring Boot microservices.

## Available agents

- `@kt-agent` — Discovers Spring Boot services in a GitHub repo and generates
  a Word KT document for each one

## Quick start

```
@kt-agent analyse my-org/my-backend-repo
```

## Project structure

```
.claude/
  agents/
    kt-agent.md          ← the agent definition (this is what @kt-agent loads)
templates/
  kt_document_template.md  ← JSON schema Claude must follow for the analysis
  doc_generator.js         ← Node.js script that turns JSON → Word document
output/
  KT_*.docx               ← generated documents appear here
CLAUDE.md                 ← this file (auto-loaded by Claude Code)
mcp.json                  ← GitHub MCP server configuration
.env.example              ← copy to .env, add your tokens
```

## MCP tools available

The GitHub MCP server is configured in `mcp.json`.
Claude Code will use these tools automatically:
- `mcp__github__get_file_contents` — read any file or directory in a repo
- `mcp__github__search_code` — find files by annotation or pattern
- `mcp__github__get_repository` — repo metadata
- `mcp__github__list_commits` — recent commit history

## Secrets

Set these in your environment or in a `.env` file:

```
GITHUB_TOKEN=ghp_your_token_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

Never commit `.env` to version control.
