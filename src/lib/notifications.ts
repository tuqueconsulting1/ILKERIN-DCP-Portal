import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Logs an in-app notification when a document is marked "received" —
 * either manually or via matching a WorkDrive upload. `notification_log`
 * is generic (see 0001's schema) so other event types can reuse this same
 * table later; this is the first thing to actually write to it.
 */
export async function logDocumentReceivedNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  documentId: string,
  applicationId: string,
) {
  const { data } = await supabase
    .from("documents")
    .select(
      "checklist_template:checklist_templates(item_name), application:applications(client:clients(company_name))",
    )
    .eq("id", documentId)
    .single();

  const template = Array.isArray(data?.checklist_template)
    ? data.checklist_template[0]
    : data?.checklist_template;
  const application = Array.isArray(data?.application) ? data.application[0] : data?.application;
  const client = Array.isArray(application?.client) ? application.client[0] : application?.client;

  const itemName = template?.item_name ?? "A document";
  const companyName = client?.company_name ?? "a client";

  await supabase.from("notification_log").insert({
    recipient: "staff",
    channel: "in_app",
    template: `${itemName} received for ${companyName}`,
    related_application_id: applicationId,
    status: "sent",
    sent_at: new Date().toISOString(),
  });
}
