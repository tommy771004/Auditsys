# Webwright fixtures

This folder contains committed sample artifacts that match the browser collector contract.

## Sample run

Use `./fixtures/webwright/sample-run` as `WEBWRIGHT_WORKSPACE_DIR` to demo the pipeline without running an external browser agent first.

Expected artifact names in a run directory:
- `report.json`
- `task.json`
- `trajectory.json` or `trace.json`
- files under `logs/`
- optional screenshot paths referenced from `report.json` sources

The collector prefers explicit environment paths when provided, and otherwise auto-discovers artifacts from the run directory.

## Contract shape

The current parser normalizes these fields into the browser collector contract.

### task.json

- `id` or `task_id` or `taskId`
- `instruction` or `task` or `prompt` or `title`
- `start_url` or `startUrl` or `url`

### report.json

- `generated_at` or `generatedAt`
- `sections[]` or `result_sections[]` or `results[]` or `items[]`
- `sections[].title` or `heading` or `label`
- `sections[].summary` or `description` or `result` or `text`
- `sections[].steps[]`
- `sources[]` or `pages[]`
- `sources[].url` or `href`
- `sources[].title` or `label` or `name`
- `sources[].screenshot` or `screenshot_path`
- `sources[].notes[]`

### trajectory.json

- `steps[]` or `events[]` or `timeline[]`
- `steps[].action` or `type` or `name`
- `steps[].target` or `selector`
- `steps[].url` or `href`
- `steps[].status` or `result`

If a report uses the contract fields above, the collector, synthesis layer, and report UI can ingest the run without additional mapping code.
