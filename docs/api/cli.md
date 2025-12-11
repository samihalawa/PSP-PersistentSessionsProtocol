# CLI Reference

The `@samihalawa/psp-cli` package provides the terminal interface.

## Commands

### `psp` (Default)
Starts the interactive wizard.
- Scans for Google Chrome, Brave, and Edge profiles.
- Prompts user for selection.
- Extracts data and syncs to `PSP_SERVER_URL`.

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PSP_SERVER_URL` | The URL of the PSP Server to sync to. | `http://localhost:3000` |

## Installation

```bash
npm install -g @samihalawa/psp-cli
```
