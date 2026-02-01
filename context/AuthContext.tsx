import {
  createUser,
  getCurrentUser,
  signIn,
  signOut,
  UserData,
} from "@/lib/services/authService";
import {createContext, useContext, useEffect, useState} from "react";

export interface User extends UserData {
  accountId: string;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<{success: boolean}>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    businessName: string,
  ) => Promise<{success: boolean}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthUser();
  }, []);

  const checkAuthUser = async () => {
    try {
      setIsLoading(true);
      const result = await getCurrentUser();
      if (result && result.userData) {
        setUser({
          $id: result.userData.$id,
          name: result.userData.name,
          email: result.userData.email,
          businessName: result.userData.businessName,
          accountId: result.userData.accountId,
          isNotifEnabled: result.userData.isNotifEnabled,
          $createdAt: result.userData.$createdAt,
          $updatedAt: result.userData.$updatedAt,
        });
      }
    } catch (error) {
      console.error("No authenticated user");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const session = await signIn(email, password);
    if (session) {
      const result = await getCurrentUser();
      if (result && result.userData) {
        setUser({
          $id: result.userData.$id,
          name: result.userData.name,
          email: result.userData.email,
          businessName: result.userData.businessName,
          accountId: result.userData.accountId,
          isNotifEnabled: result.userData.isNotifEnabled,
          $createdAt: result.userData.$createdAt,
          $updatedAt: result.userData.$updatedAt,
        });

        return {success: true};
      }
    }

    return {success: false};
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut();
      setUser(null);
      setIsLoading(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    businessName: string,
  ) => {
    try {
      const userData = await createUser(email, password, name, businessName);

      // Sign in the user
      const newSession = await signIn(email, password);

      if (newSession && userData) {
        setUser({
          $id: userData.$id,
          name,
          email,
          businessName,
          isNotifEnabled: false,
          accountId: userData.accountId,
          $createdAt: userData.$createdAt,
          $updatedAt: userData.$updatedAt,
        });
        return {success: true};
      }
      return {success: false};
    } catch (error) {
      // Re-throw the error so it can be caught in the component
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        setIsLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
