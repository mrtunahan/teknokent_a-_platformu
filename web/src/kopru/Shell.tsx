import { BarChart3, ClipboardList, FolderKanban, GraduationCap, Inbox, LayoutDashboard, LogOut, Network, PlusCircle, RotateCcw, Search, UserCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shell, type NavItem } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { PERSONAS, ROLE_LABEL, ROLE_ORG_TYPE, orgOf, orgsOfType, type OrgRole, type Role } from './data';
import { personaOf, useKopru } from './store';
import { Avatar } from './ui';

const ROLES: Role[] = ['firma', 'akademisyen', 'tto', 'osb', 'teknokent', 'platform'];
export const isRole = (r?: string): r is Role => !!r && (ROLES as string[]).includes(r);
export const isOrgRole = (r: Role): r is OrgRole => r === 'tto' || r === 'osb' || r === 'teknokent';

function navFor(role: Role, counts: { pool: number; invites: number; approvals: number }): NavItem[] {
  const b = `/kopru/${role}`;
  switch (role) {
    case 'firma':
      return [
        { to: b, label: 'Genel bakış', short: 'Bakış', icon: LayoutDashboard, end: true },
        { to: `${b}/ihtiyaclar`, label: 'İhtiyaçlarım', short: 'İhtiyaçlar', icon: ClipboardList },
        { to: `${b}/ihtiyaclar/yeni`, label: 'İhtiyaç bildir', short: 'Bildir', icon: PlusCircle },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: Search },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
      ];
    case 'akademisyen':
      return [
        { to: b, label: 'Davetler & fırsatlar', short: 'Davetler', icon: Inbox, badge: counts.invites, end: true },
        { to: `${b}/projeler`, label: 'Projelerim', short: 'Projeler', icon: FolderKanban },
        { to: `${b}/profil`, label: 'Uzmanlık profilim', short: 'Profil', icon: UserRound },
      ];
    case 'tto':
      return [
        { to: b, label: 'İhtiyaç havuzu', short: 'Havuz', icon: Inbox, badge: counts.pool, end: true },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: GraduationCap },
        { to: `${b}/onaylar`, label: 'Akademisyen onayları', short: 'Onaylar', icon: UserCheck, badge: counts.approvals },
        { to: `${b}/rapor`, label: 'Etki raporu', short: 'Rapor', icon: BarChart3 },
      ];
    case 'osb':
    case 'teknokent':
      return [
        { to: b, label: 'Kurum paneli', short: 'Panel', icon: BarChart3, end: true },
        { to: `${b}/ihtiyaclar`, label: role === 'osb' ? 'Bölge ihtiyaçları' : 'Firmalarımızın katkısı', short: 'Liste', icon: ClipboardList },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
      ];
    case 'platform':
      return [
        { to: b, label: 'Kurum ağı', short: 'Ağ', icon: Network, end: true },
        { to: `${b}/rapor`, label: 'Etki raporu', short: 'Rapor', icon: BarChart3 },
        { to: `${b}/ihtiyaclar`, label: 'Tüm ihtiyaçlar', short: 'İhtiyaçlar', icon: ClipboardList },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: GraduationCap },
      ];
  }
}

function RoleBar({ role }: { role: Role }) {
  const navigate = useNavigate();
  const toast = useToast();
  const k = useKopru();
  return (
    <div className="border-b border-slate-200 bg-slate-900 px-4 py-2 text-white sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Demo · rol</span>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Demo rolü">
          {ROLES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === role}
              onClick={() => navigate(`/kopru/${r}`)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold transition', r === role ? 'bg-primary-500 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        {isOrgRole(role) && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Kurum
            <select
              value={k.state.orgSel[role]}
              onChange={(e) => {
                k.setOrg(role, e.target.value);
                navigate(`/kopru/${role}`);
              }}
              className="rounded-lg border border-white/15 bg-slate-800 px-2 py-1 text-xs font-semibold text-white outline-none [color-scheme:dark]"
              aria-label="Kurum"
            >
              {orgsOfType(ROLE_ORG_TYPE[role]).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.tto ?? o.short} · {o.city}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={() => {
            k.reset();
            toast({ title: 'Senaryo sıfırlandı', tone: 'info' });
            navigate(`/kopru/${role}`);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Sıfırla
        </button>
      </div>
    </div>
  );
}

export default function KopruShell() {
  const { role: param } = useParams();
  const k = useKopru();
  const role = isRole(param) ? param : null;

  useEffect(() => {
    if (role && role !== k.role) k.setRole(role);
  }, [role, k]);

  if (!role) return <Navigate to="/kopru" replace />;

  const persona = personaOf(role, k.state.orgSel);
  const myUni = k.state.orgSel.tto;
  const counts = {
    pool: k.state.needs.filter((n) => n.status === 'yeni' && n.ttoIds.includes(myUni)).length,
    invites: k.state.needs.filter((n) => n.invites.some((i) => i.solverId === PERSONAS.akademisyen.academicId && i.status === 'bekliyor')).length,
    approvals: k.state.academics.filter((a) => !a.approved && a.orgId === myUni).length,
  };
  const nav = navFor(role, counts);
  const org = persona.orgId ? orgOf(persona.orgId) : null;
  const orgName = role === 'platform' ? 'TeknoOrtak ağı' : role === 'tto' ? org!.tto! : role === 'akademisyen' ? org!.name : org!.short;
  const brand: [string, string] = !org ? ['#FF7A33', '#E05300'] : org.type === 'osb' ? ['#475569', '#0F172A'] : org.type === 'teknokent' ? ['#FF7A33', '#E05300'] : ['#2563EB', '#1E3A8A'];

  return (
    <Shell
      nav={nav}
      mobile={nav.slice(0, 4)}
      fullBleedPrefix="/kopru/__none__/"
      profile={{
        name: orgName,
        subtitle: org ? `${ROLE_LABEL[role]} · ${org.city}` : ROLE_LABEL[role],
        logo: <Avatar name={orgName} brand={brand} size={36} square />,
        href: `/kopru/${role}`,
      }}
      user={{ name: persona.name, title: persona.title }}
      banner={<RoleBar role={role} />}
      footer={
        <Link to="/kopru" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-900">
          <LogOut className="h-3.5 w-3.5" /> Senaryo başlangıcı
        </Link>
      }
    />
  );
}
