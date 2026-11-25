import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/AppShell';

/** Geçici yer tutucu: ilgili özellik modülü yazılınca kaldırılır */
export function StubPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title={title} description="Bu bölüm hazırlanıyor." />
      {children}
    </div>
  );
}
