import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../../lib/seo/serializeJsonLd.ts";

describe("JSON-LD written into a script element", () => {
  const hostile = {
    "@type": "Product",
    name: 'Bremsscheibe </script><script>window.x=sessionStorage.getItem("buzzard_admin_token")</script>',
    description: "<!-- <script> & \u2028 \u2029 ]]>",
  };

  it("cannot close the script element or open a comment", () => {
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("still parses to the same data", () => {
    expect(JSON.parse(serializeJsonLd(hostile))).toEqual(hostile);
    expect(JSON.parse(serializeJsonLd([hostile, { a: 1 }]))).toEqual([hostile, { a: 1 }]);
  });
});
