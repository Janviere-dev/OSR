import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, FileImage } from 'lucide-react';

interface DocumentUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  maxSizeMB?: number;
}

export function DocumentUpload({
  files,
  onFilesChange,
  accept = '.pdf,.jpg,.jpeg,.png,.docx',
  multiple = true,
  label = 'Upload Documents',
  hint = 'Supported: PDF, Images, DOCX',
  maxSizeMB = 10,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter(f => f.size <= maxSizeMB * 1024 * 1024);
    onFilesChange(multiple ? [...files, ...newFiles] : newFiles);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return <FileImage className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
  };

  const getFileLabel = (name: string) => {
    const ext = name.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      
      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto text-primary/60 mb-2" />
        <p className="text-sm font-medium text-primary">Click To Upload</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Uploaded Documents</p>
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-8 rounded bg-background flex items-center justify-center border text-[10px] font-bold text-primary">
                  {getFileLabel(file.name)}
                </div>
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(i)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
