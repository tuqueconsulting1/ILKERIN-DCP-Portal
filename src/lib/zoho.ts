const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN ?? "accounts.zoho.com";
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN ?? "https://www.zohoapis.com";

async function getAccessToken(): Promise<string> {
  const res = await fetch(`https://${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

async function zohoApi(path: string, init: RequestInit) {
  const accessToken = await getAccessToken();
  const res = await fetch(`${ZOHO_API_DOMAIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      ...init.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(`Zoho API error (${path}): ${JSON.stringify(data)}`);
  }

  return data;
}

export type ClientWorkdriveFolder = {
  folderId: string;
  permalink: string;
  shareLink: string;
};

/**
 * Creates a subfolder for a new client under ZOHO_CLIENTS_PARENT_FOLDER_ID,
 * then generates an upload-permission external share link for it.
 */
export async function createClientWorkdriveFolder(
  companyName: string,
): Promise<ClientWorkdriveFolder> {
  const parentId = process.env.ZOHO_CLIENTS_PARENT_FOLDER_ID;
  if (!parentId) {
    throw new Error("ZOHO_CLIENTS_PARENT_FOLDER_ID is not configured");
  }

  const folderRes = await zohoApi("/workdrive/api/v1/files", {
    method: "POST",
    body: JSON.stringify({
      data: { attributes: { name: companyName, parent_id: parentId }, type: "files" },
    }),
  });

  const folderId = folderRes.data.id as string;
  const permalink = folderRes.data.attributes.permalink as string;

  const linkRes = await zohoApi("/workdrive/api/v1/links", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          resource_id: folderId,
          link_name: `${companyName} upload link`,
          request_user_data: false,
          allow_download: true,
          role_id: "7", // 7 = view + upload
        },
        type: "links",
      },
    }),
  });

  const shareLink = linkRes.data.attributes.link as string;

  return { folderId, permalink, shareLink };
}

/** Creates a plain subfolder under an existing WorkDrive folder. */
export async function createSubfolder(parentFolderId: string, name: string): Promise<string> {
  const res = await zohoApi("/workdrive/api/v1/files", {
    method: "POST",
    body: JSON.stringify({
      data: { attributes: { name, parent_id: parentFolderId }, type: "files" },
    }),
  });

  return res.data.id as string;
}

export type StageSubfolders = {
  stage1: string;
  stage2: string;
  stage3: string;
};

const STAGE_SUBFOLDER_NAMES: Record<keyof StageSubfolders, string> = {
  stage1: "Stage 1 - Approval of Name",
  stage2: "Stage 2 - Application for Licence",
  stage3: "Stage 3 - Data Submission & Licensing",
};

/**
 * Creates the three stage subfolders inside a client's WorkDrive folder, so
 * documents can be organized by stage instead of dropped flat into one
 * folder. Best-effort per subfolder — a failure on one stage doesn't stop
 * the others from being created.
 */
export async function createStageSubfolders(parentFolderId: string): Promise<Partial<StageSubfolders>> {
  const result: Partial<StageSubfolders> = {};

  for (const key of Object.keys(STAGE_SUBFOLDER_NAMES) as Array<keyof StageSubfolders>) {
    try {
      result[key] = await createSubfolder(parentFolderId, STAGE_SUBFOLDER_NAMES[key]);
    } catch {
      // Leave this stage's folder id unset; the case manager can create it
      // manually later if needed. Not fatal to the rest.
    }
  }

  return result;
}

export type WorkdriveFile = {
  id: string;
  name: string;
  url: string;
  uploadedTime: string | null;
};

/**
 * Lists the direct children of a WorkDrive folder, filtering out subfolders
 * — clients are expected to drop files directly into their folder, not
 * create their own subfolder structure.
 */
export async function listFolderFiles(folderId: string): Promise<WorkdriveFile[]> {
  const res = await zohoApi(`/workdrive/api/v1/files/${folderId}/files`, { method: "GET" });

  return (res.data as Array<Record<string, unknown>>)
    .filter((item) => {
      const attrs = item.attributes as Record<string, unknown>;
      return attrs.type !== "folder";
    })
    .map((item) => {
      const attrs = item.attributes as Record<string, unknown>;
      const uploadedMillis = attrs.uploaded_time_in_millisecond ?? attrs.created_time_in_millisecond;

      return {
        id: item.id as string,
        name: attrs.name as string,
        url: (attrs.permalink as string) ?? (attrs.download_url as string) ?? "",
        uploadedTime: uploadedMillis ? new Date(Number(uploadedMillis)).toISOString() : null,
      };
    });
}

/**
 * Extracts a WorkDrive folder ID from a folder link of the form
 * https://workdrive.zoho.com/folder/{id}. Returns null for any other link
 * shape (e.g. an external share link), since only the internal folder link
 * format is guaranteed to embed the raw folder ID.
 */
export function extractFolderIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/folder\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
