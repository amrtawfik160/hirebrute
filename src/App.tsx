import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout"
import { ApplicationsPage } from "@/pages/applications"
import { ApplyPage } from "@/pages/apply"
import { DashboardPage } from "@/pages/dashboard"
import { ExpandPage } from "@/pages/expand"
import { HistoryPage } from "@/pages/history"
import { InterviewPage } from "@/pages/interview"
import { JobsPage } from "@/pages/jobs"
import { PortalsPage } from "@/pages/portals"
import { ProfilePage } from "@/pages/profile"
import { RankPage } from "@/pages/rank"
import { SettingsPage } from "@/pages/settings"
import { SyncPage } from "@/pages/sync"
import { UpskillPage } from "@/pages/upskill"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="rank" element={<RankPage />} />
          <Route path="apply" element={<ApplyPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="interview" element={<InterviewPage />} />
          <Route path="upskill" element={<UpskillPage />} />
          <Route path="expand" element={<ExpandPage />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="portals" element={<PortalsPage />} />
          <Route path="templates" element={<Navigate to="/portals" replace />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
