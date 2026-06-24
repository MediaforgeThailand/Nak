"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, FileImage, Images, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FileUploadPreviewProps = {
  name: string;
  accept?: string;
  capture?: boolean | "user" | "environment";
  required?: boolean;
  hint?: string;
};

// Downscale + re-encode camera photos so uploads stay well under the Server
// Action body limit (and Vercel's ~4.5MB request cap). Non-images pass through.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function FileUploadPreview({
  name,
  accept = "image/*",
  capture,
  required,
  hint,
}: FileUploadPreviewProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName("");
    setInputKey((value) => value + 1);
  }

  // Open the OS picker, choosing camera vs file/gallery per the button pressed.
  // `capture` is toggled on the fly so the same input serves both modes.
  function openPicker(useCamera: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (useCamera) {
      input.setAttribute("capture", typeof capture === "string" ? capture : "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const original = event.currentTarget.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!original) {
      setPreviewUrl(null);
      setFileName("");
      return;
    }

    setProcessing(true);
    const file = await compressImage(original);

    // Put the (possibly compressed) file back so the form submits it.
    if (inputRef.current && file !== original) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }

    setFileName(file.name);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setProcessing(false);
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-3 rounded-[var(--r-sm)] border border-dashed border-[var(--line)] bg-[var(--surface)] p-3">
        {previewUrl ? (
          <div
            className="h-48 rounded-[var(--r-sm)] bg-cover bg-center sm:h-56"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          />
        ) : (
          <div className="grid h-48 place-items-center rounded-[var(--r-sm)] bg-[var(--chip)] text-muted sm:h-56">
            {processing ? <Loader2 className="h-8 w-8 animate-spin" /> : <FileImage className="h-8 w-8" />}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {processing ? "กำลังเตรียมรูป..." : fileName || "ยังไม่ได้เลือกไฟล์"}
            </p>
            {hint ? <p className="text-xs text-muted">{hint}</p> : null}
          </div>
          {fileName && !processing ? (
            <Button type="button" variant="secondary" className="min-h-9 px-3 py-1 text-xs" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" />
              ล้าง
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {capture ? (
            <button
              type="button"
              onClick={() => openPicker(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--p)]"
            >
              <Camera className="h-4 w-4" />
              ถ่ายรูป
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openPicker(false)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--p)]"
          >
            <Images className="h-4 w-4" />
            เลือกไฟล์
          </button>
        </div>
      </div>
      <input
        key={inputKey}
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={handleChange}
      />
      <p className="flex items-center gap-1 text-xs text-muted">
        <Camera className="h-3.5 w-3.5" />
        บนมือถือถ่ายรูปใหม่หรือเลือกจากเครื่องได้ · ระบบย่อขนาดรูปให้อัตโนมัติ
      </p>
    </div>
  );
}
