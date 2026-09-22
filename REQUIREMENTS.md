# Prado Waystone Map Lab — Requirements

## Runtime

- Node.js **22 or newer**
- A modern browser with ES module support, such as current Chrome, Edge, Firefox, or Safari
- No npm packages or build toolchain are required to run the demo
- A local network interface for `127.0.0.1` and an available TCP port (default: `4173`)

## Supported operating systems

The repository is intended for Windows, macOS, and Linux environments with Node.js installed. Windows users can run `start.ps1`; all platforms can run `node server.mjs` from the repository root.

## Browser capabilities

The browser must support:

- JavaScript ES modules
- `localStorage`
- `structuredClone`
- `crypto.getRandomValues`
- SVG rendering and standard responsive CSS

The demo is designed for desktop and mobile layouts. Chrome is the reference browser used for visual checks.

## Storage and privacy

The server is local-only and binds to `127.0.0.1`. The application stores generator profiles and run sessions in the browser’s local `localStorage`; it does not require an account, backend, database, or external service. The official Waystone source links in the deck editor open external pages only when selected by the user.

## Optional development tools

These are not needed for normal use:

- Git, for cloning and updating the repository
- GitHub CLI (`gh`), for inspecting Actions runs
- Chrome, for the reference visual QA workflow

## Port and deployment notes

Set `PORT` before starting the server to use another local port:

```powershell
$env:PORT = 4300
node server.mjs
```

The included server is a development and demonstration server. It serves the repository’s HTML, JavaScript, CSS, SVG, and JSON assets and is intentionally bound to localhost. A public deployment needs a separate static hosting or reverse-proxy configuration and should preserve the browser-side storage model.
