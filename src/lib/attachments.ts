// Shared between the client form (fast feedback) and the server action
// (the actual enforcement boundary) so both agree on the same limit.
export const MAX_ATTACHMENT_MB = 8;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
