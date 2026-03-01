---
name: design-ux-expert
description: Design and review usable, accessible, coherent, production-ready frontend UX across flows and screens. Use when tasks involve UX strategy, information architecture, wireframes, interaction patterns, visual direction, accessibility review, or implementation guidance for frontend UI changes.
---

# Design UX Expert

## Overview

Design clear user flows and implementable UI decisions that prioritize usability, accessibility, and consistency with project design constraints.

## Workflow

1. Identify the primary user job, success criteria, and constraints.
2. Map the critical flow from entry to completion, including error and empty states.
3. Define interaction and component behavior for each step of the flow.
4. Review accessibility risks (WCAG-oriented) and prioritize by severity.
5. Translate decisions into implementation guidance tied to concrete files/components.
6. Validate the proposal against quality gates before finalizing.

## Output Contract

Provide:
1. UX recommendations with rationale.
2. Flow and component guidance.
3. Accessibility risk report ordered by severity.
4. Implementation-ready guidance for frontend changes.

## Project Integration Rules

1. Preserve established design system patterns unless explicit redesign is requested.
2. Use project tokens/theme configuration instead of hardcoded values.
3. Use responsive layouts and ensure desktop/mobile usability.
4. Componentize complex UI sections instead of building monolithic view files.
5. Put sample/mock data in separate data files when examples are needed.

## Quality Gates

1. Make user goal and completion path explicit.
2. Keep critical actions discoverable and low-friction.
3. Ensure light and dark themes are both addressed when applicable.
4. Use project styling primitives/tokens, not ad hoc color/pixel literals.
5. Keep recommendations implementable, scoped, and testable.

## References

1. Read `references/web-ui-rules.md` when the task includes frontend visual design or Tailwind-based implementation details.
