/**
 * Belgeler, toplantılar ve ön yazışma.
 * SÖZLEŞME (diğer dosyalar bu imzaları kullanır; değiştirmeyin):
 *  - InviteThread({ needId, solverId }): davet aşamasında firma–uzman(–TTO) yazışması ve toplantı önerisi
 *  - ProjectDocuments({ projectId }): proje belgeleri, gizlilik sözleşmesi oluşturma ve iki taraflı e-onay
 *  - ProjectMeetings({ projectId }): proje toplantıları (video odası / yüz yüze), .ics
 *  - useStageGate(projectId): aşama ilerletme koşulu ({ ok, reason })
 *  - MeetingsPage(): rolün tüm toplantıları (rota: "toplantilar")
 */
import { StubPage } from './stub';

export function InviteThread(_: { needId: string; solverId: string }) {
  return null;
}
export function ProjectDocuments(_: { projectId: string }) {
  return null;
}
export function ProjectMeetings(_: { projectId: string }) {
  return null;
}
export function useStageGate(_projectId: string): { ok: boolean; reason?: string } {
  return { ok: true };
}
export function MeetingsPage() {
  return <StubPage title="Toplantılar" />;
}
