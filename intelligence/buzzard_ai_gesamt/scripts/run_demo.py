from buzzard_ai_gesamt.database.db import init_db
from buzzard_ai_gesamt.agents.aslan_bey import AslanBey
from buzzard_ai_gesamt.agents.esat_bey import EsatBey
init_db(); a=AslanBey(); tid=a.create_research_task('Buzzard demo','Inspect an official public URL','NORMAL')
print('Created task',tid); EsatBey().record('INFO','SYSTEM','Demo initialized')
