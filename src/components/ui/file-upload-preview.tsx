"use client";

import { useEffect, useState } from "react";
import { Camera, FileImage, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

type FileUploadPreviewProps = {
  name: string;
  accept?: string;
  capture?: boolean | "user" | "environment";
  required?: boolean;
  hint?: string;
};

export function FileUploadPreview({
  name,
  accept = "image/*",
  capture,
  required,
  hint,
}: FileUploadPreviewProps) {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="grid gap-2">
      <div className="grid gap-3 rounded-md border border-dashed border-border bg-surface-muted p-3">
        {previewUrl ? (
          <div
            className="aspect-[4/3] rounded-md bg-cover bg-center"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-md bg-surface text-muted">
            <FileImage className="h-8 w-8" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {fileName || "ยังไม่ได้เลือกรูป"}
            </p>
            {hint ? <p className="text-xs text-muted">{hint}</p> : null}
          </div>
          {fileName ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 px-3 py-1 text-xs"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setFileName("");
                setInputKey((value) => value + 1);
              }}
            >
              <X className="h-3.5 w-3.5" />
              ล้าง
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        key={inputKey}
        name={name}
        type="file"
        accept={accept}
        capture={capture}
        required={required}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (previewUrl) URL.revokeObjectURL(previewUrl);

          if (!file) {
            setPreviewUrl(null);
            setFileName("");
            return;
          }

          setFileName(file.name);
          setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
        }}
      />
      <p className="flex items-center gap-1 text-xs text-muted">
        <Camera className="h-3.5 w-3.5" />
        บนมือถือสามารถถ่ายรูปใหม่หรือเลือกรูปจากเครื่องได้
      </p>
    </div>
  );
}
