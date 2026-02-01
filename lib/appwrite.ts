import {Account, Client, Databases, ID} from "react-native-appwrite";

// Initialize the Appwrite client
const client = new Client();

client
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT as string) // Replace with your Appwrite endpoint
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID as string)
  .setPlatform("com.marc.grow"); // Replace with your project ID

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);

// Export the client and ID helper
export {client, ID};

// Configuration constants
export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT as string,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID as string,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID as string,
  usersCollectionId: "users",
  ingredientsCollectionId: "ingredients",
  recipesCollectionId: "recipes",
};
