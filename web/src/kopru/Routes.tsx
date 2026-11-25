import { Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import KopruShell from './Shell';
import { KopruProvider } from './store';
import Start from './pages/Start';
import NeedForm from './pages/NeedForm';
import NeedDetail from './pages/NeedDetail';
import { Experts, FirmHome, NeedList } from './pages/Lists';
import { ProjectDetail, ProjectList } from './pages/Projects';
import { AcademicHome, AcademicProfile, Approvals, Dashboard, TtoPool } from './pages/Roles';

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

export function KopruStart() {
  return <Start />;
}

function Home() {
  const { role } = useParams();
  switch (role) {
    case 'firma':
      return <FirmHome />;
    case 'akademisyen':
      return <AcademicHome />;
    case 'tto':
      return <TtoPool />;
    default:
      return <Dashboard />;
  }
}

/** /kopru/:role/* — tüm roller tek mağazayı paylaşır; bir rolde yapılan işlem diğerlerine yansır */
export function KopruApp() {
  return (
    <KopruProvider>
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
          <Route path="*" element={<Navigate to=".." replace />} />
        </Route>
      </Routes>
    </KopruProvider>
  );
}
