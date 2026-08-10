import Sidebar from "@/components/ui/Sidebar";
import AdminTopbar from "@/components/ui/AdminTopbar";

export default function RootLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background text-ink">
      <Sidebar />
      <div className="min-h-screen min-w-0 flex-1">
        <AdminTopbar />
        {children}
      </div>
    </div>
  );
}
