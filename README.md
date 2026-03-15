# HealthMonitor — Stream Deck Plugin

A Stream Deck plugin that monitors the health of a service endpoint and displays its status directly on a button.

## Features

- Polls a URL on a configurable interval
- **Green** background when the endpoint returns `200 OK`
- **Red** background on error or non-200 response
- Shows how many seconds ago the last check was done
- Optional custom title per button

## Development

### Prerequisites

- Node.js 20+
- [Stream Deck](https://www.elgato.com/downloads) 6.9+
- [Stream Deck CLI](https://github.com/elgato/cli): `npm install -g @elgato/cli`

### Setup

```bash
npm install
```

### Watch mode (auto-rebuild + restart plugin)

```bash
npm run watch
```

### Build

```bash
npm run build
```

### Package for distribution

```bash
streamdeck pack com.3uma.healthmonitor.sdPlugin
```

This produces `com.3uma.healthmonitor.streamDeckPlugin` in the project root.

## Installation

Double-click `com.3uma.healthmonitor.streamDeckPlugin` — Stream Deck will install it automatically.

## Configuration

Each button exposes the following settings in the property inspector:

| Setting | Description |
|---|---|
| **Title** | Optional label shown on the button above the status |
| **Path** | The URL to poll (e.g. `https://example.com/health`) |
| **Interval (ms)** | How often to poll in milliseconds (1000–60000) |
