# RadarFlow Demo App

A sample Node.js application instrumented with `@radarflow/sdk` to demonstrate real-time telemetry emission, error capturing, and incident simulation.

## Scripts

```bash
# Run baseline normal traffic
npm run demo:traffic

# Simulate database connection pool saturation incident
npm run demo:incident
```

## Configuration

Set environment variables in `.env` or pass them directly:

```env
RADARFLOW_API_KEY=rf_live_radarflow_master_key_1042
RADARFLOW_ENDPOINT=http://localhost:3000
```
