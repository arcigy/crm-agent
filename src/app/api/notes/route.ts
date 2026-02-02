import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem, readItems, updateItem, deleteItem, readItem } from "@directus/sdk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore
    const notes = await directus.request(
      readItems("crm_notes", {
        filter: { user_email: { _eq: userEmail } },
        sort: ["-date_created"],
      }),
    );

    return NextResponse.json(notes);
  } catch (error: any) {
    return NextResponse.json(
      { error: getDirectusErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, content, contact_id, project_id, task_id, file_link } =
      await req.json();

    // @ts-ignore
    const res = await directus.request(
      createItem("crm_notes", {
        title,
        content,
        user_email: userEmail,
        contact_id: contact_id || null,
        project_id: project_id || null,
        task_id: task_id || null,
        file_link: file_link || null,
      }),
    );

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: getDirectusErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, title, content, contact_id, project_id, task_id, file_link } =
      await req.json();

    // Ownership check
    const current = (await directus.request(readItem("crm_notes", id))) as any;
    if (current.user_email !== userEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // @ts-ignore
    const res = await directus.request(
      updateItem("crm_notes", id, {
        title,
        content,
        contact_id: contact_id === undefined ? undefined : contact_id,
        project_id: project_id === undefined ? undefined : project_id,
        task_id: task_id === undefined ? undefined : task_id,
        file_link: file_link === undefined ? undefined : file_link,
      }),
    );

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: getDirectusErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    if (!userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID" }, { status: 400 });

    // Ownership check
    const current = (await directus.request(readItem("crm_notes", id))) as any;
    if (current.user_email !== userEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // @ts-ignore
    await directus.request(deleteItem("crm_notes", id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: getDirectusErrorMessage(error) },
      { status: 500 },
    );
  }
}
