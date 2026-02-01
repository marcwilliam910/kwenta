import {Query} from "react-native-appwrite";
import {account, appwriteConfig, databases, ID} from "../appwrite";

// User data interface
export interface UserData {
  $id: string;
  name: string;
  email: string;
  businessName: string;
  accountId: string;
  isNotifEnabled: boolean;
  $createdAt: string;
  $updatedAt: string;
}

// Auth functions
export const createUser = async (
  email: string,
  password: string,
  name: string,
  business_name: string,
) => {
  try {
    console.log("Creating account with:", {
      email,
      name,
      passwordLength: password.length,
    });

    // Create account in Appwrite Auth
    const newAccount = await account.create(ID.unique(), email, password, name);

    console.log("Account created:", newAccount.$id);

    if (!newAccount) throw new Error("Failed to create account");

    console.log("Creating user document...");

    // Create user document in database
    const userData = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        name,
        email,
        business_name,
        accountId: newAccount.$id,
        isNotifEnabled: false, // Add this required field
      },
    );

    console.log("User document created:", userData.$id);

    return userData;
  } catch (error: any) {
    console.error("Create user error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    throw error;
  }
};

export const getUserData = async (
  accountId: string,
): Promise<UserData | null> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accountId", accountId)],
    );

    if (response.documents.length > 0) {
      const doc = response.documents[0];
      const userData: UserData = {
        $id: doc.$id,
        name: doc.name,
        email: doc.email,
        businessName: doc.business_name,
        accountId: doc.accountId,
        isNotifEnabled: doc.isNotifEnabled,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
      };
      return userData;
    }
    return null;
  } catch (error) {
    console.error("Get user data error:", error);
    return null;
  }
};

export const signOut = async () => {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    // First check if user is authenticated
    const session = await account.getSession("current");
    if (!session) {
      return null; // User is not logged in
    }

    const currentAccount = await account.get();
    if (currentAccount) {
      const userData = await getUserData(currentAccount.$id);
      return {account: currentAccount, userData};
    }
    return null;
  } catch (error: any) {
    // Handle specific authentication errors
    if (error.code === 401 || error.type === "general_unauthorized_scope") {
      return null; // User not authenticated
    }
    console.error("Get current user error:", error);
    return null;
  }
};
