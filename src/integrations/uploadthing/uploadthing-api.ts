
// This file simulates the server-side component needed for a full UploadThing integration
// In a real deployment, this would be a server-side API route

import { createRouteHandler } from "uploadthing/server";
import { ourFileRouter } from "./uploadthing";

// Export handler to be used in serverless functions
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    uploadthingId: process.env.UPLOADTHING_APP_ID,
    uploadthingSecret: process.env.UPLOADTHING_SECRET,
  },
});
