def health(db):
    db.execute('SELECT 1'); return {'database':'ok','service':'ok'}
