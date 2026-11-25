/**
 * Destek programları (TÜBİTAK 1505/1501, KOSGEB…): çağrı dönemleri, son tarihler ve başvuru takibi.
 * SÖZLEŞME:
 *  - FundingPage(): rota "destek"
 *  - ProjectFunding({ projectId }): proje sayfasında başvuru kartı
 */
import { StubPage } from './stub';

export function FundingPage() {
  return <StubPage title="Destek programları" />;
}
export function ProjectFunding(_: { projectId: string }) {
  return null;
}
