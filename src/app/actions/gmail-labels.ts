"use server";

import directus from "@/lib/directus";
import { readItems, updateItem, createItem, readItem } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { getGmailClient, getValidToken } from "@/lib/google";

/**
 * Ensures a CRM label exists in Gmail as "CRM/[LabelName]"
 * Returns the Gmail Label ID
 */
export async function ensureGmailLabel(tagName: string, userId: string, userEmail: string) {
    const token = await getValidToken(userId, userEmail);
    if (!token) return null;

    const gmail = await getGmailClient(token);
    const labelName = tagName;

    try {
        // 1. Check if we already have it in DB
        const existingLabels = await directus.request(readItems("contact_labels", {
            filter: { 
                _and: [
                    { name: { _eq: tagName } },
                    { user_email: { _eq: userEmail.toLowerCase() } }
                ]
            },
            limit: 1
        })) as any[];

        if (existingLabels.length > 0 && existingLabels[0].gmail_label_id) {
            return existingLabels[0].gmail_label_id;
        }

        // 2. Check if it exists in Gmail
        const list = await gmail.users.labels.list({ userId: "me" });
        const gLabel = list.data.labels?.find(l => l.name?.toLowerCase() === labelName.toLowerCase());

        if (gLabel) {
            if (existingLabels.length > 0) {
                await directus.request(updateItem("contact_labels", existingLabels[0].id, { gmail_label_id: gLabel.id }));
            } else {
                await directus.request(createItem("contact_labels", {
                    name: tagName,
                    user_email: userEmail.toLowerCase(),
                    gmail_label_id: gLabel.id,
                    color: "#8e63ce"
                }));
            }
            return gLabel.id;
        }

        // 3. Create in Gmail
        const created = await gmail.users.labels.create({
            userId: "me",
            requestBody: {
                name: labelName,
                labelListVisibility: "labelShow",
                messageListVisibility: "show",
            }
        });

        const newLabelId = created.data.id;

        if (existingLabels.length > 0) {
            await directus.request(updateItem("contact_labels", existingLabels[0].id, { gmail_label_id: newLabelId }));
        } else {
            await directus.request(createItem("contact_labels", {
                name: tagName,
                user_email: userEmail.toLowerCase(),
                gmail_label_id: newLabelId,
                color: "#8e63ce"
            }));
        }

        return newLabelId;
    } catch (err) {
        console.error(`[ensureGmailLabel] Failed for ${tagName}:`, err);
        return null;
    }
}

/**
 * Syncs CRM tags to Gmail labels for a specific message
 */
export async function syncMessageTagsToGmail(messageId: string, tags: string[]) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };
        const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();

        const token = await getValidToken(user.id, userEmail);
        if (!token) return { success: false, error: "No token" };

        const gmail = await getGmailClient(token);

        // Get Gmail label IDs for all tags
        const labelIds = await Promise.all(
            tags.map(tag => ensureGmailLabel(tag, user.id, userEmail))
        );

        const validLabelIds = labelIds.filter(id => !!id) as string[];

        if (validLabelIds.length > 0) {
            await gmail.users.messages.modify({
                userId: "me",
                id: messageId,
                requestBody: {
                    addLabelIds: validLabelIds
                }
            });
        }

        return { success: true };
    } catch (err: any) {
        console.error("[syncMessageTagsToGmail] Failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Creates a new label in Gmail
 */
export async function createGmailLabel(name: string, color?: string) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };
        const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();

        const token = await getValidToken(user.id, userEmail);
        if (!token) return { success: false, error: "No token" };

        const gmail = await getGmailClient(token);

        const requestBody: any = {
            name: name,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
        };

        if (color) {
            requestBody.color = {
                backgroundColor: color,
                textColor: "#ffffff"
            };
        }

        const res = await gmail.users.labels.create({
            userId: "me",
            requestBody
        });

        return { success: true, data: res.data };
    } catch (err: any) {
        console.error("[createGmailLabel] Failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Deletes a label from Gmail
 */
export async function deleteGmailLabel(labelName: string) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };
        const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();

        const token = await getValidToken(user.id, userEmail);
        if (!token) return { success: false, error: "No token" };

        const gmail = await getGmailClient(token);

        // We need to find the ID by name first
        const list = await gmail.users.labels.list({ userId: "me" });
        const label = list.data.labels?.find(l => l.name === labelName);

        if (!label || !label.id) {
            return { success: false, error: "Label not found" };
        }

        await gmail.users.labels.delete({
            userId: "me",
            id: label.id
        });

        return { success: true };
    } catch (err: any) {
        console.error("[deleteGmailLabel] Failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Renames a label in Gmail
 */
export async function renameGmailLabel(oldName: string, newName: string) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };
        const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();

        const token = await getValidToken(user.id, userEmail);
        if (!token) return { success: false, error: "No token" };

        const gmail = await getGmailClient(token);

        // Find ID by name
        const list = await gmail.users.labels.list({ userId: "me" });
        const label = list.data.labels?.find(l => l.name === oldName);

        if (!label || !label.id) {
            return { success: false, error: "Label not found" };
        }

        await gmail.users.labels.patch({
            userId: "me",
            id: label.id,
            requestBody: {
                name: newName
            }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[renameGmailLabel] Failed:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Updates a label color in Gmail
 */
export async function updateGmailLabelColor(labelName: string, color: string) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };
        const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();

        const token = await getValidToken(user.id, userEmail);
        if (!token) return { success: false, error: "No token" };

        const gmail = await getGmailClient(token);

        // Find ID by name
        const list = await gmail.users.labels.list({ userId: "me" });
        const label = list.data.labels?.find(l => l.name === labelName);

        if (!label || !label.id) {
            return { success: false, error: "Label not found" };
        }

        await gmail.users.labels.patch({
            userId: "me",
            id: label.id,
            requestBody: {
                color: {
                    backgroundColor: color,
                    textColor: "#ffffff"
                }
            }
        });

        return { success: true };
    } catch (err: any) {
        console.error("[updateGmailLabelColor] Failed:", err);
        return { success: false, error: err.message };
    }
}
