import { BarChart3, ClipboardList, FolderKanban, GraduationCap, Inbox, LayoutDashboard, LogOut, PlusCircle, RotateCcw, Search, UserCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shell, type NavItem } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { PERSONAS, ROLE_LABEL, orgOf, type Role } from './data';
import { useKopru } from './store';
import { Avatar } from './ui';

const ROLES: Role[] = ['firma', 'akademisyen', 'tto', 'osb', 'teknokent'];
export const isRole = (r?: string): r is Role => !!r && (ROLES as string[]).includes(r);

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
  }
}

function RoleBar({ role }: { role: Role }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { reset } = useKopru();
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
        <button
          onClick={() => {
            reset();
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

  const persona = PERSONAS[role];
  const academicId = PERSONAS.akademisyen.academicId!;
  const counts = {
    pool: k.state.needs.filter((n) => n.status === 'yeni').length,
    invites: k.state.needs.filter((n) => n.invites.some((i) => i.solverId === academicId && i.status === 'bekliyor')).length,
    approvals: k.state.academics.filter((a) => !a.approved).length,
  };
  const nav = navFor(role, counts);
  const org = orgOf(persona.orgId);
  const orgName = role === 'akademisyen' ? 'Çankırı Karatekin Üniv.' : org.short;

  return (
    <Shell
      nav={nav}
      mobile={nav.slice(0, 4)}
      fullBleedPrefix="/kopru/__none__/"
      profile={{
        name: orgName,
        subtitle: ROLE_LABEL[role],
        logo: <Avatar name={orgName} brand={org.type === 'osb' ? ['#475569', '#0F172A'] : org.type === 'teknokent' ? ['#FF7A33', '#E05300'] : ['#2563EB', '#1E3A8A']} size={36} square />,
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
