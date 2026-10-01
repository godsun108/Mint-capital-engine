# Personal Command Center — Notion-Compatible Prototype v0.1

Status: PROTOTYPE / NOT FOR SALE. Original, interoperable Markdown and CSV starter; no claim of a hosted Notion duplicate link or completed Notion API integration.

## Import
1. In Notion, create a new page named Personal Command Center.
2. Import `Projects.csv` and `Actions.csv` as separate databases (CSV import). Check date and status property types after import.
3. Import or paste `Dashboard.md` as the overview.
4. Optionally add a Relation property in Actions to Projects and manually link matching Project ID values; CSV import alone does not establish relations.
5. Test mobile views and filter Actions by Today / This Week. No automated synchronization is included.

## QA before promotion
- Check CSV encoding, rows, headings, dates and import behavior in a real authorized Notion workspace.
- Verify relation and rollup instructions, accessible language, example records and empty-state use.
- Obtain independent review, user feedback and owner approval before catalog activation.
