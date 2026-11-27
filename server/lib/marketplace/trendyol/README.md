# Trendyol International adapter

Scope is the International Marketplace for Germany (`storeFrontCode: DE`). Turkey domestic APIs are not called. Product create uses Product V2. Order read uses Order V2 (`/v2/orders`). The deprecated V1 order path is not built.

Live HTTP is impossible from this module: a caller must inject a transport, and the default transport does not exist. `BUZZARD_SALES_ENABLED` is not switched on. Credentials are read from the environment and are omitted from health output and logs.

Official reference: https://developers.trendyol.com/v3.0/

Stage host: `https://stageapigw.trendyol.com`  
Production host: `https://apigw.trendyol.com`

Auth is HTTP Basic plus `User-Agent: {sellerId} - {integrator}` and header `storeFrontCode`.
