import { getCompanyAddressLines } from "@/lib/site/company";

/** Renders postal address with optional street line. */
export default function CompanyAddress() {
  const { street, cityLine, country } = getCompanyAddressLines();

  return (
    <>
      {street ? (
        <>
          {street}
          <br />
        </>
      ) : null}
      {cityLine}
      <br />
      {country}
    </>
  );
}
