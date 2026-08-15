from buzzard_ai_complete.database.db import init_db
from buzzard_ai_complete.core.registry import AgentRegistry

def main():
    init_db(); r=AgentRegistry()
    r.register('dogu_bey','Uzman İstihbarat ve Araştırma AI')
    r.register('aslan_bey','Müsteşar / AI Operasyon ve İstihbarat Koordinatörü')
    r.register('esat_bey','AI Siber Güvenlik ve Savunma Uzmanı')
    print('Buzzard AI setup complete.')
if __name__=='__main__': main()
