import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import TagSelect from '../components/TagSelect';
import {
  Alert, Chip, Field, Logo, Spinner, useAction, useLoad,
} from '../components/ui';
import {
  CERTIFICATES, COLLABORATION, EMPLOYEES, REGION, ROLES, STAGES, URGENCY, VERIFICATION, VISIBILITY,
} from '../labels';

const TABS = [
  ['general', 'Genel'], ['offers', 'Sunuyorum'], ['needs', 'Arıyorum'], ['certs', 'Belgeler'],
  ['refs', 'Referanslar'], ['prefs', 'Eşleşme tercihleri'], ['team', 'Ekip'],
];

const MISSING = {
  logoUrl: 'logo', foundedYear: 'kuruluş yılı', employeeRange: 'çalışan sayısı', stage: 'aşama', sectors: 'sektör',
  technologies: 'teknoloji', description: 'açıklama (en az 80 karakter)', offers: 'sunuyorum', needs: 'arıyorum',
  certificates: 'belge', references: 'referans', name: 'ad',
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function Profile() {
  const auth = useAuth();
  const [tab, setTab] = useState('general');
  const profile = useLoad(() => api.get('/companies/me'), []);
  const tags = useLoad(() => api.get('/tags'), []);
  const [saved, setSaved] = useState(false);

  const allTags = tags.data?.tags || [];
  const byType = useMemo(() => ({
    sector: allTags.filter((t) => t.type === 'sector'),
    technology: allTags.filter((t) => t.type === 'technology'),
    competence: allTags.filter((t) => t.type === 'competence' || t.type === 'technology'),
  }), [allTags]);

  if (profile.loading || tags.loading) return <Spinner />;
  if (profile.error) return <Alert error={profile.error} />;
  const c = profile.data.company;
  const readOnly = !auth.isCompanyAdmin;
  const onSaved = (company) => {
    profile.setData({ company });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    auth.refresh();
  };

  return (
    <div className="stack">
      <div className="profile-head">
        <Logo company={c} size={64} />
        <div>
          <h1>{c.name}</h1>
          <div className="row">
            <Chip tone={c.verificationStatus === 'approved' ? 'green' : 'amber'}>{VERIFICATION[c.verificationStatus]}</Chip>
            {c.underReview && <Chip tone="red">İnceleme altında</Chip>}
            <span className="muted small">VKN {c.taxNumber}</span>
          </div>
        </div>
        <div className="completion">
          <div className="completion-bar"><span style={{ width: `${c.completion.percent}%` }} /></div>
          <strong>Profil %{c.completion.percent} tamamlandı</strong>
          {c.completion.missing.length > 0 && (
            <span className="muted small">Eksik: {c.completion.missing.map((k) => MISSING[k] || k).join(', ')}. Eksiksiz profiller daha üst sırada görünür.</span>
          )}
        </div>
      </div>
      {readOnly && <Alert kind="info">Profili yalnızca firma yöneticisi düzenleyebilir.</Alert>}
      {saved && <Alert kind="success">Kaydedildi. Önerileriniz güncelleniyor.</Alert>}

      <div className="tabs" role="tablist">
        {TABS.map(([k, v]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      <fieldset disabled={readOnly} className="panel">
        {tab === 'general' && <General c={c} tags={byType} onSaved={onSaved} />}
        {tab === 'offers' && <Statements kind="offers" items={c.offers} tags={byType.competence} onSaved={onSaved} />}
        {tab === 'needs' && <Statements kind="needs" items={c.needs} tags={byType.competence} onSaved={onSaved} />}
        {tab === 'certs' && <Certificates c={c} onSaved={onSaved} reload={profile.reload} />}
        {tab === 'refs' && <References items={c.references} onSaved={onSaved} />}
        {tab === 'prefs' && <Preferences c={c} tags={byType.sector} onSaved={onSaved} />}
      </fieldset>
      {tab === 'team' && <Team />}
    </div>
  );
}

function LogoUpload({ c, onSaved }) {
  const input = useRef(null);
  const { run, busy, error } = useAction();
  const upload = (file) => run(async () => {
    await api.upload('/companies/me/logo', file);
    onSaved((await api.get('/companies/me')).company);
  });
  const remove = () => run(async () => {
    await api.del('/companies/me/logo');
    onSaved((await api.get('/companies/me')).company);
  });
  return (
    <div className="logo-upload">
      <Logo company={c} size={88} />
      <div className="stack-sm">
        <div className="row">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Yükleniyor…' : 'Logo yükle'}</button>
          {c.logoUrl && <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={remove}>Kaldır</button>}
        </div>
        <span className="muted small">PNG, JPEG veya WEBP · en fazla 2 MB · kare görsel önerilir</span>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value = ''; }} />
        <Alert error={error} />
      </div>
    </div>
  );
}

function General({ c, tags, onSaved }) {
  const [f, setF] = useState({
    name: c.name || '', website: c.website || '', foundedYear: c.foundedYear || '', employeeRange: c.employeeRange || '', stage: c.stage || '',
    city: c.city || '', description: c.description || '', sectors: (c.sectors || []).map((s) => String(s.id)),
    technologies: (c.technologies || []).map((s) => String(s.id)),
  });
  const { run, busy, error } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { ...f, foundedYear: f.foundedYear ? Number(f.foundedYear) : undefined };
      for (const k of ['employeeRange', 'stage']) if (!body[k]) delete body[k];
      const r = await api.patch('/companies/me', body);
      onSaved(r.company);
    });
  };
  return (
    <form className="stack" onSubmit={save}>
      <LogoUpload c={c} onSaved={onSaved} />
      <Alert error={error} />
      <div className="grid2">
        <Field label="Firma adı"><input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Web sitesi"><input type="url" placeholder="https://" value={f.website} onChange={set('website')} /></Field>
      </div>
      <div className="grid3">
        <Field label="Kuruluş yılı"><input type="number" min={1900} max={2100} value={f.foundedYear} onChange={set('foundedYear')} /></Field>
        <Field label="Çalışan sayısı">
          <select value={f.employeeRange} onChange={set('employeeRange')}><option value="">Seçin…</option>{Object.entries(EMPLOYEES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Aşama">
          <select value={f.stage} onChange={set('stage')}><option value="">Seçin…</option>{Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
      </div>
      <Field label="Şehir"><input value={f.city} onChange={set('city')} /></Field>
      <Field label="Sektörler"><TagSelect multiple max={10} tags={tags.sector} value={f.sectors} onChange={(v) => setF({ ...f, sectors: v })} /></Field>
      <Field label="Teknolojiler"><TagSelect multiple max={15} tags={tags.technology} value={f.technologies} onChange={(v) => setF({ ...f, technologies: v })} /></Field>
      <Field label="Firma açıklaması" hint={`${f.description.length}/3000 · Ne yaptığınızı somut anlatın; açıklama eşleşme skoruna katkı sağlar.`}>
        <textarea rows={5} maxLength={3000} value={f.description} onChange={set('description')} />
      </Field>
      <div><button className="btn btn-primary" disabled={busy}>Kaydet</button></div>
    </form>
  );
}

const emptyStatement = (kind) => ({
  tag: '', collaborationType: 'subcontracting', description: '', ...(kind === 'needs' ? { urgency: 'general', visibility: 'public', expiresAt: '' } : {}),
});

function Statements({ kind, items, tags, onSaved }) {
  const isNeed = kind === 'needs';
  const [list, setList] = useState(() => items.map((x) => ({
    tag: String(x.tag?.id || ''), collaborationType: x.collaborationType, description: x.description || '',
    ...(isNeed ? {
      urgency: x.urgency, visibility: x.visibility || 'public', expiresAt: toDateInput(x.expiresAt),
      budgetMin: x.budgetRange?.min ?? '', budgetMax: x.budgetRange?.max ?? '',
    } : {}),
  })));
  const { run, busy, error } = useAction();
  const upd = (i, patch) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => run(async () => {
    const payload = list.filter((x) => x.tag).map((x) => {
      const o = { tag: x.tag, collaborationType: x.collaborationType, description: x.description };
      if (isNeed) {
        Object.assign(o, { urgency: x.urgency, visibility: x.visibility, expiresAt: x.expiresAt ? new Date(x.expiresAt).toISOString() : null });
        if (x.budgetMin !== '' || x.budgetMax !== '') {
          o.budgetRange = { ...(x.budgetMin !== '' ? { min: Number(x.budgetMin) } : {}), ...(x.budgetMax !== '' ? { max: Number(x.budgetMax) } : {}) };
        }
      }
      return o;
    });
    const r = await api.put(`/companies/me/${kind}`, { [kind]: payload });
    onSaved(r.company);
  });

  return (
    <div className="stack">
      <p className="muted">
        {isNeed
          ? 'Neye ihtiyacınız var? En fazla 5 madde. "Yalnızca eşleşince görünür" seçilen maddeler skora katılır ama kartınızda gösterilmez.'
          : 'Neyi en iyi yapıyorsunuz? En fazla 5 madde. Örnek: "Görüntü işleme — taşeron — endüstriyel kalite kontrol için hata tespiti modelleri".'}
      </p>
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={i} className="statement">
          <div className="grid2">
            <Field label={isNeed ? 'İhtiyaç' : 'Yetkinlik'}><TagSelect tags={tags} value={x.tag} onChange={(v) => upd(i, { tag: v })} /></Field>
            <Field label="İş birliği türü">
              <select value={x.collaborationType} onChange={(e) => upd(i, { collaborationType: e.target.value })}>
                {Object.entries(COLLABORATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Kısa açıklama"><textarea rows={2} maxLength={500} value={x.description} onChange={(e) => upd(i, { description: e.target.value })} /></Field>
          {isNeed && (
            <>
              <div className="grid3">
                <Field label="Aciliyet">
                  <select value={x.urgency} onChange={(e) => upd(i, { urgency: e.target.value })}>{Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </Field>
                <Field label="Görünürlük">
                  <select value={x.visibility} onChange={(e) => upd(i, { visibility: e.target.value })}>{Object.entries(VISIBILITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </Field>
                <Field label="Bitiş tarihi (isteğe bağlı)"><input type="date" value={x.expiresAt} onChange={(e) => upd(i, { expiresAt: e.target.value })} /></Field>
              </div>
              <div className="grid2">
                <Field label="Bütçe alt sınırı (TRY)"><input type="number" min={0} value={x.budgetMin} onChange={(e) => upd(i, { budgetMin: e.target.value })} /></Field>
                <Field label="Bütçe üst sınırı (TRY)"><input type="number" min={0} value={x.budgetMax} onChange={(e) => upd(i, { budgetMax: e.target.value })} /></Field>
              </div>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList(list.filter((_, j) => j !== i))}>Maddeyi kaldır</button>
        </div>
      ))}
      <div className="row">
        {list.length < 5 && <button type="button" className="btn" onClick={() => setList([...list, emptyStatement(kind)])}>+ Madde ekle</button>}
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Kaydet</button>
      </div>
    </div>
  );
}

function Certificates({ c, onSaved }) {
  const [list, setList] = useState(() => c.certificates.map((x) => ({
    id: x.id, type: x.type, title: x.title || '', validUntil: toDateInput(x.validUntil), document: x.document,
  })));
  useEffect(() => {
    setList((cur) => cur.map((x) => ({ ...x, document: c.certificates.find((y) => String(y.id) === String(x.id))?.document ?? x.document })));
  }, [c.certificates]);
  const { run, busy, error } = useAction();
  const upd = (i, patch) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => run(async () => {
    const r = await api.put('/companies/me/certificates', {
      certificates: list.map((x) => ({
        ...(x.id ? { id: x.id } : {}), type: x.type, title: x.title, validUntil: x.validUntil ? new Date(x.validUntil).toISOString() : null,
      })),
    });
    onSaved(r.company);
    setList(r.company.certificates.map((x) => ({ id: x.id, type: x.type, title: x.title || '', validUntil: toDateInput(x.validUntil), document: x.document })));
  });
  const upload = (x, file) => run(async () => {
    await api.upload(`/companies/me/certificates/${x.id}/document`, file);
    onSaved((await api.get('/companies/me')).company);
  });
  const removeDoc = (x) => run(async () => {
    await api.del(`/companies/me/certificates/${x.id}/document`);
    onSaved((await api.get('/companies/me')).company);
  });

  return (
    <div className="stack">
      <p className="muted">ISO, AR-GE merkezi, tesis güvenlik belgesi gibi belgeler bazı firmalar için zorunlu filtredir. Dosyaları yalnızca onaylı firmalar görüntüleyebilir.</p>
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={x.id || `new-${i}`} className="statement">
          <div className="grid3">
            <Field label="Tür">
              <select value={x.type} onChange={(e) => upd(i, { type: e.target.value })}>{Object.entries(CERTIFICATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Başlık / numara"><input value={x.title} onChange={(e) => upd(i, { title: e.target.value })} /></Field>
            <Field label="Geçerlilik"><input type="date" value={x.validUntil} onChange={(e) => upd(i, { validUntil: e.target.value })} /></Field>
          </div>
          <div className="row">
            {x.id ? (
              <>
                {x.document ? (
                  <>
                    <button type="button" className="btn btn-link" onClick={() => run(() => api.openFile(`/companies/${c.id}/certificates/${x.id}/document`))}>📄 {x.document.name}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeDoc(x)}>Dosyayı kaldır</button>
                  </>
                ) : <span className="muted small">Dosya yüklenmedi</span>}
                <label className="btn btn-sm">
                  {x.document ? 'Dosyayı değiştir' : 'Dosya yükle'}
                  <input type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={(e) => { if (e.target.files[0]) upload(x, e.target.files[0]); e.target.value = ''; }} />
                </label>
                <span className="muted small">PDF/PNG/JPEG · en fazla 10 MB</span>
              </>
            ) : <span className="muted small">Dosya yüklemek için önce kaydedin.</span>}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList(list.filter((_, j) => j !== i))}>Belgeyi kaldır</button>
          </div>
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn" onClick={() => setList([...list, { type: 'iso_9001', title: '', validUntil: '' }])}>+ Belge ekle</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Kaydet</button>
      </div>
    </div>
  );
}

function References({ items, onSaved }) {
  const [list, setList] = useState(() => items.map((r) => ({
    title: r.title, client: r.client || '', description: r.description || '', hidden: !!r.hidden,
  })));
  const { run, busy, error } = useAction();
  const upd = (i, patch) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => run(async () => {
    const r = await api.put('/companies/me/references', { references: list.filter((x) => x.title.trim()) });
    onSaved(r.company);
  });
  return (
    <div className="stack">
      <Alert error={error} />
      {list.map((x, i) => (
        <div key={i} className="statement">
          <div className="grid2">
            <Field label="Proje"><input value={x.title} onChange={(e) => upd(i, { title: e.target.value })} /></Field>
            <Field label="Müşteri"><input value={x.client} onChange={(e) => upd(i, { client: e.target.value })} /></Field>
          </div>
          <Field label="Açıklama"><textarea rows={2} value={x.description} onChange={(e) => upd(i, { description: e.target.value })} /></Field>
          <div className="row">
            <label className="check"><input type="checkbox" checked={x.hidden} onChange={(e) => upd(i, { hidden: e.target.checked })} /><span>Gizle (yalnızca siz görürsünüz)</span></label>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList(list.filter((_, j) => j !== i))}>Kaldır</button>
          </div>
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn" onClick={() => setList([...list, { title: '', client: '', description: '', hidden: false }])}>+ Referans ekle</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Kaydet</button>
      </div>
    </div>
  );
}

function Preferences({ c, tags, onSaved }) {
  const [p, setP] = useState({
    region: c.preferences?.region || 'turkey',
    requiredCertificates: c.preferences?.requiredCertificates || [],
    blockedSectors: (c.preferences?.blockedSectors || []).map((s) => String(s.id || s._id || s)),
  });
  const { run, busy, error } = useAction();
  const toggleCert = (k) => setP({
    ...p, requiredCertificates: p.requiredCertificates.includes(k) ? p.requiredCertificates.filter((x) => x !== k) : [...p.requiredCertificates, k],
  });
  const save = () => run(async () => {
    const r = await api.patch('/companies/me', { preferences: p });
    onSaved(r.company);
  });
  return (
    <div className="stack">
      <p className="muted">Bu filtreler kesindir: uymayan firmalar akışınızda hiç gösterilmez.</p>
      <Alert error={error} />
      <Field label="Bölge">
        <div className="radio-row">
          {Object.entries(REGION).map(([k, v]) => (
            <label key={k} className={`radio ${p.region === k ? 'on' : ''}`}>
              <input type="radio" name="region" checked={p.region === k} onChange={() => setP({ ...p, region: k })} />{v}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Karşı firmada zorunlu belgeler">
        <div className="radio-row">
          {Object.entries(CERTIFICATES).map(([k, v]) => (
            <label key={k} className={`radio ${p.requiredCertificates.includes(k) ? 'on' : ''}`}>
              <input type="checkbox" checked={p.requiredCertificates.includes(k)} onChange={() => toggleCert(k)} />{v}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Rakip sektörler (gösterme)"><TagSelect multiple tags={tags} value={p.blockedSectors} onChange={(v) => setP({ ...p, blockedSectors: v })} /></Field>
      <div><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Kaydet</button></div>
    </div>
  );
}

function Team() {
  const auth = useAuth();
  const members = useLoad(() => api.get('/companies/me/members'), []);
  const [invite, setInvite] = useState({ email: '', role: 'company_member' });
  const [sent, setSent] = useState(null);
  const { run, busy, error } = useAction();
  const send = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post('/companies/me/invitations', invite);
      setSent(invite.email);
      setInvite({ email: '', role: 'company_member' });
    });
  };
  const changeRole = (m, role) => run(async () => { await api.patch(`/companies/me/members/${m._id}`, { role }); members.reload(); });
  const removeMember = (m) => run(async () => {
    if (!window.confirm(`${m.fullName} ekipten çıkarılsın mı?`)) return;
    await api.del(`/companies/me/members/${m._id}`);
    members.reload();
  });
  return (
    <div className="panel stack">
      <h3>Ekip</h3>
      <Alert error={error || members.error} />
      {members.data && (
        <table className="table">
          <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th /></tr></thead>
          <tbody>
            {members.data.members.map((m) => (
              <tr key={m._id}>
                <td>{m.fullName}{m.title && <div className="muted small">{m.title}</div>}</td>
                <td>{m.email}</td>
                <td>
                  {auth.isCompanyAdmin && String(m._id) !== String(auth.user._id) ? (
                    <select value={m.role} onChange={(e) => changeRole(m, e.target.value)}>
                      <option value="company_admin">{ROLES.company_admin}</option><option value="company_member">{ROLES.company_member}</option>
                    </select>
                  ) : ROLES[m.role]}
                </td>
                <td>{auth.isCompanyAdmin && String(m._id) !== String(auth.user._id) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMember(m)}>Çıkar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {auth.isCompanyAdmin && (
        <form className="row wrap" onSubmit={send}>
          <input type="email" required placeholder="ad.soyad@firmaniz.com.tr" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            <option value="company_member">{ROLES.company_member}</option><option value="company_admin">{ROLES.company_admin}</option>
          </select>
          <button className="btn btn-primary" disabled={busy}>Davet gönder</button>
        </form>
      )}
      {sent && <Alert kind="success">{sent} adresine davet gönderildi.</Alert>}
    </div>
  );
}

