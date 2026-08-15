# Architecture

```text
                    Buzzard AI
                        |
                    Aslan Bey
                  /     |      \
             Doğu Bey  Memory   Esat Bey
                |        |         |
             Research  SQLite   Security
                \        |         /
                 ---- Event Bus ----
```

The shared SQLite database is the initial coordination boundary. Agents are separate Python modules and communicate through task records, memory and events. This makes later replacement with a message broker or external database possible without changing the agent roles.
