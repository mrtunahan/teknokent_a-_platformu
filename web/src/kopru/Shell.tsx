import { BarChart3, CalendarDays, ClipboardList, FlaskConical, FolderKanban, GraduationCap, HandCoins, Inbox, LayoutDashboard, Lightbulb, LogOut, MessagesSquare, Network, PlusCircle, Search, Users, UserCheck, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Shell, type NavItem } from '@/components/layout/AppShell';
import { PERSONAS, ROLE_LABEL, orgOf, type Role } from './data';
import { personaOf, useKopru } from './store';
import { Avatar } from './ui';

import { RoleBar, isRole } from './RoleBar';

// Geriye uyumluluk: rol çubuğu ve rol yardımcıları artık ./RoleBar içinde
export { RoleBar, ROLES, isRole, isOrgRole } from './RoleBar';

function navFor(role: Role, counts: { pool: number; invites: number; approvals: number; tfirmaInvites: number }): NavItem[] {
  const b = `/kopru/${role}`;
  switch (role) {
    case 'firma':
      return [
        { to: b, label: 'Genel bakış', short: 'Bakış', icon: LayoutDashboard, end: true },
        { to: `${b}/ihtiyaclar`, label: 'İhtiyaçlarım', short: 'İhtiyaçlar', icon: ClipboardList },
        { to: `${b}/ihtiyaclar/yeni`, label: 'İhtiyaç bildir', short: 'Bildir', icon: PlusCircle },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: Search },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/toplantilar`, label: 'Toplantılar', icon: CalendarDays },
        { to: `${b}/laboratuvar`, label: 'Analiz talepleri', short: 'Analiz', icon: FlaskConical },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
      ];
    case 'tfirma':
      return [
        { to: b, label: 'Genel bakış', short: 'Bakış', icon: LayoutDashboard, end: true },
        { to: `${b}/ihtiyaclar`, label: 'Sanayi davetleri', short: 'Davetler', icon: Inbox, badge: counts.tfirmaInvites },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: '/demo/discover', label: 'Firma ağı · keşfet', short: 'Keşfet', icon: Users },
        { to: '/demo/messages', label: 'Firma ağı · mesajlar', short: 'Mesajlar', icon: MessagesSquare },
        { to: `${b}/toplantilar`, label: 'Toplantılar', icon: CalendarDays },
        { to: `${b}/laboratuvar`, label: 'Analiz talepleri', short: 'Analiz', icon: FlaskConical },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
      ];
    case 'akademisyen':
      return [
        { to: b, label: 'Davetler & fırsatlar', short: 'Davetler', icon: Inbox, badge: counts.invites, end: true },
        { to: `${b}/projeler`, label: 'Projelerim', short: 'Projeler', icon: FolderKanban },
        { to: `${b}/toplantilar`, label: 'Toplantılar', icon: CalendarDays },
        { to: `${b}/laboratuvar`, label: 'Laboratuvarım', short: 'Lab', icon: FlaskConical },
        { to: `${b}/fikri-mulkiyet`, label: 'Buluş bildirimlerim', short: 'Buluş', icon: Lightbulb },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
        { to: `${b}/profil`, label: 'Uzmanlık profilim', short: 'Profil', icon: UserRound },
      ];
    case 'tto':
      return [
        { to: b, label: 'İhtiyaç havuzu', short: 'Havuz', icon: Inbox, badge: counts.pool, end: true },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: GraduationCap },
        { to: `${b}/toplantilar`, label: 'Toplantılar', icon: CalendarDays },
        { to: `${b}/laboratuvar`, label: 'Laboratuvar talepleri', short: 'Lab', icon: FlaskConical },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
        { to: `${b}/fikri-mulkiyet`, label: 'Fikri mülkiyet', short: 'FSMH', icon: Lightbulb },
        { to: `${b}/onaylar`, label: 'Akademisyen onayları', short: 'Onaylar', icon: UserCheck, badge: counts.approvals },
        { to: `${b}/rapor`, label: 'Etki raporu', short: 'Rapor', icon: BarChart3 },
      ];
    case 'osb':
    case 'teknokent':
      return [
        { to: b, label: 'Kurum paneli', short: 'Panel', icon: BarChart3, end: true },
        { to: `${b}/ihtiyaclar`, label: role === 'osb' ? 'Bölge ihtiyaçları' : 'Firmalarımızın katkısı', short: 'Liste', icon: ClipboardList },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
      ];
    case 'platform':
      return [
        { to: b, label: 'Kurum ağı', short: 'Ağ', icon: Network, end: true },
        { to: `${b}/rapor`, label: 'Etki raporu', short: 'Rapor', icon: BarChart3 },
        { to: `${b}/ihtiyaclar`, label: 'Tüm ihtiyaçlar', short: 'İhtiyaçlar', icon: ClipboardList },
        { to: `${b}/projeler`, label: 'Projeler', icon: FolderKanban },
        { to: `${b}/uzmanlar`, label: 'Uzman & laboratuvar', short: 'Uzmanlar', icon: GraduationCap },
        { to: `${b}/laboratuvar`, label: 'Laboratuvar talepleri', short: 'Lab', icon: FlaskConical },
        { to: `${b}/destek`, label: 'Destek programları', short: 'Destek', icon: HandCoins },
        { to: `${b}/fikri-mulkiyet`, label: 'Fikri mülkiyet', short: 'FSMH', icon: Lightbulb },
      ];
  }
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
    tfirmaInvites: k.state.needs.filter((n) => n.invites.some((i) => i.solverId === PERSONAS.tfirma.firmId && i.status === 'bekliyor')).length,
  };
  const nav = navFor(role, counts);
  const org = persona.orgId ? orgOf(persona.orgId) : null;
  const orgName = role === 'platform' ? 'TeknoOrtak ağı' : role === 'tto' ? org!.tto! : role === 'akademisyen' ? org!.name : role === 'tfirma' ? 'Orion Yazılım' : org!.short;
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
      notificationsHref={`/kopru/${role}/bildirimler`}
      notificationsBadge={k.role === role ? k.inbox.unread : 0}
      banner={<RoleBar role={role} />}
      footer={
        <Link to="/kopru" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-900">
          <LogOut className="h-3.5 w-3.5" /> Senaryo başlangıcı
        </Link>
      }
    />
  );
}
