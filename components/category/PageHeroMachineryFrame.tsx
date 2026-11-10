"use client";

import type { ReactNode } from "react";
import CategoryHubMachinerySearch from "@/components/category/CategoryHubMachinerySearch";
import { resolveMachineryHubDomain } from "@/lib/machinery/hubDomain";

export default function PageHeroMachineryFrame({
  categoryId,
  children,
}: {
  categoryId: string;
  children: ReactNode;
}) {
  const domain = resolveMachineryHubDomain(categoryId);
  return (
    <section className={`page-hero${domain ? " page-hero--with-machinery-search" : ""}`}>
      <div className="page-hero-inner">
        <div className="page-hero-copy">{children}</div>
        {domain ? <CategoryHubMachinerySearch domain={domain} categoryId={categoryId} /> : null}
      </div>
    </section>
  );
}
