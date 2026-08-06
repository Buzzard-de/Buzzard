import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { trustBadges } from "@/lib/categories";
import type { MegaMenuContent } from "@/types";

interface MegaMenuProps {
  content: MegaMenuContent;
}

export default function MegaMenu({ content }: MegaMenuProps) {
  return (
    <section className="mega-panel" aria-label={content.title}>
      <h2 className="mega-panel-title">{content.title}</h2>

      <div className="mega-panel-grid">
        {content.groups.map((group) => (
          <div key={group.title} className="mega-panel-group">
            <div className="mega-panel-group-head">
              <CategoryIcon name={group.icon} size={20} />
              <h3>{group.title}</h3>
            </div>
            <ul>
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mega-trust-row">
        {trustBadges.map((badge) => (
          <div key={badge.label} className="mega-trust-item">
            <CategoryIcon name={badge.icon} size={22} />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
