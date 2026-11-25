import { Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import KopruShell from './Shell';
import Start from './pages/Start';
import NeedForm from './pages/NeedForm';
import NeedDetail from './pages/NeedDetail';
import { Experts, FirmHome, NeedList } from './pages/Lists';
import { ProjectDetail, ProjectList } from './pages/Projects';
import { AcademicHome, AcademicProfile, Approvals, Dashboard, Network, TtoPool } from './pages/Roles';
import { MeetingsPage } from './features/collab';
import { LabsPage } from './features/lab';
import { FundingPage } from './features/funding';
import { IpPage } from './features/ip';
import { NotificationsPage } from './features/notifications';
import { TechFirmHome } from './features/techfirm';

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

export function KopruStart() {
  return <Start />;
}

function Home() {
  const { role } = useParams();
  switch (role) {
    case 'firma':
      return <FirmHome />;
    case 'tfirma':
      return <TechFirmHome />;
    case 'akademisyen':
      return <AcademicHome />;
    case 'tto':
      return <TtoPool />;
    case 'platform':
      return <Network />;
    default:
      return <Dashboard />;
  }
}

/** /kopru/:role/* — tüm roller tek mağazayı (App düzeyindeki KopruProvider) paylaşır */
export function KopruApp() {
  return (
    <Routes>
        <Route element={<KopruShell />}>
          <Route index element={<S><Home /></S>} />
          <Route path="ihtiyaclar" element={<NeedList />} />
          <Route path="ihtiyaclar/yeni" element={<NeedForm />} />
          <Route path="ihtiyaclar/:id" element={<NeedDetail />} />
          <Route path="uzmanlar" element={<Experts />} />
          <Route path="projeler" element={<ProjectList />} />
          <Route path="projeler/:id" element={<ProjectDetail />} />
          <Route path="profil" element={<AcademicProfile />} />
          <Route path="onaylar" element={<Approvals />} />
          <Route path="rapor" element={<Dashboard />} />
          <Route path="toplantilar" element={<MeetingsPage />} />
          <Route path="laboratuvar" element={<LabsPage />} />
          <Route path="destek" element={<FundingPage />} />
          <Route path="fikri-mulkiyet" element={<IpPage />} />
          <Route path="bildirimler" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to=".." replace />} />
        </Route>
    </Routes>
  );
}
