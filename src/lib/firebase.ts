import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const hasFirebaseConfig =
  !!config.apiKey && !!config.projectId && !!config.appId;

function createFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig) {
    throw new Error("Firebase client configuration is not fully set");
  }

  if (getApps().length) {
    return getApp();
  }

  return initializeApp(config);
}

export const app: FirebaseApp = hasFirebaseConfig
  ? createFirebaseApp()
  : (null as unknown as FirebaseApp);

export const auth: Auth = hasFirebaseConfig
  ? getAuth(app)
  : (null as unknown as Auth);
