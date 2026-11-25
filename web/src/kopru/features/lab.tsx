/**
 * Laboratuvar hizmetleri: fiyat listesi, analiz talebi, randevu, numune ve sonuç raporu.
 * SÖZLEŞME:
 *  - LabsPage(): rota "laboratuvar" (firma/tfirma: talep; akademisyen: kendi laboratuvarına gelen talepler; tto/platform: tümü)
 *  - LabRequestButton({ labId }): rehberdeki laboratuvar kartında "Analiz talep et"
 */
import { StubPage } from './stub';

export function LabsPage() {
  return <StubPage title="Laboratuvar hizmetleri" />;
}
export function LabRequestButton(_: { labId: string }) {
  return null;
}
