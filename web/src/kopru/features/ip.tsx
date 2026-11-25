/**
 * Fikri mülkiyet: buluş bildirimi → ön değerlendirme → araştırma → başvuru → tescil/lisans.
 * SÖZLEŞME:
 *  - IpPage(): rota "fikri-mulkiyet"
 *  - ProjectIp({ projectId }): proje sayfasında "Bu projeden buluş bildirimi"
 */
import { StubPage } from './stub';

export function IpPage() {
  return <StubPage title="Fikri mülkiyet" />;
}
export function ProjectIp(_: { projectId: string }) {
  return null;
}
