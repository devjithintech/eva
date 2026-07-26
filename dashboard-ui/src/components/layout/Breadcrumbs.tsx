export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  items: Crumb[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="crumbs">
      {items.map((item, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="sep">/</span>}
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span className="cur">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
