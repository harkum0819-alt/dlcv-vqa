import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon } from "lucide-react";
import { useCallback } from "react";

export default function ImageUpload({ image, preview, onImage, onClear }) {
  const onDrop = useCallback(
    (files) => {
      if (files[0]) onImage(files[0]);
    },
    [onImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".bmp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
  });

  if (preview) {
    return (
      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <img
          src={preview}
          alt="Uploaded"
          className="w-full h-64 object-contain bg-slate-100 dark:bg-slate-800"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <button
            onClick={onClear}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full
                       bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="badge bg-black/60 text-white">
            <ImageIcon size={10} /> {image?.name?.slice(0, 24)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer
                  transition-all duration-200 select-none
                  ${isDragActive
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
    >
      <input {...getInputProps()} />
      <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-colors
                       ${isDragActive ? "bg-indigo-100 dark:bg-indigo-900" : "bg-slate-100 dark:bg-slate-800"}`}>
        <Upload size={24} className={isDragActive ? "text-indigo-600" : "text-slate-400"} />
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">
        {isDragActive ? "Drop it here!" : "Drag & drop an image"}
      </p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
        or <span className="text-indigo-500 font-medium">click to browse</span>
      </p>
      <p className="text-slate-300 dark:text-slate-600 text-xs mt-3">JPG, PNG, WebP · max 10 MB</p>
    </div>
  );
}
