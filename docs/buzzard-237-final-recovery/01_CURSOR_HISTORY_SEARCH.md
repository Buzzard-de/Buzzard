# Cursor history search

Search date: 22 November 2026, evening Europe/Berlin.

This search used Cursor cloud transcripts that this environment can read. It did not repeat the git archaeology from `docs/buzzard-237-original-recovery/`.

## What was readable

Two desktop-source agents exist in this environment for 1 August 2026 through 14 October 2026, 13:00 Europe/Berlin. Both transcripts were retrieved and searched.

| Agent | Source | Created (Europe/Berlin) | Transcript | Result |
|---|---|---|---|---|
| [German language request](https://cursor.com/agents/bc-a02d07fa-e72e-400c-892f-ce9921a3c293) `bc-a02d07fa-e72e-400c-892f-ce9921a3c293` | desktop | 8 August 2026, 19:44 | 290,625,097 bytes; 152,217 messages; 1,922 user messages | The directive that ordered work on items 1–237 is user message index 106849. |
| [Devam eden iş](https://cursor.com/agents/bc-5a736bb9-872f-4c79-8e70-884740494be7) `bc-5a736bb9-872f-4c79-8e70-884740494be7` | desktop | 10 October 2026, 11:16 | 75,267,826 bytes; 33,245 messages; 330 user messages | No 237-item checklist. A later tool result quotes pull-request title 430, “237-item execution register…”. |

Twelve cloud agents created 10–12 October 2026 (Europe/Berlin) were also fetched. Eleven are internal audit or inventory runs. Their transcripts contain no `237 tasks`, `237 master tasks`, `237 maddelik`, `Item 237`, or `BUZZARD_237` checklist. The twelfth is the desktop chat above.

Agents created from 13 October 2026 00:00 UTC through 19 October 2026 00:00 UTC: 0 in this environment.

Local Cursor state on this machine: no `state.vscdb` and no chat database under `/home/ubuntu/.cursor` or `/home/ubuntu/.cursor-server`. A phrase search of `/home/ubuntu/.cursor` did not find the checklist phrases.

## The creating message

User message index 106849 begins:

`BUZZARD MASTER AUTONOMOUS SOFTWARE COMPLETION DIRECTIVE`
`237/237 ITEMS — STRICT ORDER — CONTINUOUS EXECUTION — EVIDENCE-BASED 100%`

The message tells the agent to locate an existing master checklist of 237 items and not to replace it with a newly invented list. Section B says: if the canonical checklist cannot be located, do not reconstruct missing items from memory.

Section C is headed `REQUIRED MASTER COVERAGE — ITEMS 1–237`. It gives fourteen range sentences, from items 1–19 through items 227–237. The same section says these categories are navigation aids, not replacements for the original items, and that they are not the full acceptance criteria.

The message lists the words `ITEM 1`, `ITEM 2`, `ITEM 3`, and `ITEM 237` as the execution order. It does not attach a title, a description, or acceptance criteria to any item number.

The following user message, index 107156, says to continue from HEAD `4b0ce17` on `cursor/software-completion-local-c293`. That is the register-creation point already identified. This transcript has no per-message clock, so the message itself is dated by that following reference.

Later user messages in the same chat ask for the full name and acceptance criteria of item 205, and on 16 October 2026 order a forensic search because the original checklist had been reported missing. A short paste at message index 122595 says the numbered master list and original acceptance criteria were not in the repository, so the titles could not be stated completely. That paste does not supply the missing titles.

## Phrases searched

`237 tasks`, `237 master tasks`, `Buzzard master execution plan`, `Software completion`, `Master checklist`, `237 maddelik görev listesi`, `237 görev`, `Item 1 - Item 237`, `BUZZARD_237`, `canonical numbered`, `directive section C`.

`Software completion` and `master checklist` occur many times as later work orders. They do not contain a numbered list of 237 original titles.

## Not searched, and not claimed as searched

- Cursor chats that live only in the desktop application database on the user’s own computer. That database is not mounted here.
- Internal explore agents from August and September 2026 beyond the first page of 20 names. Those names are explore jobs (`Explore payment modules`, `Explore production gaps`, and similar). Their transcripts were not downloaded. Desktop, web, Slack, and Linear agents in the same window were fully listed: total 2, both searched.
- Any Cursor account or project outside this environment.

## Classification of the creating message

| Field | Value |
|---|---|
| Name | User message index 106849 in `bc-a02d07fa-e72e-400c-892f-ce9921a3c293` |
| Location | https://cursor.com/agents/bc-a02d07fa-e72e-400c-892f-ce9921a3c293 |
| Source type | Cursor desktop cloud transcript |
| Date | The chat started 8 August 2026, 19:44 Europe/Berlin. The message sits immediately before the follow-up that names HEAD `4b0ce17`. |
| Task count inside the message | 237 numbers are named. Individual titles: 0. |
| Original checklist? | It refers to a checklist it expected to find. The checklist text is not in the message. |
| Copy? | No. This is the instruction that later produced the generated register. |
| Incomplete? | Yes. Titles, descriptions, and acceptance criteria for items 1–237 are absent. |
| Reliability | High for the words the user wrote. Those words explicitly separate the range sentences from the original items. |
