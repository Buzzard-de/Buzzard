# Performance and scalability

No load test of 27-country live traffic was run. Prior vitest suite remains the evidence.

Design: adapter isolation per call, country configs in-memory, webhook Map (process-local — not clustered). Do **not** infer production QPS from mock tests.

Catalog size 1602 named + 17 API docs is trivial in-process. Register-layer 17453 is census, not a live query path.
