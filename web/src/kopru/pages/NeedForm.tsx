import { Lock, Search, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { BUDGET, CATEGORY, FUNDING, PERSONAS, TAGS, cityOfFirm, localTtos, orgsOfType, ttoName, type Budget, type Funding, type NeedCategory } from '../data';
import { candidatesFor, useKopru, type NeedInput } from '../store';
import { Card, CandidateRow } from '../ui';

const EMPTY: NeedInput = { title: '', summary: '', details: '', category: 'arge', tags: [], budget: 'belirsiz', funding: 'bilinmiyor', urgency: 'normal', confidential: false, route: 'il' };

const SAMPLE: NeedInput = {
  title: 'Sfero döküm parçalarda gözenek kaynaklı yüksek fire',
  summary: 'Fren kampanası parçalarında işleme sonrası ortaya çıkan gaz ve çekinti gözenekleri nedeniyle fire oranı %9’a çıktı.',
  details:
    'Yıllık 40.000 adet GGG-50 fren kampanası. Gözenekler talaşlı işlemeden sonra görünür oluyor; müşteri iadesi arttı. Kalıp tasarımı, besleyici yerleşimi ve ergitme pratiği incelenmeli. Hat sonunda kameralı veya X-ışınlı otomatik kontrol de değerlendirilebilir.',
  category: 'arge',
  tags: ['Döküm', 'Metalurji', 'Tahribatsız muayene', 'Kalite kontrol', 'Görüntü işleme'],
  budget: '100_500',
  funding: 'tubitak1505',
  urgency: 'acil',
  confidential: true,
  route: 'ag',
};

export function TagPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const list = TAGS.filter((t) => !value.includes(t) && t.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-primary-700">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-primary-100" aria-label={`${t} etiketini kaldır`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input !py-2.5 !pl-9" placeholder="Alan ara (ör. döküm, enerji, gıda)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Uzmanlık alanı ara" />
      </div>
      <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {list.slice(0, q ? 30 : 14).map((t) => (
          <button key={t} type="button" onClick={() => onChange([...value, t])} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-primary-300 hover:text-slate-900">
            + {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NeedForm() {
  const k = useKopru();
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState<NeedInput>(EMPTY);
  const set = <K extends keyof NeedInput>(key: K, v: NeedInput[K]) => setF((x) => ({ ...x, [key]: v }));
  const city = cityOfFirm(PERSONAS.firma.firmId);
  const local = localTtos(city);
  const all = orgsOfType('universite');
  // İl içine gönderilen ihtiyaçta öneriler o ildeki üniversitelerle (ve tüm teknokent firmalarıyla) sınırlı
  const academics = useMemo(() => (f.route === 'il' ? k.state.academics.filter((a) => local.includes(a.orgId)) : k.state.academics), [f.route, k.state.academics, local]);
  const preview = useMemo(() => (f.tags.length || f.title.length > 8 ? candidatesFor(f, academics, city).slice(0, 4) : []), [f, academics, city]);
  const valid = f.title.trim().length >= 8 && f.summary.trim().length >= 20 && f.tags.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        title="İhtiyaç bildir"
        description="Sorununuzu kendi cümlelerinizle anlatın. TTO inceler; sistem uygun akademisyen ve teknokent firmalarını önerir."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setF(SAMPLE)}>
            <Sparkles className="h-4 w-4" /> Örnek doldur
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form
          className="glass space-y-5 rounded-2xl p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            const id = k.createNeed(f);
            toast({ title: 'İhtiyacınız TTO’ya iletildi', body: 'İnceleme ve eşleştirme durumunu buradan takip edebilirsiniz.' });
            navigate(`/kopru/firma/ihtiyaclar/${id}`);
          }}
        >
          <div>
            <label className="label" htmlFor="nf-title">Başlık</label>
            <input id="nf-title" className="input" required minLength={8} maxLength={120} placeholder="ör. Döküm parçalarda gözenek kaynaklı fire" value={f.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="nf-sum">Kısa özet</label>
            <textarea id="nf-sum" className="input" rows={2} required minLength={20} maxLength={300} placeholder="Herkesin görebileceği 1–2 cümlelik özet" value={f.summary} onChange={(e) => set('summary', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="nf-det">Ayrıntılar</label>
            <textarea id="nf-det" className="input" rows={4} maxLength={2000} placeholder="Üretim adetleri, ölçümler, denenenler, beklenen sonuç…" value={f.details} onChange={(e) => set('details', e.target.value)} />
          </div>
          <div>
            <span className="label">İlgili uzmanlık alanları</span>
            <TagPicker value={f.tags} onChange={(v) => set('tags', v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="nf-cat">Tür</label>
              <select id="nf-cat" className="input" value={f.category} onChange={(e) => set('category', e.target.value as NeedCategory)}>
                {Object.entries(CATEGORY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nf-bud">Bütçe</label>
              <select id="nf-bud" className="input" value={f.budget} onChange={(e) => set('budget', e.target.value as Budget)}>
                {Object.entries(BUDGET).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nf-fund">Finansman</label>
              <select id="nf-fund" className="input" value={f.funding} onChange={(e) => set('funding', e.target.value as Funding)}>
                {Object.entries(FUNDING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className="label">Kime gönderilsin?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['il', `${city}’daki TTO`, local.map(ttoName).join(', ') + ' inceler; öneriler bu ildeki üniversitelerden'],
                  ['ag', 'Tüm ağ', `${all.length} üniversitenin TTO’su görür: ${all.map((o) => o.city).join(', ')}`],
                ] as const
              ).map(([v, t, d]) => (
                <label key={v} className={cn('flex cursor-pointer gap-3 rounded-xl border p-4 transition', f.route === v ? 'border-primary-300 bg-primary-50/50' : 'border-slate-200 hover:border-slate-300')}>
                  <input type="radio" name="route" className="mt-1 accent-primary-500" checked={f.route === v} onChange={() => set('route', v)} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{t}</span>
                    <span className="block text-xs text-slate-500">{d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <Toggle checked={f.urgency === 'acil'} onChange={(v) => set('urgency', v ? 'acil' : 'normal')} label="Acil" description="Üretimi doğrudan etkiliyor" />
            </div>
            <div className={cn('rounded-xl border p-4', f.confidential ? 'border-primary-200 bg-primary-50/50' : 'border-slate-200')}>
              <Toggle checked={f.confidential} onChange={(v) => set('confidential', v)} label="Gizli ihtiyaç" description="Ayrıntıları yalnızca gizlilik taahhüdü veren uzman görür" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            {!valid && <span className="text-xs text-slate-500">Başlık, özet ve en az bir alan gerekli</span>}
            <Button type="submit" disabled={!valid}>
              TTO’ya gönder
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <Card title="Önerilen uzmanlar" description="Yazdıkça güncellenir. TTO son kararı verir.">
            {preview.length === 0 ? (
              <p className="text-sm text-slate-500">Başlık yazın veya alan seçin; uygun akademisyen ve teknokent firmaları burada belirir.</p>
            ) : (
              <div className="space-y-2">
                {preview.map((c) => <CandidateRow key={c.solver.data.id} c={c} needTags={f.tags} />)}
              </div>
            )}
          </Card>
          {f.confidential && (
            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <Lock className="h-5 w-5 shrink-0 text-primary-600" />
              Gizli ihtiyaçlarda diğer kullanıcılar yalnızca başlığı ve özeti görür. Ayrıntılar, gizlilik taahhüdünü onaylayan davetli uzmanlara açılır.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
