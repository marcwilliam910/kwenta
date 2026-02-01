// ReadAlertContext.tsx
import {useAuth} from "@/context/AuthContext";
import NotificationService from "@/lib/services/notificationService";
import {createContext, useContext, useEffect, useState} from "react";

type ReadAlertContextType = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnread: () => Promise<void>;
};

const ReadAlertContext = createContext<ReadAlertContextType | null>(null);

export function ReadAlertProvider({children}: {children: React.ReactNode}) {
  const {user} = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if (!user) return;
    const count = await NotificationService.getUnreadCount(user.$id);
    setUnreadCount(count);
  };

  useEffect(() => {
    fetchUnread();
  }, [user]);

  const contextData: ReadAlertContextType = {
    unreadCount,
    setUnreadCount,
    fetchUnread,
  };

  return (
    <ReadAlertContext.Provider value={contextData}>
      {children}
    </ReadAlertContext.Provider>
  );
}

export function useReadAlert() {
  const context = useContext(ReadAlertContext);
  if (!context) {
    throw new Error("useReadAlert must be used within a ReadAlertProvider");
  }
  return context;
}
