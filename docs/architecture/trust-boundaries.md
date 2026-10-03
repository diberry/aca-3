# Trust boundaries

```mermaid
flowchart LR
    Browser[Browser]

    subgraph Public["Public boundary"]
        Shell["Auth / Shell ACA<br/>only public ingress"]
    end

    subgraph Internal["Internal Container Apps boundary"]
        Author["Author ACA<br/>runtime microfrontend"]
        Backend["Backend ACA<br/>internal API"]
    end

    Browser -->|"HTTPS; auth session; same origin"| Shell
    Shell -->|"/mfe/author/*<br/>managed identity<br/>Author audience"| Author
    Shell -->|"/api/*<br/>managed identity<br/>Backend audience"| Backend
    Author -->|"Stage 3 service call<br/>managed identity<br/>Backend audience"| Backend
```

## Invariants

- Only Auth/Shell is publicly reachable.
- Protected browser traffic remains on the Auth/Shell origin.
- No public environment route targets Author or Backend.
- Author and Backend validate distinct intended audiences and authorized callers.
- Trusted identity and proxy headers are stripped and recreated from trusted state.
- Authorization is server-side; hidden UI is not authorization.
- Local credentials are disabled unless an explicit local-only gate is active.
