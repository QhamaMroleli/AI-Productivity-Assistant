<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- AI calls go through `src/lib/ai.server.ts` (streamed Responses API, server-only) and authenticated server functions in `src/lib/ai.functions.ts`; keeps keys server-side and enforces auth.
- Each AI tool has its own system prompt + strict JSON schema in `src/lib/prompts.ts`; keeps prompt engineering in one reviewable place.
- Pages wrap themselves in `AppShell` (auth guard + sidebar) instead of a layout route; avoids duplicate "/" claimants.
- User data lives in `tasks` and `ai_records` (kind-tagged) with owner-only RLS; one generic history table keeps every tool's saved output uniform.
