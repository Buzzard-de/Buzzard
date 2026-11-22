# Risk and priority

Date: 22 November 2026. Complexity is structural. It is not a delivery date.

| ID | Priority | Impact | Technical risk | Dependencies | Complexity | Next step |
|---|---|---|---|---|---|---|
| Sales lock and payment 403 | P0 | A removed lock could capture money | High if tests are skipped | Human approval, provider sandbox | The lock exists. The risk is turning it off. | Verify before any change |
| Egress deny | P0 | A live model or webhook could leave the network | High | Policy file | Already implemented | Verify, do not reopen |
| Sanctions fail-closed | P0 | A false clearance would be a legal event | High | List vendor, counsel | Gate exists. Live list does not. | Human review |
| Secrets in production | P0 | Leak or a weak production secret | Medium until the host is inspected | Host access | Unknown here | Verify on the host, not in git |
| Partial cancellation | P1 | Operators cannot cancel one line | Medium | Order totals and reservations | New behavior beside `cancelOrder` | Write the rule before code |
| Lost-shipment automation | P1 | A lost parcel would not alert anyone | Medium | Carrier tracking | New workflow | Blocked until a carrier sandbox exists |
| Live supplier and stock | P1 | Orders cannot be purchased or trusted | High | Supplier contract | Dry code exists | External account, then sandbox |
| Live carrier labels | P1 | No real shipment | High | Carrier contract | Gate exists | External account |
| Price publish | P1 | A bad price could be shown | High if the missing-cost guard is bypassed | Cost, VAT, fees | Local guard exists | Verify the guard, then a sandbox |
| 321 unreviewed L2 labels | P2 | Shoppers see fallback German in other languages | Medium | Human translators | Data, not a new engine | Review, do not machine-fill |
| Pusat memory conflicts | P2 | Two facts can both be returned | Medium | A written precedence rule | Small rule on an existing table | Decide the rule first |
| Voice, WebRTC, digital human | P2 | The spoken and visual product is not real | Low while sales are locked | Vendors and consent | Large | Leave blocked |
| 386 unverified tasks | P2 | Work could be repeated or skipped | Medium | Original 237 text, if it exists outside this clone | Reading, not coding | Validate before building |
| EU payment matrix | P2 | Checkout methods are not country-specific | Medium | Payment counsel | Configuration | Human list of methods |
| PNG avatar presented as a person | P3 | Misleading product claim | Low | None | None | Describe it as a picture |
| National-day calendar | P3 | One day per country is not a legal calendar | Low | Official calendars | Data | Human source |

P0 items are controls that must stay closed. They are not a request to build a replacement.
