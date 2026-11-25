import { ArrowLeft, CheckCircle2, Clock, FolderKanban, Lock, Send, ShieldCheck, Unlock, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { timeAgo } from '@/lib/utils';
import { BUDGET, CATEGORY, FUNDING, PERSONAS, cityOfFirm, firmOf, orgOf, ttoName, type Invite, type Role } from '../data';
import { candidatesFor, solverIdOf, useKopru } from '../store';
import { InviteThread } from '../features/collab';
import { Avatar, CandidateRow, Card, SolverAvatar, SolverKind, StatusChip, Tag, Timeline } from '../ui';

const INVITE_STATUS: Record<Invite['status'], { label: string; cls: string; icon: typeof Clock }> = {
  bekliyor: { label: 'Yanıt bekleniyor', cls: 'text-amber-700', icon: Clock },
  kabul: { label: 'Kabul etti', cls: 'text-emerald-700', icon: CheckCircle2 },
  ret: { label: 'Geri çevirdi', cls: 'text-slate-500', icon: XCircle },
};
const BY: Record<Invite['by'], string> = { tto: 'TTO daveti', firma: 'Firmanın daveti', akademisyen: 'Kendisi ilgi bildirdi' };

export default function NeedDetail() {
  const { role, id } = useParams() as { role: Role; id: string };
  const k = useKopru();
  const toast = useToast();
  const navigate = useNavigate();
  const need = k.state.needs.find((n) => n.id === id);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [decline, setDecline] = useState(false);
  // İl içine yönlendirilen ihtiyaçta adaylar yönlendirilen üniversitelerden; tüm ağa açıksa hepsinden
  const cands = useMemo(
    () => (need ? candidatesFor(need, need.route === 'il' ? k.state.academics.filter((a) => need.ttoIds.includes(a.orgId)) : k.state.academics, cityOfFirm(need.firmId)) : []),
    [need, k.state.academics],
  );

  if (!need) return <div className="p-8"><EmptyState icon={<FolderKanban className="h-6 w-6" />} title="İhtiyaç bulunamadı" description="Senaryo sıfırlanmış olabilir." action={<Link className="text-sm font-semibold text-primary-600" to={`/kopru/${role}`}>Geri dön</Link>} /></div>;

  const firm = firmOf(need.firmId);
  // Çözüm sağlayıcı rolleri: akademisyen (a1) ve teknokent firması (t0)
  const solverRole = role === 'akademisyen' || role === 'tfirma';
  const meId = solverIdOf(role) ?? PERSONAS.akademisyen.academicId;
  const myInvite = solverRole ? need.invites.find((i) => i.solverId === meId) : undefined;
  const project = need.projectId ? k.state.projects.find((p) => p.id === need.projectId) : undefined;
  // Gizli ayrıntılar: ihtiyaç sahibi firma ve TTO her zaman görür; akademisyen taahhüt sonrası; kurum yöneticileri görmez
  const canSeeDetails = !need.confidential || role === 'firma' || role === 'tto' || (solverRole && !!myInvite?.ndaAt);
  const invitedIds = new Set(need.invites.map((i) => i.solverId));
  const open = need.status !== 'proje' && need.status !== 'kapandi';
  const myTto = k.state.orgSel.tto;
  // TTO yalnızca kendisine yönlendirilen ihtiyaçta işlem yapar; inceleme başka TTO'daysa kendi akademisyenlerini önerebilir
  const canTto = role === 'tto' && need.ttoIds.includes(myTto);
  const otherOwner = need.ttoOrg && need.ttoOrg !== myTto ? need.ttoOrg : null;
  const back = role === 'firma' || role === 'osb' || role === 'teknokent' ? `/kopru/${role}/ihtiyaclar` : `/kopru/${role}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Geri
      </Link>

      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={firm.name} brand={firm.brand} size={52} square />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={need.status} />
              {need.urgency === 'acil' && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-600">Acil</span>}
              {need.confidential && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  <Lock className="h-3 w-3" /> Gizli
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900">{need.title}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {firm.name} · {orgOf(firm.orgId).short} ({orgOf(firm.orgId).city}) · {firm.sector} · {timeAgo(need.createdAt)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{need.route === 'ag' ? 'Tüm ağa açık' : `${orgOf(firm.orgId).city} içi`}</span>
              {need.ttoIds.map((u) => (
                <span key={u} className={`rounded-md px-2 py-0.5 font-medium ${need.ttoOrg === u ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                  {ttoName(u)}
                  {need.ttoOrg === u && ' · inceliyor'}
                </span>
              ))}
            </div>
          </div>
          {project && (
            <Button size="sm" onClick={() => navigate(`/kopru/${role}/projeler/${project.id}`)}>
              <FolderKanban className="h-4 w-4" /> Projeye git
            </Button>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{need.summary}</p>
        {canSeeDetails ? (
          need.details && <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{need.details}</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <Lock className="h-4 w-4 text-slate-400" />
            <span className="flex-1">Ayrıntılar gizli. {solverRole ? 'Görmek için gizlilik taahhüdünü onaylayın.' : 'Yalnızca firma, TTO ve taahhüt veren uzmanlar görür.'}</span>
            {solverRole && (
              <Button size="sm" variant="secondary" onClick={() => setNdaOpen(true)}>
                <ShieldCheck className="h-4 w-4" /> Taahhüdü onayla
              </Button>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">{need.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ['Tür', CATEGORY[need.category]],
            ['Bütçe', BUDGET[need.budget]],
            ['Finansman', FUNDING[need.funding]],
          ].map(([a, b]) => (
            <div key={a} className="rounded-xl border border-slate-200 px-3 py-2">
              <dt className="text-xs text-slate-500">{a}</dt>
              <dd className="font-medium text-slate-900">{b}</dd>
            </div>
          ))}
        </dl>
        {need.ttoNote && (role === 'tto' || role === 'firma') && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <span className="font-semibold">TTO notu:</span> {need.ttoNote}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Çözüm sağlayıcı (akademisyen / teknokent firması): kendi daveti */}
          {solverRole && (
            <Card title="Sizin durumunuz">
              {myInvite ? (
                myInvite.status === 'bekliyor' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">{BY[myInvite.by]} · {timeAgo(myInvite.at)}. Uygunsanız kabul edin; firma ve TTO ile proje alanı açılır.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          if (need.confidential && !myInvite.ndaAt) return setNdaOpen(true);
                          k.respond(need.id, meId, true);
                          toast({ title: 'Davet kabul edildi', body: `${firm.name} bilgilendirildi.` });
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Kabul et
                      </Button>
                      <Button variant="secondary" onClick={() => setDecline(true)}>
                        Uygun değilim
                      </Button>
                    </div>
                    {need.confidential && !myInvite.ndaAt && <p className="text-xs text-slate-500">Gizli ihtiyaç: kabul etmeden önce gizlilik taahhüdü onaylanır.</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">{myInvite.status === 'kabul' ? (project ? 'Bu ihtiyaç projeye dönüştü.' : 'Kabul ettiniz. Firmanın proje başlatması bekleniyor.') : 'Bu daveti geri çevirdiniz.'}</p>
                )
              ) : open ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex-1 text-sm text-slate-600">Bu ihtiyaca davet edilmediniz; uzmanlığınıza uyuyorsa ilgi bildirebilirsiniz.</p>
                  <Button
                    onClick={() => {
                      if (need.confidential) return setNdaOpen(true);
                      k.express(need.id, meId);
                      toast({ title: 'İlginiz iletildi', body: 'Firma ve TTO bilgilendirildi.' });
                    }}
                  >
                    <Send className="h-4 w-4" /> İlgimi bildir
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Bu ihtiyaç kapandı.</p>
              )}
            </Card>
          )}
          {/* Ön yazışma: davet aşamasında soru-cevap ve toplantı önerisi */}
          {solverRole && myInvite && myInvite.status !== 'ret' && <InviteThread needId={need.id} solverId={meId} />}

          {/* Davet edilenler */}
          {!solverRole && (
            <Card title="Davet edilen uzmanlar" description={need.invites.length ? undefined : 'Henüz kimse davet edilmedi.'}>
              <ul className="space-y-2">
                {need.invites.map((inv) => {
                  const s = k.findSolver(inv.solverId);
                  if (!s) return null;
                  const st = INVITE_STATUS[inv.status];
                  const isProject = project?.solverId === inv.solverId;
                  return (
                    <li key={inv.solverId} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <SolverAvatar solver={s} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{s.data.name}</div>
                        <SolverKind solver={s} />
                        <div className="mt-0.5 text-xs text-slate-500">
                          {BY[inv.by]} · {timeAgo(inv.at)}
                          {inv.ndaAt && ' · gizlilik taahhüdü verdi'}
                        </div>
                        {inv.note && <div className="mt-1 text-xs italic text-slate-600">“{inv.note}”</div>}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${st.cls}`}>
                        <st.icon className="h-3.5 w-3.5" /> {isProject ? 'Proje yürütücüsü' : st.label}
                      </span>
                      {role === 'firma' && inv.status === 'kabul' && open && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const pid = k.startProject(need.id, inv.solverId);
                            toast({ title: 'Proje başlatıldı', body: `${s.data.name} ile ön görüşme aşaması açıldı.` });
                            navigate(`/kopru/firma/projeler/${pid}`);
                          }}
                        >
                          Projeyi başlat
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {(role === 'firma' || role === 'tto') &&
            need.invites.filter((i) => i.status !== 'ret').map((i) => <InviteThread key={i.solverId} needId={need.id} solverId={i.solverId} />)}

          {/* TTO ve firma: aday listesi */}
          {role === 'tto' && !canTto && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Bu ihtiyaç {ttoName(myTto)}’ya yönlendirilmedi; yalnızca kendi akademisyenlerinizin dahil olduğu süreci izleyebilirsiniz.</div>
          )}
          {canTto && otherOwner && open && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              İncelemeyi <strong>{ttoName(otherOwner)}</strong> yürütüyor ({need.ttoOwner}). Siz de kendi üniversitenizden uygun akademisyenleri davet edebilirsiniz; süreç ortak yürür.
            </div>
          )}
          {(canTto || role === 'firma') && open && (
            <Card
              title={role === 'tto' ? 'Önerilen adaylar' : 'Doğrudan davet edebileceğiniz uzmanlar'}
              description={role === 'tto' ? 'Uzmanlık alanı, uzmanlık metni ve laboratuvar uyumuna göre sıralandı.' : 'TTO’yu beklemeden de davet gönderebilirsiniz; TTO süreci yine izler.'}
              actions={
                canTto && need.status === 'yeni' ? (
                  <Button size="sm" variant="secondary" onClick={() => { k.startReview(need.id); toast({ title: 'İncelemeye alındı', tone: 'info' }); }}>
                    İncelemeye al
                  </Button>
                ) : undefined
              }
            >
              <div className="space-y-2">
                {cands
                  .filter((c) => !invitedIds.has(c.solver.data.id))
                  // İncelemeyi başka TTO yürütüyorsa yalnızca kendi akademisyenlerini önerir
                  .filter((c) => role !== 'tto' || !otherOwner || (c.solver.kind === 'academic' && c.solver.data.orgId === myTto))
                  .slice(0, role === 'tto' ? 6 : 4)
                  .map((c) => {
                    const sid = c.solver.data.id;
                    return (
                      <CandidateRow
                        key={sid}
                        c={c}
                        needTags={need.tags}
                        right={
                          role === 'tto' ? (
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                              <input type="checkbox" className="h-4 w-4 accent-primary-500" checked={picked.includes(sid)} onChange={(e) => setPicked(e.target.checked ? [...picked, sid] : picked.filter((x) => x !== sid))} aria-label={`${c.solver.data.name} seç`} />
                              Seç
                            </label>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => { k.invite(need.id, [sid], 'firma'); toast({ title: `${c.solver.data.name} davet edildi` }); }}>
                              Davet et
                            </Button>
                          )
                        }
                      />
                    );
                  })}
              </div>
              {role === 'tto' && (
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-500">{picked.length} aday seçildi</span>
                  <Button
                    disabled={!picked.length}
                    onClick={() => {
                      k.invite(need.id, picked, 'tto');
                      toast({ title: `${picked.length} uzmana davet gönderildi` });
                      setPicked([]);
                    }}
                  >
                    <Send className="h-4 w-4" /> Seçilenleri davet et
                  </Button>
                </div>
              )}
            </Card>
          )}

          {canTto && !otherOwner && (
            <Card title="TTO notu" description="Firma ile paylaşılır; destek programı uygunluğu, öncelik vb.">
              <textarea className="input" rows={3} value={note ?? need.ttoNote ?? ''} onChange={(e) => setNote(e.target.value)} aria-label="TTO notu" placeholder="ör. TÜBİTAK 1505 için uygun; ön görüşme önerilir." />
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="secondary" disabled={note == null} onClick={() => { k.setTtoNote(need.id, note ?? ''); setNote(null); toast({ title: 'Not kaydedildi' }); }}>
                  Kaydet
                </Button>
              </div>
            </Card>
          )}
        </div>

        <Card title="Süreç geçmişi">
          <Timeline events={need.events} />
        </Card>
      </div>

      <Modal open={ndaOpen} onClose={() => setNdaOpen(false)} title="Gizlilik taahhüdü">
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-900">{firm.name}</strong> tarafından paylaşılan teknik bilgileri yalnızca bu ihtiyacın değerlendirilmesi amacıyla kullanacağımı, üçüncü kişilerle paylaşmayacağımı ve yayınlarımda firmanın yazılı izni olmadan kullanmayacağımı taahhüt ederim.
          </p>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Proje başlarsa TTO, üniversitenin standart gizlilik sözleşmesini (NDA) ayrıca imzaya sunar.</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setNdaOpen(false)}>Vazgeç</Button>
          <Button
            onClick={() => {
              if (!myInvite) k.express(need.id, meId);
              k.signNda(need.id, meId);
              setNdaOpen(false);
              toast({ title: 'Taahhüt onaylandı', body: 'Ayrıntılar artık görünür.' });
            }}
          >
            <Unlock className="h-4 w-4" /> Onaylıyorum
          </Button>
        </div>
      </Modal>

      <Modal open={decline} onClose={() => setDecline(false)} title="Daveti geri çevir">
        <DeclineForm
          onCancel={() => setDecline(false)}
          onSubmit={(reason) => {
            k.respond(need.id, meId, false, reason);
            setDecline(false);
            toast({ title: 'Yanıtınız iletildi', tone: 'info' });
          }}
        />
      </Modal>
    </div>
  );
}

function DeclineForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (reason: string) => void }) {
  const [r, setR] = useState('Şu an yoğunluğum nedeniyle alamıyorum');
  const opts = ['Şu an yoğunluğum nedeniyle alamıyorum', 'Uzmanlık alanımın dışında', 'Bir meslektaşımı önerebilirim'];
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(r); }} className="space-y-2">
      {opts.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input type="radio" name="dr" checked={r === o} onChange={() => setR(o)} className="accent-primary-500" /> {o}
        </label>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Vazgeç</Button>
        <Button type="submit">Gönder</Button>
      </div>
    </form>
  );
}
