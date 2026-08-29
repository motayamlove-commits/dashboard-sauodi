import { describe, expect, it } from "vitest";
import { getFirebaseConfig } from "./firebase-config";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

describe("Firebase environment configuration", () => {
  it("uses the configured project and accepts its Firebase API key", async () => {
    const firebaseConfig = getFirebaseConfig();

    expect(projectId).toBe("bcare-app-new");
    expect(apiKey).toBeTruthy();
    expect(firebaseConfig).toMatchObject({
      projectId: "bcare-app-new",
      authDomain: "bcare-app-new.firebaseapp.com",
      storageBucket: "bcare-app-new.firebasestorage.app",
    });

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/pays?pageSize=1&key=${apiKey}`,
    );
    const payload = (await response.json()) as {
      error?: { status?: string; message?: string };
    };
    const errorText = `${payload.error?.status ?? ""} ${payload.error?.message ?? ""}`;

    expect(errorText).not.toMatch(/API_KEY_INVALID|API key not valid/i);
    expect(errorText).not.toMatch(/PROJECT_NOT_FOUND/i);
    expect(errorText).not.toMatch(/SERVICE_DISABLED/i);
  });
});
