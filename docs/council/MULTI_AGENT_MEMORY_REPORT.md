# Multi-Agent Memory

Code: `server/lib/buzzardNative/core/multiMemory.js`.  
Does not replace `memory/characterStore.js` (still four names). New eight-namespace store.

Namespaces: memory/sinan/, memory/esat/, memory/dogu/, memory/amelia/, memory/adrian/, memory/mira/, memory/leon/, memory/pusat/.

Types: identity, personal, task, decision, project, conversation, shared_knowledge.

Measured:

- Sinan personal get by Esat → MEMORY_ISOLATION_DENIED
- Mira personal get by Amelia → MEMORY_ISOLATION_DENIED
- Sinan personal get by Pusat → MEMORY_ISOLATION_DENIED
- SHA-256 integrity on payload; tamperDetect returns detected=true on mutated bytes
- restore(version=1) after v2 write returns original value
- Access attempts written to in-process audit array
- Classification: IN_PROCESS_TESTED. Not offsite. Not encrypted at rest in this module (Phase 4 AES still in characterStore/sinanMemory).

Pusat may receive task reports via the bus; that is not a dump of private memory.
