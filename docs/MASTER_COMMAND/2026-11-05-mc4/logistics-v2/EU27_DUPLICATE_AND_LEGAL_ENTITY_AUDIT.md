# Duplicate and legal-entity audit

Brand collisions (same brand, multiple ids; expected for country affiliates and candidate rows):

- bpost: usp-be, fr-bpost
- postnord: usp-se, cand-v2-postnord
- dpd: de-dpd, cand-v2-dpd
- gls: de-gls, cand-v2-gls
- dhl express: de-dhl-express, dk-dhl
- ups: de-ups, dk-ups, cand-v2-ups
- dao: dk-dao, cand-v2-dao
- bring: dk-bring, cand-v2-bring
- fedex: dk-fedex, cand-fedex-group, cand-v2-fedex
- inpost: cand-inpost, cand-v2-inpost
- packeta: cand-packeta, cand-v2-packeta
- amazon logistics: cand-amazon, cand-v2-amazon-logistics
- mondial relay: cand-mondial, cand-v2-mondial-relay
- colis privé: fr-colis-priv, cand-v2-colis-priv

Parent/affiliate: USP and local affiliate rows are separate legal ids when registers name them separately (example: usp-be vs fr-bpost).
