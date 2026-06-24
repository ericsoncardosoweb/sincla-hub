import type { ProductContent } from '../../content/products';
import { MarketingLayout } from '../MarketingLayout/MarketingLayout';

interface ProductLayoutProps {
  product: ProductContent;
  children: React.ReactNode;
}

export function ProductLayout({ product, children }: ProductLayoutProps) {
  return (
    <MarketingLayout>
      <div style={{ '--product-accent': product.color } as React.CSSProperties}>{children}</div>
    </MarketingLayout>
  );
}
