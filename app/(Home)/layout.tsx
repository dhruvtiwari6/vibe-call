import { SessionProvider } from "next-auth/react";
import ProfileNavbar from "@/components/user/ProfileNavbar";

export default function HomePage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <div className="flex flex-col h-screen"> 
            <ProfileNavbar />
            <SessionProvider>
              <div className="flex-1"> 
                {children}
              </div>
            </SessionProvider>
        </div>
  );
}
