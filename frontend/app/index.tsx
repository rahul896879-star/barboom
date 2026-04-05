import { useMemo, useState } from "react";

import { AdminDashboardScreen } from "../src/screens/AdminDashboardScreen";
import { LoginScreen } from "../src/screens/LoginScreen";
import { SalesmanModuleScreen } from "../src/screens/SalesmanModuleScreen";
import { StaffModuleScreen } from "../src/screens/StaffModuleScreen";
import type { LoginResponse } from "../src/types";

export default function Index() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [authError, setAuthError] = useState("");

  const screen = useMemo(() => {
    if (!session) {
      return (
        <LoginScreen
          errorMessage={authError}
          onLoginSuccess={(nextSession) => {
            setAuthError("");
            setSession(nextSession);
          }}
          onLoginError={setAuthError}
        />
      );
    }

    const commonProps = { session, onSignOut: () => setSession(null) };
    if (session.user.role === "admin") {
      return <AdminDashboardScreen {...commonProps} />;
    }
    if (session.user.role === "staff") {
      return <StaffModuleScreen {...commonProps} />;
    }
    return <SalesmanModuleScreen {...commonProps} />;
  }, [authError, session]);

  return screen;
}
