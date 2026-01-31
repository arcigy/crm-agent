const { google } = require("googleapis");
const fs = require("fs");

async function refreshAndRun() {
  const tokenData = JSON.parse(
    fs.readFileSync(
      "c:/Users/laube/Downloads/Agentic Workflows/token.json",
      "utf8",
    ),
  );

  const auth = new google.auth.OAuth2(
    tokenData.client_id,
    tokenData.client_secret,
  );

  auth.setCredentials({
    refresh_token: tokenData.refresh_token,
  });

  const { token } = await auth.getAccessToken();
  console.log("Token refreshed.");

  // Now we need the project setup logic.
  // Since I can't easily import the TS library into this raw node script without setup,
  // I will implementation a minimal version of setupProjectStructure here.

  const drive = google.drive({ version: "v3", auth });

  async function ensureFolder(name, parentId = null) {
    let q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) q += ` and '${parentId}' in parents`;

    const res = await drive.files.list({ q, fields: "files(id, name)" });
    if (res.data.files && res.data.files.length > 0)
      return res.data.files[0].id;

    const createRes = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : [],
      },
      fields: "id",
    });
    return createRes.data.id;
  }

  console.log("Setting up folders for Project #3: E-shop Redesign 2026");

  const rootId = await ensureFolder("ArciGy CRM Files");
  const yearId = await ensureFolder("2026", rootId);

  const folderName = `003_E-shop_Redesign_2026`;
  const projectId = await drive.files
    .create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [yearId],
        description: "Client: Jan Kováč",
      },
      fields: "id",
    })
    .then((r) => r.data.id);

  // Subfolders
  const f01 = await drive.files
    .create({
      requestBody: {
        name: "01_Zmluvy_a_Faktury",
        mimeType: "application/vnd.google-apps.folder",
        parents: [projectId],
      },
      fields: "id",
    })
    .then((r) => r.data.id);

  await drive.files.create({
    requestBody: {
      name: "Zmluvy",
      mimeType: "application/vnd.google-apps.folder",
      parents: [f01],
    },
  });
  const favkturyId = await drive.files
    .create({
      requestBody: {
        name: "Faktury",
        mimeType: "application/vnd.google-apps.folder",
        parents: [f01],
      },
    })
    .then((r) => r.data.id);

  await drive.files.create({
    requestBody: {
      name: "02_Podklady_od_Klienta",
      mimeType: "application/vnd.google-apps.folder",
      parents: [projectId],
    },
  });
  await drive.files.create({
    requestBody: {
      name: "03_Pracovna_Zlozka",
      mimeType: "application/vnd.google-apps.folder",
      parents: [projectId],
    },
  });
  await drive.files.create({
    requestBody: {
      name: "04_Finalne_Vystupy",
      mimeType: "application/vnd.google-apps.folder",
      parents: [projectId],
    },
  });

  console.log("Drive structure created. Project ID on Drive:", projectId);

  // Now update Directus with this drive_folder_id
  // Project ID is 3
  return { projectId, driveFolderId: projectId };
}

refreshAndRun().catch(console.error);
