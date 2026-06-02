---
project: SocialPilot
type: SaaS Platform — AI Social Media Management
stack: React 18 + TypeScript + Vite + Tailwind + 
       TanStack Query + Hono.js + PostgreSQL + 
       Drizzle ORM + Claude AI (Anthropic)
agency: Roy AI Agency (single private agency, 
        no sub-agencies)

skills:
  routing: true
  gstack: ~/.claude/skills/gstack

context: |
  SocialPilot is an AI-powered social media 
  management platform. It handles inbound DMs, 
  public comments, chatbot flows, content 
  scheduling, WhatsApp campaigns, social 
  listening, and client analytics.
  
  The platform uses a 3-tier AI confidence 
  system (≥85% auto-send, 50-84% review queue, 
  <50% escalate). Knowledge Base feeds every 
  Claude AI call. Single agency (Roy AI Agency) 
  manages multiple client businesses.

  Phase 2 fixes are complete. Platform is 
  post-audit with 12 confirmed fixes applied.
---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
