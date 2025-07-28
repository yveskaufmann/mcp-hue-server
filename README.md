# Phillips Hue MCP Server

A Model Context Protocol (MCP) server for controlling Phillips Hue lights via natural language.

**Disclaimer:** This is a small hobby project and not an official Phillips Hue product. It is provided as-is without any guarantees.

## Features

This server provides an interface to control your Phillips Hue lights using natural language processing through the Model Context Protocol. It connects to your Hue Bridge and allows you to:

- Turn individual lights on and off
- Control all lights in a room at once
- List all available lights and rooms

## Installation

### Prerequisites

- Node.js (v18+)
- A Phillips Hue Bridge on your local network
- Phillips Hue lights set up with your bridge

### Setup

1. Clone the repository
2. Install dependencies

```bash
npm install
```

## Environment Variables

The server uses the following environment variables:

| Variable               | Description                                                                                                                                                                                                | Required | Default                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| `HUE_BRIDGE_IP`        | IP address of your Hue Bridge                                                                                                                                                                              | No       | Auto-discovered via DNS-SD          |
| `HUE_USERNAME`         | Username (API key) for your Hue Bridge. During initial setup, if not provided, the server will automatically register a new user on the bridge (requires pressing the physical link button on the bridge). | No       | Stored in `~/.hue-credentials.json` |
| `HUE_CREDENTIALS_PATH` | Custom path to store credentials                                                                                                                                                                           | No       | `~/.hue-credentials.json`           |

## Creating Initial Hue User

Before using the server, you need to create a user on your Hue Bridge. The server will attempt to do this automatically on first run:

1. If you don't provide the `HUE_USERNAME` environment variable, the server will automatically try to register a new user on the bridge
2. Find your Hue Bridge IP (or let the server auto-discover it via DNS-SD)
3. Press the link button on your Hue Bridge (the physical button on the device)
4. Start the server within 30 seconds of pressing the button
5. The server will automatically create and store credentials in `~/.hue-credentials.json` (or the path specified in `HUE_CREDENTIALS_PATH`)

The registered username will then be used for all subsequent API calls to control your lights and rooms.

If you have issues with automatic setup, you can manually create a user by following the [Hue API Getting Started guide](https://developers.meethue.com/develop/get-started-2/).

## Available Tools

The server exposes the following MCP tools:

| Tool Name           | Description                   | Parameters                                       |
| ------------------- | ----------------------------- | ------------------------------------------------ |
| `turnLightOn`       | Turn on a specific light      | `name` (string)                                  |
| `turnLightOff`      | Turn off a specific light     | `name` (string)                                  |
| `listAllLights`     | List all available lights     | None                                             |
| `listAllRooms`      | List all available rooms      | None                                             |
| `turnRoomLightsOn`  | Turn on all lights in a room  | `name` (string), `brightness` (number, optional) |
| `turnRoomLightsOff` | Turn off all lights in a room | `name` (string)                                  |

## Running the Server

You can start the server using:

```bash
npm start
```

Or with the provided Makefile:

```bash
make start
```

## Using with VS Code

To use this server with VS Code, add it to your `.vscode/mcp.json` file:

```jsonc
{
  "servers": {
    "hue-mcp-server": {
      "type": "stdio",
      "command": "npm",
      "args": ["start"],
      "cwd": "/path/to/mcp-hue-server"
    }
  },
  "inputs": []
}
```

Alternatively, if you're using the Makefile:

```jsonc
{
  "servers": {
    "hue-mcp-server": {
      "type": "stdio",
      "command": "make",
      "args": ["start"]
    }
  },
  "inputs": []
}
```

## Example Usage

Once the server is running, you can use natural language commands with any MCP-compatible client:

- "Turn on the living room lights"
- "Turn off the kitchen light"
- "List all available lights"
- "What rooms do I have?"
- "Schalte alle Lichter im Arbeitszimmer an" (German: Turn on all lights in the work room)

## Development

To build the project:

```bash
npm run build
```

To run tests:

```bash
npm test
```

## License

MIT
