/**
 * Proje sonu değerlendirme (firma ve çözüm sağlayıcı karşılıklı).
 * SÖZLEŞME:
 *  - ProjectFeedback({ projectId }): proje tamamlanınca değerlendirme formu ve sonuçları
 *  - useSatisfaction(projectIds): { avg: 1–5 veya null, count }
 */
export function ProjectFeedback(_: { projectId: string }) {
  return null;
}
export function useSatisfaction(_projectIds: string[]): { avg: number | null; count: number } {
  return { avg: null, count: 0 };
}
