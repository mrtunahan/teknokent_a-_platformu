/**
 * Demo rol çubuğu: köprü kabuğunda (/kopru/:role) ve TeknoOrtak firma ağı kabuğunda (/demo) ortak kullanılır.
 * Döngüsel içe aktarmayı önlemek için bu dosya components/layout/AppShell'i İÇE AKTARMAZ.
 */
import { RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { ROLE_LABEL, ROLE_ORG_TYPE, orgsOfType, type OrgRole, type Role } from './data';
import { useKopru } from './store';

export const ROLES: Role[] = ['firma', 'tfirma', 'akademisyen', 'tto', 'osb', 'teknokent', 'platform'];
export const isRole = (r?: string): r is Role => !!r && (ROLES as string[]).includes(r);
export const isOrgRole = (r: Role): r is OrgRole => r === 'tto' || r === 'osb' || r === 'teknokent';

export function RoleBar({ role }: { role: Role }) {
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
