# Inter Cars Production Access

1. Obtain legitimate Inter Cars production OAuth2/API access.
2. Store the credential in the deployment Secret Manager.
3. Expose only SUPPLIER_LIVE_CREDENTIALS_SECRET_REF to the application.
4. Set SUPPLIER_LIVE_PROFILE=inter-cars.
5. Keep network/order flags OFF by default.
6. Run the configuration preflight.
7. Only then allow controlled Stage A.
8. Never print or persist the secret value.
