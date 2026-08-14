# Current connection status

The connector code is real and uses documented API endpoints.

Live access cannot be activated from this package alone because the required credentials belong to the Buzzard account/app:
- eBay Client ID + Client Secret
- Amazon Creators API credentials + Partner Tag
- Google Ads Developer Token + OAuth credentials

Do NOT paste secrets into source code or chat. Put them into a local `.env` file.

After credentials are configured, run:
`python main.py live-health`

Then test each source individually.

A source showing `NOT_CONFIGURED` is not fake data; it means the connector is waiting for the authorized credential.
