"use server";

import { currentUser } from "@clerk/nextjs/server";
import { getValidToken } from "@/lib/google";
import { sendEmail as libSendEmail } from "@/lib/google";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendGeneralEmail({ to, subject, body }: SendEmailParams) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const token = await getValidToken(user.id, userEmail);

    if (!token) {
      throw new Error("Google account not connected or token expired");
    }

    await libSendEmail({
      accessToken: token,
      to,
      subject,
      body,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
