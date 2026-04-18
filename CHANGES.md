# Changes

## 2026-04-19

### Similar problem generation hardening

- Reworked `app/api/similar/route.ts` into a staged pipeline:
  draft generation -> verification -> solution generation.
- Added automatic retry logic for similar-problem generation failures.
- Added server-side KaTeX validation so malformed LaTeX is rejected before rendering.
- Added automatic repair for common broken LaTeX commands such as `?rac`, `�rac`, `frac`, `rac`, and similar corruption patterns.
- Applied sanitization to generated problem text, verified answers, and final solutions before final validation.

### Goal

- Reduce frequent red-text math rendering failures in the similar-problem flow.
- Catch invalid math earlier on the server and recover automatically when possible.
