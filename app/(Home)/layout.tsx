import { SessionProvider } from "next-auth/react";

export default function HomePage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <div className="flex flex-col h-screen"> 
            <div>Navbar for profile menu</div>
            <SessionProvider>
              <div className="flex-1"> 
                {children}
              </div>
            </SessionProvider>
        </div>
  );
}
