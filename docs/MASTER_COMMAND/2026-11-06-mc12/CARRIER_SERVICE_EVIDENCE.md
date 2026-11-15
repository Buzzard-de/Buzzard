# Service evidence ladder

Statuses: UNKNOWN=0, REGISTER_ONLY=1571, ACTIVE_BUSINESS_VERIFIED=31, PARCEL_SERVICE_VERIFIED=0, LAST_MILE_VERIFIED=0, OWN_FLEET_VERIFIED=0, SUBCONTRACTOR_NETWORK_VERIFIED=0, API_DOCUMENTED=0, SANDBOX_VERIFIED=0, LIVE_CONTRACT_READY=0.

- REGISTER_ONLY includes postal licences, USP rows, ACM/EETT/UKE classes.
- ACTIVE_BUSINESS_VERIFIED follows prior activityVerified / networkRole flags, not parcel proof.
- PARCEL_SERVICE_VERIFIED / LAST_MILE / OWN_FLEET / SUBCONTRACTOR / SANDBOX / LIVE remain 0 unless a field is explicitly that status.
- Website mention of shipping is not used as own-fleet proof.
- International brand×country ops (64) are not nationwide own-fleet proof.
