
import { UploadDropzone } from "@uploadthing/react";
import { UploadCloud } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import type { OurFileRouter } from "@/api/uploadthing";

// Default styling for UploadThing components
import "@uploadthing/react/styles.css";

// The proper type-safe way to use UploadThing with TypeScript and React
type UploadDropzoneProps = React.ComponentProps<typeof UploadDropzone> & {
  endpoint: keyof OurFileRouter;
};

// Custom implementations of the UploadThing components
export function UploadThingFileInput({ 
  endpoint,
  onUploadComplete,
  onUploadError,
  className,
  ...props
}: {
  endpoint: keyof OurFileRouter;
  onUploadComplete?: (res: any) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}) {
  const handleClientUploadComplete = useCallback((res: any) => {
    toast.success("Upload completed successfully!");
    if (onUploadComplete) onUploadComplete(res);
  }, [onUploadComplete]);

  const handleUploadError = useCallback((error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
    if (onUploadError) onUploadError(error);
  }, [onUploadError]);

  // Using as any to bypass TypeScript JSX limitations with generics
  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={handleClientUploadComplete}
      onUploadError={handleUploadError}
      className={`ut-button:bg-primary ut-button:hover:bg-primary/90 ut-label:text-primary ${className || ""}`}
      {...props}
    />
  );
}

// This component can be used anywhere in the app to handle file uploads
export function FileUploader({
  endpoint,
  onUploadComplete,
  className,
}: {
  endpoint: keyof OurFileRouter;
  onUploadComplete?: (res: any) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <UploadThingFileInput
        endpoint={endpoint}
        onUploadComplete={onUploadComplete}
        // Pass only props that UploadDropzone actually accepts
        content={{
          allowedContent({ isUploading }) {
            return (
              <div className="flex flex-col items-center gap-2 p-4">
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium">
                    {isUploading ? "Uploading..." : "Drag & drop files here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
              </div>
            );
          },
          draggingContent({ isUploading }) {
            return (
              <div className="flex flex-col items-center gap-2 p-4">
                <UploadCloud className="h-10 w-10 text-primary" />
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium">
                    {isUploading ? "Uploading..." : "Drop files to upload"}
                  </p>
                </div>
              </div>
            );
          },
        }}
      />
    </div>
  );
}
