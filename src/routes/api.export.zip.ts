import { createFileRoute } from "@tanstack/react-router";
import { collectProjectFiles, createProjectZip } from "@/lib/export/project";

export const Route = createFileRoute("/api/export/zip")({
  server: {
    handlers: {
      GET: async () => {
        const root = process.cwd();
        const files = await collectProjectFiles(root);
        const zip = createProjectZip(files);
        return new Response(Buffer.from(zip), {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="project-export.zip"',
          },
        });
      },
    },
  },
});
